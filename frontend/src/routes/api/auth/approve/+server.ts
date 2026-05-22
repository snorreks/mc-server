import { json } from '@sveltejs/kit';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from '$lib/server/firestore';
import { AG_ALLOWED_EMAILS_PATH } from '$config';
import { logger } from '$logger';
import { getApp } from '$lib/server/firebase';
import type { RequestHandler } from './$types';

// ── Schema migration: value can be boolean (legacy) or { approved, photoURL?, displayName? } ──
type AllowedEntry = { approved: boolean; photoURL?: string | null; displayName?: string | null };
type AllowedData = Record<string, boolean | AllowedEntry>;

function normalizeEntry(value: boolean | AllowedEntry): AllowedEntry {
  if (typeof value === 'boolean') return { approved: value };
  return value;
}

export const GET: RequestHandler = async () => {
  try {
    const doc = await getFirestore().doc(AG_ALLOWED_EMAILS_PATH).get();
    const data = (doc.data() ?? {}) as AllowedData;
    const entries = Object.entries(data)
      .map(([email, value]) => {
        const entry = normalizeEntry(value);
        return { email, ...entry };
      })
      .sort((a, b) => a.email.localeCompare(b.email));

    // Resolve missing photoURLs from Firebase Auth (batch best-effort)
    const missing = entries.filter((e) => !e.photoURL);
    if (missing.length > 0) {
      try {
        const auth = getAuth(getApp());
        const updates: Record<string, AllowedEntry> = {};
        await Promise.all(
          missing.map(async (entry) => {
            try {
              const user = await auth.getUserByEmail(entry.email);
              if (user.photoURL || user.displayName) {
                entry.photoURL = user.photoURL ?? null;
                entry.displayName = user.displayName ?? null;
                updates[entry.email] = {
                  approved: entry.approved,
                  photoURL: user.photoURL ?? null,
                  displayName: user.displayName ?? null,
                };
              }
            } catch {
              // User might not exist in Firebase Auth yet
            }
          }),
        );
        // Persist resolved avatars
        if (Object.keys(updates).length > 0) {
          getFirestore()
            .doc(AG_ALLOWED_EMAILS_PATH)
            .set(updates, { merge: true })
            .catch(() => {});
        }
      } catch (e) {
        logger.warn('approve', 'avatar resolution failed', { error: String(e) });
      }
    }

    return json({ entries });
  } catch (e) {
    logger.error('approve', 'GET failed', e);
    return json({ error: 'Failed to list' }, { status: 500 });
  }
};

export const POST: RequestHandler = async (event) => {
  try {
    const body = await event.request.json();
    const { email, approved, photoURL, displayName } = body;

    if (!email || typeof email !== 'string') {
      return json({ error: 'Email is required' }, { status: 400 });
    }

    const entry: Record<string, unknown> = { approved: approved === true };
    if (photoURL) entry.photoURL = photoURL;
    if (displayName) entry.displayName = displayName;

    await getFirestore()
      .doc(AG_ALLOWED_EMAILS_PATH)
      .set({ [email.toLowerCase()]: entry }, { merge: true });

    logger.info('approve', `${approved ? 'approved' : 'added pending'}: ${email}`);
    return json({ success: true });
  } catch (e) {
    logger.error('approve', 'POST failed', e);
    return json({ error: 'Failed to update' }, { status: 500 });
  }
};
