import { json } from '@sveltejs/kit';
import { rconCommand } from '$lib/server/rcon';
import { getKnownPlayers } from '$lib/server/firestore';
import { logger } from '$logger';
import { parsePlayerList } from '$shared/utils';
import type { RequestHandler } from './$types';

const MC_HEAD_BASE = 'https://mc-heads.net/avatar';

/** GET /api/players/all — returns online players + all known players with last online */
export const GET: RequestHandler = async () => {
  logger.debug('players/all', 'fetching all players');

  // Get online players via RCON (best-effort)
  let onlineSet = new Set<string>();
  try {
    const output = await rconCommand('list');
    onlineSet = new Set(parsePlayerList(output));
  } catch {
    // Server might be offline — that's fine
  }

  // Get known players from Firestore
  const known = await getKnownPlayers();

  // Merge: known players + mark which are online
  const players = known.map((p) => ({
    name: p.name,
    lastOnline: p.lastOnline,
    avatarUrl: `${MC_HEAD_BASE}/${p.name}/32`,
    online: onlineSet.has(p.name),
  }));

  // Online players not yet in Firestore (first-time joiners)
  for (const name of onlineSet) {
    if (!known.some((p) => p.name === name)) {
      players.push({
        name,
        lastOnline: new Date(),
        avatarUrl: `${MC_HEAD_BASE}/${name}/32`,
        online: true,
      });
    }
  }

  // Sort: online first, then by last online descending
  players.sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1;
    return new Date(b.lastOnline).getTime() - new Date(a.lastOnline).getTime();
  });

  return json({ players, onlineCount: onlineSet.size, totalCount: players.length });
};
