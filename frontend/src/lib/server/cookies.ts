// frontend/src/lib/server/cookies.ts
// Simplified cookie handling for Netlify.
// __session stores the Firebase session JWT directly (no JSON wrapping).
// Theme has its own cookie.

import type { Cookies } from '@sveltejs/kit';

export type CookieKey = '__session' | 'theme';

export const baseCookieOptions = {
  httpOnly: true,
  path: '/',
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production' || !!process.env.K_SERVICE,
} as const;

export const sessionMaxAge = 14 * 24 * 60 * 60; // 14 days in seconds

export const getCookie = (key: CookieKey, options: { cookies: Cookies }): string | undefined => {
  return options.cookies.get(key);
};

export const setCookie = (key: CookieKey, value: string, options: { cookies: Cookies; maxAge?: number }): void => {
  options.cookies.set(key, value, {
    ...baseCookieOptions,
    maxAge: options.maxAge ?? sessionMaxAge,
  });
};

export const deleteCookie = (key: CookieKey, options: { cookies: Cookies }): void => {
  options.cookies.delete(key, { ...baseCookieOptions });
};
