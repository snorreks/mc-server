import type { Handle, HandleServerError } from '@sveltejs/kit';
import { verifySessionCookie } from '$lib/server/auth';
import { getCookie } from '$lib/server/cookies';
import { logger } from '$logger';

export const handleError: HandleServerError = ({ error, event }) => {
  console.error('🔥 --- RAW SSR ERROR DETECTED --- 🔥');
  console.error(`Path: ${event.url.pathname}`);

  // Dump the raw error object so we can actually see what's crashing
  console.dir(error, { depth: null });

  console.error('------------------------------------');

  // This is what gets passed to your +error.svelte page
  return {
    message: 'Internal Error',
  };
};

export const handle: Handle = async ({ event, resolve }) => {
  const start = Date.now();
  const method = event.request.method;
  const path = event.url.pathname;

  // Read and verify the __session cookie on every request
  const user = await verifySessionCookie(event.cookies, {
    request: event.request,
    url: event.url,
  });
  event.locals.user = user ?? undefined;

  // Read theme from cookie store
  event.locals.theme = getCookie('theme', { cookies: event.cookies }) ?? 'dark';

  logger.info('hooks', `${method} ${path}`, { uid: user?.uid, theme: event.locals.theme });

  // Inject data-theme into <html> for page routes
  // Skip for 'system' — client-side JS resolves prefers-color-scheme
  let response;
  try {
    response = await resolve(event, {
      transformPageChunk: ({ html }) => {
        const theme = event.locals.theme;
        return html.replace('<html', `<html data-theme="${theme}"`);
      },
    });
  } catch (e) {
    logger.error(
      'hooks',
      `${method} ${path} — SSR error`,
      e instanceof Error ? e.stack : String(e),
    );
    throw e;
  }

  logger.info('hooks', `${method} ${path} → ${response.status} (${Date.now() - start}ms)`);

  // Prevent CDN caching of SSR HTML (contains user-specific avatar/session data)
  if (response.headers.get('content-type')?.startsWith('text/html')) {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    response.headers.set('Vary', 'Cookie');
  }

  return response;
};
