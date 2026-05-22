import { json } from '@sveltejs/kit';
import { getFirestore } from '$lib/server/firestore';
import { AG_ALLOWED_EMAILS_PATH } from '$config';
import { logger } from '$logger';
import type { RequestHandler } from './$types';

/**
 * POST /api/auth/approve/reject
 * Removes a pending email from the allowed_emails document (deny access).
 */
export const POST: RequestHandler = async (event) => {
  try {
    const body = await event.request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return json({ error: 'Email is required' }, { status: 400 });
    }

    // Read-modify-write: FieldValue.delete doesn't work with preferRest Firestore
    const db = getFirestore();
    const doc = await db.doc(AG_ALLOWED_EMAILS_PATH).get();
    const data = (doc.data() ?? {}) as Record<string, unknown>;
    delete data[email.toLowerCase()];
    await db.doc(AG_ALLOWED_EMAILS_PATH).set(data);

    logger.info('approve', `rejected: ${email}`);
    return json({ success: true });
  } catch (e) {
    logger.error('approve', 'reject failed', e);
    return json({ error: 'Failed to reject' }, { status: 500 });
  }
};
