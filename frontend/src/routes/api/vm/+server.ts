// src/routes/api/vm/+server.ts
// API endpoint for VM management operations.

import { json } from '@sveltejs/kit';
import { google } from 'googleapis';
import { PROJECT_ID, VM_INSTANCE, VM_ZONE } from '$config';
import { FIREBASE_SERVICE_ACCOUNT } from '$env/static/private';
import { parseServiceAccount } from '$lib/server/firebase';
import { getServerStatus, setServerStatus, recordPlayersOnline } from '$lib/server/firestore';
import { runBackup } from '$lib/server/backup';
import { gracefulStopMc } from '$lib/server/graceful-stop';
import { rconCommand } from '$lib/server/rcon';
import { logger } from '$logger';
import { parsePlayerList, toMs } from '$shared/utils';
import type { RequestHandler } from './$types';

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

// ── GCE Compute Auth ─────────────────────────────────────────────────────────
// Uses the Firebase Admin SA for Compute API calls (works on Cloud Run and local).
// The default compute SA likely doesn't have Compute Instance Admin permissions.

async function getComputeClient(): Promise<OAuth2Client> {
  const scopes = ['https://www.googleapis.com/auth/cloud-platform'];

  const sa = parseServiceAccount(FIREBASE_SERVICE_ACCOUNT) as Record<string, string | undefined>;
  return new google.auth.JWT({
    email: sa.client_email ?? '',
    key: sa.private_key ?? '',
    scopes,
  });
}

const compute = google.compute('v1');

function getInstanceParams() {
  return { zone: VM_ZONE, instance: VM_INSTANCE, project: PROJECT_ID };
}

// ── VM Operations ────────────────────────────────────────────────────────────

async function startServer(user: { uid: string; email: string }) {
  logger.info('vm', `start requested by ${user.uid} (${user.email})`);
  const authClient = await getComputeClient();
  await compute.instances.start({
    ...getInstanceParams(),
    auth: authClient,
  });
  await setServerStatus({
    serverIsOn: true,
    serverStatus: 'STARTING',
    startedAt: new Date(),
  });
  logger.info('vm', 'start completed');
  // Background poll: wait for MC server to finish loading mods
  waitForMcServer(user).catch((e) =>
    logger.error('vm', 'background poll failed', { error: String(e) }),
  );
}

async function stopServer(user: { uid: string; email: string }) {
  logger.info('vm', `stop requested by ${user.uid} (${user.email})`);

  // Check if already off — skip RCON, GCE API, and Firestore update
  const serverStatus = await getServerStatus();
  if (!serverStatus?.serverIsOn) {
    logger.info('vm', 'stop skipped — server already off');
    return;
  }

  // Step 1-2: save-all + stop via RCON, wait for shutdown
  await gracefulStopMc();

  // Step 3: Stop the GCE instance
  const authClient = await getComputeClient();
  const setLastOnline = !!serverStatus?.serverIsOn;

  const now = Date.now();
  const prevRuntime = serverStatus?.totalRuntimeMs ?? 0;
  const startedAtMs = toMs(serverStatus?.startedAt);
  const sessionRuntime = startedAtMs && serverStatus?.serverIsOn ? now - startedAtMs : 0;
  const totalRuntimeMs = prevRuntime + Math.max(0, sessionRuntime);

  await compute.instances.stop({
    ...getInstanceParams(),
    auth: authClient,
  });
  await setServerStatus({
    serverIsOn: false,
    setLastOnline,
    serverStatus: 'STOPPING',
    totalRuntimeMs,
  });
  logger.info('vm', `stop completed — session: ${(sessionRuntime / 3600000).toFixed(1)}h, total: ${(totalRuntimeMs / 3600000).toFixed(1)}h`);
}

/** Probe RCON — if it responds, the Minecraft server is fully loaded */
async function isMcServerReady(): Promise<boolean> {
  try {
    await rconCommand('list');
    return true;
  } catch {
    return false;
  }
}

async function checkServerStatus(user: { uid: string; email: string }) {
  logger.info('vm', `check requested by ${user.uid} (${user.email})`);
  const authClient = await getComputeClient();
  const vm = (await compute.instances.get({
    ...getInstanceParams(),
    auth: authClient,
  })) as unknown as { data: { status?: string | null } };
  const gceStatus = vm.data.status ?? 'UNKNOWN';

  if (gceStatus === 'RUNNING') {
    // VM is up — now check if the Minecraft server process is actually ready
    const ready = await isMcServerReady();
    const serverStatus = ready ? 'RUNNING' : 'STARTING';
    await setServerStatus({ serverIsOn: true, serverStatus });

    // Record online players if server is running
    if (ready) {
      try {
        const listOutput = await rconCommand('list');
        const names = parsePlayerList(listOutput);
        if (names.length > 0) {
          recordPlayersOnline(names).catch((e) =>
            logger.error('vm', 'player recording failed', { error: String(e) }),
          );
        }
      } catch (e) {
        // Player recording is best-effort
        logger.warn('vm', 'could not record players', { error: String(e) });
      }
    }

    logger.info('vm', `check result: GCE=${gceStatus}, MC=${serverStatus}`);
  } else {
    await setServerStatus({ serverIsOn: false, serverStatus: gceStatus });
    logger.info('vm', `check result: ${gceStatus}`);
  }
}

/**
 * After issuing a VM start, poll the Minecraft server until RCON responds,
 * then update Firestore status to RUNNING.
 */
async function waitForMcServer(user: { uid: string; email: string }) {
  logger.info('vm', `background poll: waiting for MC server (${user.uid})`);
  const maxAttempts = 20; // 20 × 15s = 5 min max
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 15_000));
    const ready = await isMcServerReady();
    if (ready) {
      logger.info('vm', `background poll: MC server ready after ~${(i + 1) * 15}s`);
      await setServerStatus({ serverStatus: 'RUNNING' });
      return;
    }
    logger.info('vm', `background poll: attempt ${i + 1}/${maxAttempts} — not ready yet`);
  }
  logger.warn('vm', `background poll: MC server did not become ready within ${maxAttempts * 15}s`);
}

async function delayShutdown(user: { uid: string; email: string }, skip: boolean) {
  logger.info('vm', `delay set to ${skip} by ${user.uid} (${user.email})`);
  await setServerStatus({ skipNextAutoShutdown: skip });
  logger.info('vm', `auto-shutdown ${skip ? 'delayed' : 're-enabled'}`);
}

// ── Auth Helpers ─────────────────────────────────────────────────────────────

function getActiveUser(event: { locals: App.Locals }): { uid: string; email: string } | null {
  if (event.locals.user?.isActive) {
    return { uid: event.locals.user.uid, email: event.locals.user.email };
  }
  return null;
}

function assertActiveUser(event: { locals: App.Locals }): { uid: string; email: string } {
  const user = getActiveUser(event);
  if (!user) throw new Error('Unauthorized');
  return user;
}

// ── Rate Limiter for unauthenticated /check requests ───────────────────────
/** In-memory rate limiter: IP → last request timestamp */
const checkRateMap = new Map<string, number>();
const CHECK_RATE_WINDOW_MS = 5_000; // 5 seconds between unauthenticated checks

/**
 * Returns true if the request should be rate-limited.
 * Cleans up expired entries periodically.
 */
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const last = checkRateMap.get(ip);
  if (last && now - last < CHECK_RATE_WINDOW_MS) return true;
  checkRateMap.set(ip, now);

  // Garbage collect every ~100 writes
  if (checkRateMap.size > 500) {
    for (const [k, v] of checkRateMap) {
      if (now - v > CHECK_RATE_WINDOW_MS) checkRateMap.delete(k);
    }
  }
  return false;
}

// ── Request Handler ──────────────────────────────────────────────────────────

export const POST: RequestHandler = async (event) => {
  try {
    const body = await event.request.json();
    const { type } = body;

    // check is public (read-only status) — everything else requires auth
    if (type === 'check') {
      const user = getActiveUser(event);
      const startTs = Date.now();

      // Rate limit unauthenticated checks (1 per 5s per IP)
      if (!user) {
        const ip = event.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          ?? event.getClientAddress?.() ?? 'unknown';
        if (isRateLimited(ip)) {
          logger.warn('vm', `check rate-limited for IP ${ip}`);
          return json({ error: 'Too many requests. Please wait a few seconds.' }, { status: 429 });
        }
      }

      await checkServerStatus(user ?? { uid: 'anonymous', email: 'anonymous' });
      logger.info('vm', `check succeeded (${Date.now() - startTs}ms)`);
      return json({ success: true });
    }

    const user = assertActiveUser(event);

    logger.info('vm', `POST type=${type} by ${user.uid}`);
    const startTs = Date.now();

    switch (type) {
      case 'start':
        await startServer(user);
        break;
      case 'stop':
        await stopServer(user);
        break;
      case 'delay':
        const { skip } = body;
        await delayShutdown(user, skip === true);
        break;
      case 'backup':
        await runBackup();
        break;
      default:
        logger.warn('vm', `unknown type: ${type}`);
        return json({ error: `Unknown type: ${type}` }, { status: 400 });
    }

    logger.info('vm', `${type} succeeded (${Date.now() - startTs}ms)`);
    return json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal Server Error';
    const code = (e as any)?.code ?? (e as any)?.status ?? null;
    const stack = e instanceof Error ? e.stack : '';
    logger.error('vm', `POST failed`, { error: message, code, stack: stack?.slice(0, 500) });
    console.error('[vm] POST failed:', e instanceof Error ? e : String(e));
    // Return proper error: if the error has a known status code, use it
    const status = message === 'Unauthorized' ? 401 : code === 403 ? 403 : 500;
    return json({ error: message, code }, { status });
  }
};
