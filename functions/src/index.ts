import { onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

export const vm = onCall(
  {
    region: 'europe-west1',
  },
  async (request) => (await import('./controllers/vm')).default(request),
);

export const auth_create_user = onCall(
  {
    region: 'europe-west1',
  },
  async (request) =>
    (await import('./controllers/auth/create-user')).default(request),
);

export const auth_get_email_from_username = onCall(
  {
    region: 'europe-west1',
  },
  async (request) =>
    (await import('./controllers/auth/get-email-from-username')).default(
      request,
    ),
);

export const dailyScheduler = onSchedule(
  {
    schedule: '0 06 * * *',
    timeZone: 'Europe/Oslo',
    region: 'europe-west1',
  },
  async () => (await import('./controllers/schedulers/daily')).default(),
);
