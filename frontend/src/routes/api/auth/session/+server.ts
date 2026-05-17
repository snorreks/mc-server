import { json } from '@sveltejs/kit';
import { createSessionCookie, getAuth, verifyIdToken } from '$lib/server/auth';
import { setCookie } from '$lib/server/cookies';
import { allowedEmails } from '$lib/server/firestore';
import { logger } from '$logger';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
  try {
    const body = await event.request.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      logger.warn('session', 'POST missing token');
      return json({ error: 'Token is required' }, { status: 400 });
    }

    // Decode the ID token to get the user's email
    const decoded = await verifyIdToken(token);
    const email = decoded.email ?? '';

    if (!email) {
      logger.warn('session', 'token has no email');
      return json({ error: 'No email on account' }, { status: 403 });
    }

    // Check if the email is in the allowed list
    const emails = await allowedEmails();
    const isActive = emails.includes(email);

    if (!isActive) {
      logger.warn('session', `rejected ${email} — not in allowed_emails`);
      return json({ error: 'Not authorized' }, { status: 403 });
    }

    // Persist isActive as a custom claim on the Firebase user
    await getAuth().setCustomUserClaims(decoded.uid, { isActive: true });

    const sessionCookie = await createSessionCookie(token);

    setCookie('__session', sessionCookie, { cookies: event.cookies });

    logger.info('session', `cookie created for ${email}`);
    return json({ success: true });
  } catch (e) {
    logger.error('session', 'POST failed', e);
    return json({ error: 'Invalid token' }, { status: 401 });
  }
};

export const DELETE: RequestHandler = async (event) => {
  event.cookies.delete('__session', { path: '/' });
  logger.info('session', 'cookie deleted');
  return json({ success: true });
};
