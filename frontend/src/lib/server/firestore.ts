import { type Firestore, initializeFirestore } from 'firebase-admin/firestore';
import { AG_ALLOWED_EMAILS_PATH, AG_STATUS_PATH, type ServerStatusData } from '$config';
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
    const data = doc.exists ? (doc.data() as Record<string, boolean>) : {};
    return Object.entries(data)
      .filter(([, v]) => v === true)
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
}) => {
  const update: Partial<ServerStatusData> = { updatedAt: new Date() };
  if (data.setLastOnline) update.lastOnline = new Date();
  if (data.serverStatus) update.serverStatus = data.serverStatus;
  if (data.serverIsOn !== undefined) update.serverIsOn = data.serverIsOn;
  if (data.skipNextAutoShutdown !== undefined)
    update.skipNextAutoShutdown = data.skipNextAutoShutdown;

  await getFirestore().doc(AG_STATUS_PATH).set(update, { merge: true });
};
