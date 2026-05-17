import { json } from '@sveltejs/kit';
import { setCookie } from '$lib/server/cookies';
import { logger } from '$logger';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
  try {
    const body = await event.request.json();
    const { theme } = body;

    if (!theme || typeof theme !== 'string') {
      logger.warn('theme', 'POST missing theme');
      return json({ error: 'Theme is required' }, { status: 400 });
    }

    setCookie('theme', theme, { cookies: event.cookies, maxAge: 365 * 24 * 60 * 60 });

    logger.info('theme', `set to "${theme}"`);
    return json({ success: true });
  } catch (e) {
    logger.error('theme', 'POST failed', e);
    return json({ error: 'Failed to set theme' }, { status: 500 });
  }
};
