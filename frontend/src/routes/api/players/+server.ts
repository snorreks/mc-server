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
  try {
    const output = await rconCommand('list');
    const names = parseList(output);

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
    logger.error('players', 'rcon failed', e);
    return json({ players: [], count: 0, error: 'Server unreachable' }, { status: 500 });
  }
};
