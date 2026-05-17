import { json } from '@sveltejs/kit';
import { rconCommand } from '$lib/server/rcon';
import { getServerInfo } from '$lib/server/server-info';
import { logger } from '$logger';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  logger.debug('server-info', 'fetching server info via RCON');

  try {
    const raw = await rconCommand('list');
    logger.debug('server-info', 'raw RCON output', { raw: raw.slice(0, 300) });

    const playerMatch = raw.match(/There are (\d+) of a max of (\d+)/i);

    if (!playerMatch) {
      logger.warn('server-info', 'could not parse player count from RCON output', {
        raw: raw.slice(0, 200),
      });
    }

    const base = await getServerInfo();
    const info = {
      ...base,
      online: playerMatch ? Number(playerMatch[1]) : 0,
      max: playerMatch ? Number(playerMatch[2]) : 20,
    };

    logger.info('server-info', 'served', info);
    return json(info);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('server-info', `RCON failed: ${msg}`);
    if (msg.includes('timeout')) {
      logger.warn('server-info', 'RCON timeout — server may be starting or off');
    }
    if (msg.includes('ECONNREFUSED') || msg.includes('Connection refused')) {
      logger.warn('server-info', 'RCON connection refused — server is off or RCON disabled');
    }
    return json({ error: 'Server unreachable' }, { status: 500 });
  }
};
