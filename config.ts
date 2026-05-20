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
export const MC_MEMORY = '12G';
export const MC_JVM_OPTS = '-XX:+UseZGC -XX:+AlwaysPreTouch -XX:+ZProactive -XX:+DisableExplicitGC -XX:+UseStringDeduplication';
export const MC_DIFFICULTY = 'hard';
export const MC_MAX_PLAYERS = 20;
export const MC_VIEW_DISTANCE = 12;
export const MC_VERSION = '1.20.1';
export const MC_FORGE_VERSION = '47.4.20'; // Valhelsia 6 uses Forge for 1.20.1
export const MC_TYPE = 'FORGE';
export const MC_ALLOW_FLIGHT = true;
export const MC_MAX_TICK_TIME = -1;
export const MC_REMOVE_OLD_MODS = false;
export const MC_EULA = true;
export const MC_ENABLE_RCON = true;
export const MC_MODPACK_NAME = 'Valhelsia 6';
export const MC_MODPACK_URL = 'https://www.curseforge.com/minecraft/modpacks/valhelsia-6';
export const MC_MACHINE_TYPE = 'c3-standard-4';

// Admin
/** Superadmin email — has access to console and all controls */
export const SUPER_ADMIN_EMAIL = 'snorristrand@gmail.com';
export const MC_MODPACK_DOWNLOAD_URL =
  'https://mediafilez.forgecdn.net/files/6448/190/Valhelsia-6-6.2.3.zip';

// GCP billing
export const GCP_FREE_TIER_CREDITS = 300;
export const GCP_FREE_TIER_DAYS = 90;
export const USD_TO_NOK_RATE = 9.33;

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
  /** When the current session started (set on VM start) */
  startedAt?: Date;
  /** Total accumulated runtime in milliseconds across all sessions */
  totalRuntimeMs?: number;
  /** When the project/status was first created (free trial start) */
  createdAt?: Date;
};
