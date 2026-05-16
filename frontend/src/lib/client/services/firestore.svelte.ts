// frontend/src/lib/client/services/firestore.svelte.ts
// Reactive Firestore listener using Svelte 5 runes.
// Import `status` directly — it's a reactive object, not a store.

import { type DocumentSnapshot, doc, onSnapshot } from 'firebase/firestore';
import { AG_STATUS_PATH, type ServerStatusData } from '$config';
import { getFirebaseFirestore } from '$lib/client/firebase';

// ── Reactive state (Svelte 5 rune — works in .svelte.ts) ───────────────────

let _data = $state<ServerStatusData | null>(null);
let _unsub: (() => void) | null = null;

// ── Public API: reactive getters ───────────────────────────────────────────

/** Full status document data (reactive) */
export const status = {
  get value() {
    return _data;
  },
  get serverIsOn() {
    return _data?.serverIsOn ?? false;
  },
};

// ── Lifecycle ──────────────────────────────────────────────────────────────

/** Pre-fill from SSR data before the realtime listener kicks in */
export function seedFromSSR(data: ServerStatusData | undefined) {
  if (!data) return;
  _data = data;
}

/** Start listening to the status document */
export function init() {
  if (_unsub) return;
  const db = getFirebaseFirestore();
  _unsub = onSnapshot(doc(db, AG_STATUS_PATH), (snap: DocumentSnapshot) => {
    if (snap.exists()) {
      _data = snap.data() as ServerStatusData;
    }
  });
}

/** Stop listening */
export function destroy() {
  _unsub?.();
  _unsub = null;
}
