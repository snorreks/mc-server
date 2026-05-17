import { type Auth, type DecodedIdToken, getAuth as fbGetAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { AG_ALLOWED_EMAILS_PATH } from '$config';
import { deleteCookie, getCookie } from '$lib/server/cookies';

export const SESSION_MAX_AGE_SEC = 14 * 24 * 60 * 60; // 14 days
export const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SEC * 1000;

import { getApp } from './firebase';

let _auth: Auth | undefined;

export const getAuth = () => {
  if (!_auth) {
    _auth = fbGetAuth(getApp());
  }
  return _auth;
};

export type ServerUser = {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  isActive: boolean;
};

/**
 * Read and verify the Firebase __session cookie via the cookie wrapper.
 * Returns null if no valid session exists.
 */
export async function verifySessionCookie(
  cookies: import('@sveltejs/kit').Cookies,
  cleanup?: { request: Request; url: URL },
): Promise<ServerUser | null> {
  const sessionCookie = getCookie('__session', { cookies });
  if (!sessionCookie) {
    return null;
  }

  try {
    const decoded = await getAuth().verifySessionCookie(sessionCookie, true);
    const email = decoded.email ?? '';

    // Primary: read isActive from the custom claim (set at login on subsequent tokens)
    let isActive = (decoded as Record<string, unknown>).isActive === true;
    console.log('[auth:server] verifySessionCookie — custom claim isActive:', isActive, 'from decoded claims:', JSON.stringify(Object.keys(decoded)));

    // Fallback: if the custom claim hasn't propagated yet (first session),
    // check allowed_emails from Firestore directly
    if (!isActive && email) {
      try {
        const doc = await getFirestore(getApp()).doc(AG_ALLOWED_EMAILS_PATH).get();
        const allowed = doc.data() as Record<string, boolean> | undefined;
        isActive = allowed?.[email] === true;
        console.log('[auth:server] verifySessionCookie — fallback isActive:', isActive, 'email:', email);
      } catch {
        console.warn('[auth:server] verifySessionCookie — Firestore fallback failed');
      }
    }

    console.log('[auth:server] verifySessionCookie — final isActive:', isActive, 'for:', email);

    return {
      uid: decoded.uid,
      email,
      displayName: ((decoded as Record<string, unknown>).name as string) ?? '',
      photoURL: ((decoded as Record<string, unknown>).picture as string) ?? '',
      isActive,
    };
  } catch {
    if (cleanup) {
      deleteCookie('__session', { cookies });
    }
    return null;
  }
}

/**
 * Create a Firebase session cookie from an ID token.
 */
export async function createSessionCookie(idToken: string): Promise<string> {
  return getAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_MS,
  });
}

export async function verifyIdToken(idToken: string): Promise<DecodedIdToken> {
  return getAuth().verifyIdToken(idToken, true);
}
