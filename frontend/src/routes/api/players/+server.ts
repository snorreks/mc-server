import { json } from '@sveltejs/kit';
import { rconCommand } from '$lib/server/rcon';
import { recordPlayersOnline } from '$lib/server/firestore';
import { logger } from '$logger';
import { parsePlayerList } from '$shared/utils';
import type { RequestHandler } from './$types';

const MC_HEAD_BASE = 'https://mc-heads.net/avatar';
const KNOWN_PLAYERS: Record<string, string> = {};

export const GET: RequestHandler = async () => {
  logger.debug('players', 'fetching online players via RCON');

  try {
    const output = await rconCommand('list');
    logger.debug('players', 'raw RCON output', { raw: output.slice(0, 300) });

    const names = parsePlayerList(output);
    logger.debug('players', `parsed ${names.length} names`, { names });

    // Record players in Firestore (best-effort, fire-and-forget)
    if (names.length > 0) {
      recordPlayersOnline(names).catch((e) =>
        logger.error('players', 'recordPlayersOnline failed', { error: String(e) }),
      );
    }

    if (names.length === 0 && output.trim()) {
      // RCON returned something but we couldn't parse names from it
      logger.warn('players', 'unexpected RCON output format, returning empty', {
        raw: output.slice(0, 200),
      });
    }

    const result = {
      players: names.map((name) => ({
        name,
        avatarUrl: KNOWN_PLAYERS[name] ?? `${MC_HEAD_BASE}/${name}/32`,
      })),
      count: names.length,
    };

    logger.info('players', `served ${names.length} online`, { names });
    return json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('players', `RCON failed: ${msg}`);
    if (msg.includes('timeout')) {
      logger.warn('players', 'RCON timeout — server may be starting or off');
    }
    if (msg.includes('ECONNREFUSED') || msg.includes('Connection refused')) {
      logger.warn('players', 'RCON connection refused — server is off or RCON disabled');
    }
    return json({ players: [], count: 0, error: 'Server unreachable' }, { status: 500 });
  }
};
