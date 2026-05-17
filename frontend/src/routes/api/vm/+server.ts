// src/routes/api/vm/+server.ts
// API endpoint for VM management operations.

import { json } from '@sveltejs/kit';
import { google } from 'googleapis';
import { PROJECT_ID, VM_INSTANCE, VM_ZONE } from '$config';
import { FIREBASE_SERVICE_ACCOUNT } from '$env/static/private';
import { parseServiceAccount } from '$lib/server/firebase';
import { getServerStatus, setServerStatus } from '$lib/server/firestore';
import { runBackup } from '$lib/server/backup';
import { logger } from '$logger';
import type { RequestHandler } from './$types';

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

// ── GCE Compute Auth ─────────────────────────────────────────────────────────
// On Cloud Run: use the runtime service account via ADC
// Local: use the Firebase Admin SA key (same pattern as firebase.ts)

async function getComputeClient(): Promise<OAuth2Client> {
  const scopes = ['https://www.googleapis.com/auth/cloud-platform'];

  if (process.env.K_SERVICE) {
    // Cloud Run — ADC picks up the runtime service account
    const auth = new google.auth.GoogleAuth({ scopes });
    return (await auth.getClient()) as OAuth2Client;
  }

  // Local dev — use the Firebase SA key directly
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
  await setServerStatus({ serverIsOn: true, serverStatus: 'STARTING' });
  logger.info('vm', 'start completed');
}

async function stopServer(user: { uid: string; email: string }) {
  logger.info('vm', `stop requested by ${user.uid} (${user.email})`);
  const authClient = await getComputeClient();
  const serverStatus = await getServerStatus();
  const setLastOnline = !!serverStatus?.serverIsOn;

  await compute.instances.stop({
    ...getInstanceParams(),
    auth: authClient,
  });
  await setServerStatus({ serverIsOn: false, setLastOnline, serverStatus: 'STOPPING' });
  logger.info('vm', 'stop completed');
}

async function checkServerStatus(user: { uid: string; email: string }) {
  logger.info('vm', `check requested by ${user.uid} (${user.email})`);
  const authClient = await getComputeClient();
  const vm = (await compute.instances.get({
    ...getInstanceParams(),
    auth: authClient,
  })) as unknown as { data: { status?: string | null } };
  const status = vm.data.status ?? 'UNKNOWN';
  await setServerStatus({ serverIsOn: status === 'RUNNING', serverStatus: status });
  logger.info('vm', `check result: ${status}`);
}

async function delayShutdown(user: { uid: string; email: string }) {
  logger.info('vm', `delay requested by ${user.uid} (${user.email})`);
  await setServerStatus({ skipNextAutoShutdown: true });
  logger.info('vm', 'delay applied');
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

// ── Request Handler ──────────────────────────────────────────────────────────

export const POST: RequestHandler = async (event) => {
  try {
    const body = await event.request.json();
    const { type } = body;

    const user = assertActiveUser(event);

    logger.info('vm', `POST type=${type} by ${user.uid}`);
    const startTs = Date.now();

    switch (type) {
      case 'check':
        await checkServerStatus(user);
        break;
      case 'start':
        await startServer(user);
        break;
      case 'stop':
        await stopServer(user);
        break;
      case 'delay':
        await delayShutdown(user);
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
    logger.error('vm', `POST failed`, { error: message });
    return json({ error: message }, { status: message === 'Unauthorized' ? 401 : 500 });
  }
};
