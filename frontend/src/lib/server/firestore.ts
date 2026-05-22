import { type Firestore, initializeFirestore } from 'firebase-admin/firestore';
import {
  AG_ALLOWED_EMAILS_PATH,
  AG_STATUS_PATH,
  AG_PLAYERS_PATH,
  type ServerStatusData,
} from '$config';
import { getApp } from './firebase.js';

let _database: Firestore | undefined;

export const getFirestore = (): Firestore => {
  if (_database) {
    return _database;
  }
  const app = getApp();
  const preferRest = true;
  _database = initializeFirestore(app, { preferRest });

  return _database;
};

export const allowedEmails = async (): Promise<string[]> => {
  try {
    const doc = await getFirestore().doc(AG_ALLOWED_EMAILS_PATH).get();
    const data = doc.exists ? (doc.data() as Record<string, boolean | { approved: boolean }>) : {};
    return Object.entries(data)
      .filter(([, v]) => {
        if (typeof v === 'boolean') return v === true;
        return v.approved === true;
      })
      .map(([k]) => k);
  } catch (error) {
    console.error('allowedEmails', error);
    return [];
  }
};

export const getServerStatus = async (): Promise<ServerStatusData | undefined> => {
  try {
    const doc = await getFirestore().doc(AG_STATUS_PATH).get();
    if (!doc.exists) {
      throw new Error('status doc not found');
    }

    return doc.data() as ServerStatusData;
  } catch (error) {
    console.error('getServerStatus', error);
    return undefined;
  }
};
export const setServerStatus = async (data: {
  serverIsOn?: boolean;
  setLastOnline?: boolean;
  serverStatus?: string | null;
  skipNextAutoShutdown?: boolean;
  startedAt?: Date | null;
  totalRuntimeMs?: number;
}) => {
  const update: Partial<ServerStatusData> = { updatedAt: new Date() };
  if (data.setLastOnline) update.lastOnline = new Date();
  if (data.serverStatus) update.serverStatus = data.serverStatus;
  if (data.serverIsOn !== undefined) update.serverIsOn = data.serverIsOn;
  if (data.skipNextAutoShutdown !== undefined)
    update.skipNextAutoShutdown = data.skipNextAutoShutdown;
  if (data.startedAt !== undefined) update.startedAt = data.startedAt ?? undefined;
  if (data.totalRuntimeMs !== undefined) update.totalRuntimeMs = data.totalRuntimeMs;

  await getFirestore().doc(AG_STATUS_PATH).set(update, { merge: true });
};

// ── Player tracking ───────────────────────────────────────────────────────

export type PlayerRecord = { name: string; lastOnline: Date };

/** Bulk-update player last-seen timestamps. Stores in ag-server/players doc. */
export async function recordPlayersOnline(names: string[]) {
  if (names.length === 0) return;

  const now = new Date();
  const update: Record<string, Date> = {};
  for (const name of names) {
    update[name] = now;
  }
  await getFirestore().doc(AG_PLAYERS_PATH).set(update, { merge: true });
}

/** Get all known players with their last online timestamp, sorted by most recent. */
export async function getKnownPlayers(): Promise<PlayerRecord[]> {
  try {
    const doc = await getFirestore().doc(AG_PLAYERS_PATH).get();
    if (!doc.exists) return [];
    const data = (doc.data() ?? {}) as Record<string, Date>;
    return Object.entries(data)
      .map(([name, lastOnline]) => ({ name, lastOnline }))
      .sort((a, b) => b.lastOnline.getTime() - a.lastOnline.getTime());
  } catch {
    return [];
  }
}
