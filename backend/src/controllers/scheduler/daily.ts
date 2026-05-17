// functions/src/controllers/scheduler/daily.ts
// Scheduled function to stop the MC server every 6 hours if no delay was set.

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

    // Check if shutdown should be skipped
    const statusDoc = await db.doc(AG_STATUS_PATH).get();
    const data = statusDoc.data() as ServerStatusData;
    if (data?.skipNextAutoShutdown) {
      console.log('Auto-shutdown skipped — user requested delay');
      await db.doc(AG_STATUS_PATH).set({ skipNextAutoShutdown: false }, { merge: true });
      return { skipped: true };
    }

    const instanceParams = { zone: vmZone, instance: vmInstance, project: projectId };

    await compute.instances.stop({
      ...instanceParams,
      auth: authClient as unknown as OAuth2Client,
    });

    const setLastOnline = !!data?.serverIsOn;

    // Calculate runtime for this session
    const now = Date.now();
    const prevRuntime = data?.totalRuntimeMs ?? 0;
    const startedAtVal = data?.startedAt;
    const startedAtMs = startedAtVal
      ? typeof startedAtVal === 'object' && 'toMillis' in startedAtVal
        ? (startedAtVal as unknown as { toMillis: () => number }).toMillis()
        : (startedAtVal as Date).getTime()
      : 0;
    const sessionRuntime = startedAtMs && data?.serverIsOn ? now - startedAtMs : 0;
    const totalRuntimeMs = prevRuntime + Math.max(0, sessionRuntime);

    const updateData: Partial<ServerStatusData> = {
      serverIsOn: false,
      serverStatus: 'STOPPING',
      updatedAt: new Date(),
      startedAt: undefined,
      totalRuntimeMs,
    };
    if (setLastOnline) {
      updateData.lastOnline = new Date();
    }

    await db.doc(AG_STATUS_PATH).set(updateData, { merge: true });

    console.log(`Server stopped by daily scheduler — session: ${(sessionRuntime / 3600000).toFixed(1)}h, total: ${(totalRuntimeMs / 3600000).toFixed(1)}h`);
    return { stopped: true };
  } catch (e) {
    console.error('Daily scheduler failed', e);
    return { stopped: false, error: String(e) };
  }
}

export default onSchedule(
  async () => {
    console.log('Running daily shutdown scheduler');
    const result = await stopServer();
    console.log('Daily scheduler result', result);
    return result;
  },
  {
    schedule: '0 */6 * * *',
    timeZone: 'Europe/Oslo',
    memory: '256MiB',
    timeoutSeconds: 120,
  },
);
