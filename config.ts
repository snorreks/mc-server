// config.ts — shared configuration for the MC Server project.
// All apps (frontend, backend, scripts) import from here.
// Only secrets (API keys, passwords) stay in .env files.

export const PROJECT_ID = 'agmcs2026';
export const VM_ZONE = 'europe-west1-b';
export const VM_INSTANCE = 'mc-server';
export const VM_IP = '34.52.144.56';
export const VM_HAS_MAP = false;
export const VM_MAP_PORT = 8100;
export const STATIC_IP_NAME = 'mc-server-ip';

// Minecraft server defaults (can be overridden per project)
export const MC_MEMORY = '24G';
export const MC_DIFFICULTY = 'normal';
export const MC_MAX_PLAYERS = 20;
export const MC_VIEW_DISTANCE = 12;

// GCP billing
export const GCP_FREE_TIER_CREDITS = 300;
export const GCP_FREE_TIER_DAYS = 90;

// ── Firebase Client Config (public — safe to hardcode) ────────────────────
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBxoZ2I52nt6jxmfWgBO_9zGo_KRX-wY38',
  authDomain: 'agmcs2026.firebaseapp.com',
  storageBucket: 'agmcs2026.firebasestorage.app',
  messagingSenderId: '318055174421',
  appId: '1:318055174421:web:5787d1b52066bffe5a191c',
};

// ── Firestore document paths ───────────────────────────────────────────────
export const AG_STATUS_PATH = 'ag-server/status';
export const AG_ALLOWED_EMAILS_PATH = 'ag-server/allowed_emails';

export type CoreData = Record<string, unknown>;

export type AllowedEmailData = Record<string, boolean>;

export type ServerStatusData = {
  serverIsOn: boolean;
  serverStatus: string;
  updatedAt?: Date;
  lastOnline?: Date;
  skipNextAutoShutdown?: boolean;
  serverIsReady?: boolean;
};
