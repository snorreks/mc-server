import { json } from '@sveltejs/kit';
import { rconCommand } from '$lib/server/rcon';
import { logger } from '$logger';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    const raw = await rconCommand('list');
    const playerMatch = raw.match(/There are (\d+) of a max of (\d+)/i);

    const info = {
      online: playerMatch ? Number(playerMatch[1]) : 0,
      max: playerMatch ? Number(playerMatch[2]) : 20,
      difficulty: 'normal',
      viewDistance: 12,
      gamemode: 'survival',
    };

    logger.info('server-info', 'served', info);
    return json(info);
  } catch (e) {
    logger.error('server-info', 'rcon failed', e);
    return json({ error: 'Server unreachable' }, { status: 500 });
  }
};
