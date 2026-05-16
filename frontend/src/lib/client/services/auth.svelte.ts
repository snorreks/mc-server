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
    return allowed[email] === true;
  } catch {
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

  function init() {
    if (unsub) return;
    unsub = onAuthStateChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        await syncSessionCookie(undefined);
        set(initialState);
        return;
      }

      const email = user.email ?? '';
      const isActive = await checkIsAllowed(email);

      // Sync session cookie whenever auth state changes
      const token = await user.getIdToken();
      await syncSessionCookie(token);

      patch({
        status: isActive ? 'active' : 'notActive',
        uid: user.uid,
        email,
        displayName: user.displayName ?? '',
        photoURL: user.photoURL ?? '',
        isSignedIn: true,
        isActive,
      });
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
    if (!user) return;
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
