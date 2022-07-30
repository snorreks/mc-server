import { google } from 'googleapis';
import { ServerStatusUpdateData } from '../../../@types';

import { db } from '../../configs/dbConfig';
import { serverTimestamp } from '../../configs/firestoreConfig';

const auth = new google.auth.GoogleAuth({
  // Scopes can be specified either as an array or as a single, space-delimited string.
  scopes: ['https://www.googleapis.com/auth/compute'],
});

const compute = google.compute('v1');
const instanceParams = {
  zone: 'europe-west1-b',
  instance: 'mc-server',
  project: 'meingraf421',
};

/**
Create an user in firebase and firestore
*/
export const stopServer = async (): Promise<void> => {
  const authClient = await auth.getClient();
  await compute.instances.stop({ ...instanceParams, auth: authClient });
  const serverStatusSnap = await db.collection('status').doc('ag-server').get();
  const setLastOnline = !!serverStatusSnap.data()?.serverIsOn;

  await setServerStatus({
    serverIsOn: false,
    setLastOnline,
    serverStatus: 'STOPPING',
  });
};

/**
Create an user in firebase and firestore
*/
export const startServer = async (): Promise<void> => {
  const authClient = await auth.getClient();
  await compute.instances.start({ ...instanceParams, auth: authClient });
  await setServerStatus({ serverIsOn: true, serverStatus: 'STARTING' });
};

/**
Create an user in firebase and firestore
*/
export const checkServerStatus = async (): Promise<void> => {
  const authClient = await auth.getClient();
  const vm = await compute.instances.get({
    ...instanceParams,
    auth: authClient,
  });
  const serverStatus = vm.data.status;
  // PROVISIONING, STAGING, RUNNING, STOPPING, SUSPENDING, SUSPENDED, REPAIRING, and TERMINATED
  await setServerStatus({
    serverIsOn: serverStatus === 'RUNNING',
    serverStatus,
  });
};

/**
  Set the user document 
  */
export const setServerStatus = async ({
  serverIsOn,
  setLastOnline,
  serverStatus,
}: {
  serverIsOn: boolean;
  setLastOnline?: boolean;
  serverStatus?: string | null;
}): Promise<void> => {
  const serverStatusData: ServerStatusUpdateData = {
    serverIsOn,
    updatedAt: serverTimestamp(),
  };
  if (setLastOnline) {
    serverStatusData.lastOnline = serverTimestamp();
  }
  if (serverStatus) {
    serverStatusData.serverStatus = serverStatus;
  }

  await db
    .collection('status')
    .doc('ag-server')
    .set(serverStatusData, { merge: true });
};
