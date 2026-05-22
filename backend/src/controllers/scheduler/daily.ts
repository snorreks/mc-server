// functions/src/controllers/scheduler/daily.ts
// Scheduled function to stop the MC server every hour if idle (no players online).

import { onSchedule } from '@snorreks/firestack';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { google } from 'googleapis';

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

import {
  AG_STATUS_PATH,
  PROJECT_ID,
  type ServerStatusData,
  VM_INSTANCE,
  VM_ZONE,
} from '../../../../config';
import { parsePlayerList, toMs } from '../../../../shared/utils';
import { rconCommand } from '../../../../shared/rcon';

const MINIMUM_UPTIME_MS = 30 * 60 * 1000; // 30 minutes — gives time to log in after boot

// ── Firebase Admin ──────────────────────────────────────────────────────────

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccount) {
    return initializeApp({ credential: cert(JSON.parse(serviceAccount)) });
  }
  return initializeApp();
}

// ── GCE Compute ──────────────────────────────────────────────────────────────

const vmZone = VM_ZONE;
const vmInstance = VM_INSTANCE;
const projectId = PROJECT_ID;

const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/compute'],
});
const compute = google.compute('v1');

async function stopServer() {
  try {
    const authClient = await auth.getClient();
    const db = getFirestore(getAdminApp());

    // Read current status
    const statusDoc = await db.doc(AG_STATUS_PATH).get();
    const data = statusDoc.data() as ServerStatusData;

    // If already off, skip everything — no RCON, no GCE API, no Firestore update
    if (!data?.serverIsOn) {
      console.log('Auto-shutdown skipped — server is already off');
      return { skipped: true, reason: 'already_off' };
    }

    // Minimum uptime check — don't shut down a freshly booted server
    const startedAtMs = toMs(data?.startedAt);
    const uptimeMs = startedAtMs ? Date.now() - startedAtMs : 0;
    if (uptimeMs > 0 && uptimeMs < MINIMUM_UPTIME_MS) {
      const remaining = Math.ceil((MINIMUM_UPTIME_MS - uptimeMs) / 60000);
      console.log(`Auto-shutdown skipped — server up for ${(uptimeMs / 60000).toFixed(1)}min (minimum ${MINIMUM_UPTIME_MS / 60000}min), retrying in ${remaining}min`);
      return { skipped: true, reason: 'minimum_uptime', uptimeMs };
    }

    // Check if players are online — never shut down while someone's playing
    try {
      const listOutput = await rconCommand('list');
      const players = parsePlayerList(listOutput);
      if (players.length > 0) {
        console.log(`Auto-shutdown skipped — ${players.length} player(s) online: ${players.join(', ')}`);
        return { skipped: true, reason: 'players_online', players };
      }
    } catch (e) {
      // RCON failed (server might be booting or crashed) — skip this run
      console.warn('Auto-shutdown skipped — RCON unreachable', String(e));
      return { skipped: true, reason: 'rcon_unreachable' };
    }

    // Check if shutdown should be skipped (user delayed it)
    if (data?.skipNextAutoShutdown) {
      console.log('Auto-shutdown skipped — user requested delay');
      await db.doc(AG_STATUS_PATH).set({ skipNextAutoShutdown: false }, { merge: true });
      return { skipped: true, reason: 'user_delayed' };
    }

    // Graceful Minecraft shutdown: save-all → stop → wait
    const { gracefulStopMc } = await import('../../lib/graceful-stop');
    await gracefulStopMc();

    const instanceParams = { zone: vmZone, instance: vmInstance, project: projectId };

    await compute.instances.stop({
      ...instanceParams,
      auth: authClient as unknown as OAuth2Client,
    });

    const setLastOnline = !!data?.serverIsOn;

    // Calculate runtime for this session
    const now = Date.now();
    const prevRuntime = data?.totalRuntimeMs ?? 0;
    const sessionRuntime = startedAtMs && data?.serverIsOn ? now - startedAtMs : 0;
    const totalRuntimeMs = prevRuntime + Math.max(0, sessionRuntime);

    const updateData: Partial<ServerStatusData> = {
      serverIsOn: false,
      serverStatus: 'STOPPING',
      updatedAt: new Date(),
      totalRuntimeMs,
    };
    if (setLastOnline) {
      updateData.lastOnline = new Date();
    }

    await db.doc(AG_STATUS_PATH).set(updateData, { merge: true });

    console.log(`Server stopped by hourly scheduler — session: ${(sessionRuntime / 3600000).toFixed(1)}h, total: ${(totalRuntimeMs / 3600000).toFixed(1)}h`);
    return { stopped: true };
  } catch (e) {
    console.error('Hourly scheduler failed', e);
    return { stopped: false, error: String(e) };
  }
}

export default onSchedule(
  async () => {
    console.log('Running hourly shutdown scheduler');
    const result = await stopServer();
    console.log('Hourly scheduler result', result);
    return result;
  },
  {
    schedule: '0 * * * *',
    timeZone: 'Europe/Oslo',
    memory: '512MiB',
    timeoutSeconds: 120,
  },
);
