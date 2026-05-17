import { json } from '@sveltejs/kit';
import { getFirestore } from '$lib/server/firestore';
import { AG_ALLOWED_EMAILS_PATH } from '$config';
import { logger } from '$logger';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    const doc = await getFirestore().doc(AG_ALLOWED_EMAILS_PATH).get();
    const data = (doc.data() ?? {}) as Record<string, boolean>;
    const entries = Object.entries(data)
      .map(([email, approved]) => ({ email, approved }))
      .sort((a, b) => a.email.localeCompare(b.email));
    return json({ entries });
  } catch (e) {
    logger.error('approve', 'GET failed', e);
    return json({ error: 'Failed to list' }, { status: 500 });
  }
};

export const POST: RequestHandler = async (event) => {
  try {
    const body = await event.request.json();
    const { email, approved } = body;

    if (!email || typeof email !== 'string') {
      return json({ error: 'Email is required' }, { status: 400 });
    }

    await getFirestore().doc(AG_ALLOWED_EMAILS_PATH).set(
      { [email.toLowerCase()]: approved === true },
      { merge: true },
    );

    logger.info('approve', `${approved ? 'approved' : 'added pending'}: ${email}`);
    return json({ success: true });
  } catch (e) {
    logger.error('approve', 'POST failed', e);
    return json({ error: 'Failed to update' }, { status: 500 });
  }
};
