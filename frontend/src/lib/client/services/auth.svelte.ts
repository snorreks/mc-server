import { signOut as fbSignOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { writable } from 'svelte/store';
import { AG_ALLOWED_EMAILS_PATH, type AllowedEmailData } from '$config';
import { getFirebaseAuth, getFirebaseFirestore } from '$lib/client/firebase';
import type { CurrentUserStatus } from '$lib/types';

export type AuthState = {
  status: CurrentUserStatus;
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  isSignedIn: boolean;
  isActive: boolean;
};

async function checkIsAllowed(email: string): Promise<boolean> {
  try {
    const db = getFirebaseFirestore();
    const snap = await getDoc(doc(db, AG_ALLOWED_EMAILS_PATH));
    const allowed = (snap.data() ?? {}) as AllowedEmailData;
    const result = allowed[email] === true;
    console.log('[auth] checkIsAllowed', { email, result, allowedKeys: Object.keys(allowed) });
    return result;
  } catch (e) {
    console.error('[auth] checkIsAllowed error', e);
    return false;
  }
}

async function syncSessionCookie(token?: string) {
  try {
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token ?? null }),
    });
  } catch {
    /* ignore */
  }
}

function createAuthStore() {
  const initialState: AuthState = {
    status: 'notSignedIn',
    uid: '',
    email: '',
    displayName: '',
    photoURL: '',
    isSignedIn: false,
    isActive: false,
  };

  const { subscribe, set, update } = writable<AuthState>(initialState);

  function patch(p: Partial<AuthState>) {
    update((s) => ({ ...s, ...p }));
  }

  let unsub: (() => void) | null = null;
  let ssrSeeded = false;

  function init() {
    if (unsub) return;
    console.log('[auth] init called, ssrSeeded:', ssrSeeded);
    unsub = onAuthStateChanged(getFirebaseAuth(), async (user) => {
      console.log('[auth] onAuthStateChanged', { uid: user?.uid, email: user?.email });

      // On the first null callback, skip if SSR already seeded the auth state
      // to avoid wiping the SSR data before Firebase session restores.
      if (!user) {
        console.log('[auth] onAuthStateChanged(null), ssrSeeded:', ssrSeeded);
        if (ssrSeeded) {
          ssrSeeded = false; // Only skip once — subsequent null = actual sign-out
          return;
        }
        await syncSessionCookie(undefined);
        set(initialState);
        return;
      }

      const email = user.email ?? '';
      const isActive = await checkIsAllowed(email);
      console.log('[auth] checkIsAllowed result', { email, isActive });

      // Only sync session cookie for approved users
      if (isActive) {
        const token = await user.getIdToken();
        await syncSessionCookie(token);
      }

      patch({
        status: isActive ? 'active' : 'notActive',
        uid: user.uid,
        email,
        displayName: user.displayName ?? '',
        photoURL: user.photoURL ?? '',
        isSignedIn: true,
        isActive,
      });
      console.log('[auth] state updated', { isActive, email });
    });
  }

  function destroy() {
    unsub?.();
    unsub = null;
    set(initialState);
  }

  async function signOut(): Promise<boolean> {
    try {
      await syncSessionCookie(undefined);
      await fbSignOut(getFirebaseAuth());
      set(initialState);
      return true;
    } catch {
      return false;
    }
  }

  function seedFromSSR(
    user: {
      uid: string;
      email: string;
      displayName: string;
      photoURL: string;
      isActive: boolean;
    } | null,
  ) {
    if (!user) {
      console.log('[auth] seedFromSSR(null) — no user from SSR');
      return;
    }
    ssrSeeded = true;
    console.log('[auth] seedFromSSR', { email: user.email, isActive: user.isActive, uid: user.uid });
    patch({
      status: user.isActive ? 'active' : 'notActive',
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      isSignedIn: true,
      isActive: user.isActive,
    });
  }

  return { subscribe, init, destroy, signOut, seedFromSSR };
}

export const authStore = createAuthStore();
