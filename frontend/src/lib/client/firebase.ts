import { type FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { type Auth, connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, type Firestore, getFirestore } from 'firebase/firestore';
import { connectStorageEmulator, type FirebaseStorage, getStorage } from 'firebase/storage';
import { FIREBASE_CONFIG, PROJECT_ID } from '$config';

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;
let storage: FirebaseStorage;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app =
      getApps().length === 0
        ? initializeApp({
            apiKey: FIREBASE_CONFIG.apiKey,
            authDomain: FIREBASE_CONFIG.authDomain,
            projectId: PROJECT_ID,
            storageBucket: FIREBASE_CONFIG.storageBucket,
            messagingSenderId: FIREBASE_CONFIG.messagingSenderId,
            appId: FIREBASE_CONFIG.appId,
          })
        : getApps()[0];
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
    if (import.meta.env.MODE === 'emulator') {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099');
    }
  }
  return auth;
}

export function getFirebaseFirestore(): Firestore {
  if (!firestore) {
    firestore = getFirestore(getFirebaseApp());
    if (import.meta.env.MODE === 'emulator') {
      connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
    }
  }
  return firestore;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(getFirebaseApp());
    if (import.meta.env.MODE === 'emulator') {
      connectStorageEmulator(storage, '127.0.0.1', 9199);
    }
  }
  return storage;
}
