import { type Auth, type DecodedIdToken, getAuth as fbGetAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { AG_ALLOWED_EMAILS_PATH } from '$config';
import { deleteCookie, getCookie } from '$lib/server/cookies';
import { getApp } from './firebase';

export const SESSION_MAX_AGE_SEC = 14 * 24 * 60 * 60; // 14 days
export const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SEC * 1000;

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
  // ✅ FIX: getCookie('__session') automatically unpacks your custom JSON
  // structure and returns ONLY the session JWT string.
  const sessionCookie = getCookie('__session', { cookies });

  if (!sessionCookie || sessionCookie.trim() === '' || sessionCookie === 'undefined') {
    return null;
  }

  try {
    const decoded = await getAuth().verifySessionCookie(sessionCookie, true);
    const email = decoded.email ?? '';

    if (!email) {
      throw new Error('Token does not contain a valid email address');
    }

    // Read isActive from the custom claims payload
    let isActive = (decoded as Record<string, unknown>).isActive === true;
    console.log('[auth:server] verifySessionCookie — claim isActive:', isActive, 'for:', email);

    // Fallback block: Direct check on Firestore
    if (!isActive) {
      try {
        const firestoreInstance = getFirestore(getApp());
        const docRef = firestoreInstance.doc(AG_ALLOWED_EMAILS_PATH);
        const docSnap = await docRef.get();

        const allowed = docSnap.data() as Record<string, boolean> | undefined;
        isActive = allowed?.[email] === true;
        console.log(
          '[auth:server] verifySessionCookie — fallback isActive:',
          isActive,
          'email:',
          email,
        );
      } catch (fsError) {
        console.warn(
          '[auth:server] verifySessionCookie — Firestore fallback execution failed',
          fsError,
        );
        isActive = false; // Defensively reject access if DB check goes sideways
      }
    }

    // Explicit request isolation payload return
    return {
      uid: decoded.uid,
      email,
      displayName: (decoded.name as string) ?? '',
      photoURL: (decoded.picture as string) ?? '',
      isActive,
    };
  } catch (error) {
    console.error('[auth:server] verifySessionCookie verification crash, purging token.', error);
    if (cleanup) {
      try {
        deleteCookie('__session', { cookies });
      } catch (cookieError) {
        console.error('[auth:server] Failed to clean up dead cookie context', cookieError);
      }
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
