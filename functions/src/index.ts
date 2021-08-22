import { region } from 'firebase-functions';

const https = region('europe-west3').https;
const pubsub = region('europe-west3').pubsub;

export const stopServer = https.onCall(async (data, context) =>
  (await import('./controllers/vm/stopServer')).default(data, context)
);

export const startServer = https.onCall(async (data, context) =>
  (await import('./controllers/vm/startServer')).default(data, context)
);
export const checkServerStatus = https.onCall(async () =>
  (await import('./controllers/vm/checkServerStatus')).default()
);

export const createUser = https.onCall(async (data, context) =>
  (await import('./controllers/user/createUser')).default(data, context)
);

export const authGetEmailFromUsername = https.onCall(async (data) =>
  (await import('./controllers/user/getEmailFromUsername')).default(data)
);

export const dailyScheduler = pubsub
  .schedule('0 06 * * *')
  .timeZone('Europe/Oslo')
  .onRun(async () =>
    (await import('./controllers/schedulers/dailyScheduler')).default()
  );
