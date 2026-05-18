// frontend/src/lib/server/cookies.ts
// All cookie data is stored inside a single __session cookie as a JSON object.
// This avoids issues with multiple cookies (domain/path/secure inconsistencies)
// and keeps the cookie names simple for Firebase Hosting + Cloud Run.

import type { Cookies } from '@sveltejs/kit';
import { logger } from '$logger';

export type CookieKey = '__session' | 'theme';

/**
 * The internal shape stored inside the __session JSON cookie.
 * 'session' is reserved for the Firebase Auth session JWT.
 */
type SessionStore = {
  session?: string;
  theme?: string;
};

export type SerializeOptions = Parameters<Cookies['set']>[2];

export const baseCookieOptions = {
  httpOnly: true,
  path: '/',
  sameSite: 'lax',
  secure: true, // Firebase Hosting + Cloud Run are always HTTPS
} as const satisfies SerializeOptions;

export const sessionAge = 60 * 60 * 24 * 14; // 14 days in seconds

// ── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Parse the __session cookie into a structured store object.
 * Returns an empty store if the cookie doesn't exist or is invalid.
 */
const getStore = (cookies: Cookies): SessionStore => {
  const value = cookies.get('__session');
  if (!value) return {};

  // Backward compat: old format stored the JWT directly (no JSON)
  if (!value.startsWith('{')) {
    return { session: value };
  }

  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as SessionStore;
    }
    // Invalid JSON structure, treat as raw JWT
    return { session: value };
  } catch {
    return { session: value };
  }
};

/**
 * Serialize and save the store back to the __session cookie.
 * If the store is empty (no keys), the cookie is deleted.
 */
const saveStore = (cookies: Cookies, store: SessionStore) => {
  const keys = Object.keys(store);
  if (keys.length === 0) {
    cookies.delete('__session', { ...baseCookieOptions });
    return;
  }

  const json = JSON.stringify(store);

  if (json.length > 3800) {
    logger.warn('Cookie size is nearing the 4KB limit!', { size: json.length });
  }

  cookies.set('__session', json, {
    ...baseCookieOptions,
    maxAge: sessionAge,
  });
};

// ── Public API ───────────────────────────────────────────────────────────────

export const getCookie = (key: CookieKey, options: { cookies: Cookies }): string | undefined => {
  const store = getStore(options.cookies);

  if (key === '__session') {
    return store.session;
  }

  // Migrate legacy standalone 'theme' cookie into the __session store
  // (only happens once; the next setCookie will persist it inside the JSON)
  if (key === 'theme') {
    if (store.theme) return store.theme;
    const legacyTheme = options.cookies.get('theme');
    if (legacyTheme) {
      // Migrate into store silently — no save yet (that happens on next setCookie)
      store.theme = legacyTheme;
    }
    return legacyTheme ?? undefined;
  }

  return undefined;
};

export const setCookie = (
  key: CookieKey,
  value: string,
  options: { cookies: Cookies; maxAge?: number },
): void => {
  const store = getStore(options.cookies);

  if (key === '__session') {
    store.session = value;
  } else if (key === 'theme') {
    store.theme = value;
  }

  logger.debug('setCookie', { key, storeKeys: Object.keys(store) });
  saveStore(options.cookies, store);

  // Clean up legacy standalone theme cookie after migration
  if (key === 'theme') {
    options.cookies.delete('theme', { ...baseCookieOptions });
  }
};

export const deleteCookie = (key: CookieKey, options: { cookies: Cookies }): void => {
  const store = getStore(options.cookies);

  if (key === '__session') {
    delete store.session;
  } else if (key === 'theme') {
    delete store.theme;
  }

  logger.debug('deleteCookie', { key, storeKeys: Object.keys(store) });
  saveStore(options.cookies, store);
};
