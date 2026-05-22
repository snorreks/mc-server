// frontend/src/lib/client/services/approvals.svelte.ts
// Reactive Firestore listener for the allowed_emails document.
// Provides pending count and entries for notification badges.
// Only starts listening when a user is signed in.

import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { AG_ALLOWED_EMAILS_PATH } from '$config';
import { getFirebaseAuth, getFirebaseFirestore } from '$lib/client/firebase';

export type ApprovalEntry = { email: string; approved: boolean; photoURL?: string | null; displayName?: string | null };

let _entries = $state<ApprovalEntry[]>([]);
let _unsub: (() => void) | null = null;
let _initCalled = false;

// Derived reactive values — Svelte 5 tracks these across components
let _pendingCount = $derived(_entries.filter((e) => !e.approved).length);
let _hasPending = $derived(_entries.some((e) => !e.approved));

export const approvals = {
  get entries() {
    return _entries;
  },
  get pendingCount() {
    return _pendingCount;
  },
  get hasPending() {
    return _hasPending;
  },
};

export function initApprovalsListener() {
  if (_initCalled) return;
  _initCalled = true;

  // Wait for Firebase Auth to resolve before starting Firestore listener.
  // This prevents permission-denied errors when the user isn't signed in.
  onAuthStateChanged(getFirebaseAuth(), (user) => {
    if (!user?.uid) {
      // Signed out — tear down listener
      _unsub?.();
      _unsub = null;
      _entries = [];
      return;
    }

    // Signed in — start listening (idempotent)
    if (_unsub) return;
    const db = getFirebaseFirestore();
    _unsub = onSnapshot(doc(db, AG_ALLOWED_EMAILS_PATH), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Record<string, boolean | ApprovalEntry>;
        _entries = Object.entries(data)
          .map(([email, value]) => {
            if (typeof value === 'boolean') return { email, approved: value };
            return { email, ...value };
          })
          .sort((a, b) => a.email.localeCompare(b.email));
      } else {
        _entries = [];
      }
    });
  });
}

export function destroyApprovalsListener() {
  _unsub?.();
  _unsub = null;
}
