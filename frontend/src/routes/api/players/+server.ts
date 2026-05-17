import { json } from '@sveltejs/kit';
import { rconCommand } from '$lib/server/rcon';
import { logger } from '$logger';
import type { RequestHandler } from './$types';

const MC_HEAD_BASE = 'https://mc-heads.net/avatar';
const KNOWN_PLAYERS: Record<string, string> = {};

function parseList(text: string): string[] {
  const match = text.match(/There are \d+ of a max of \d+ players online[:\s]*(.*)/i);
  if (!match?.[1]) return [];
  return match[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const GET: RequestHandler = async () => {
  logger.debug('players', 'fetching online players via RCON');

  try {
    const output = await rconCommand('list');
    logger.debug('players', 'raw RCON output', { raw: output.slice(0, 300) });

    const names = parseList(output);
    logger.debug('players', `parsed ${names.length} names`, { names });

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
