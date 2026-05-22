// $lib/server/rcon.ts — thin wrapper around shared/rcon.ts with logger integration.
// Delegates the actual RCON protocol to the shared root-level module.

import { rconCommand as _rconCommand } from '$shared/rcon';
import { logger } from '$logger';

export async function rconCommand(command: string): Promise<string> {
  return _rconCommand(command, {
    log: (level, msg, meta) => {
      if (level === 'debug') logger.debug('rcon', msg, meta);
      else if (level === 'error') logger.error('rcon', msg, { error: meta });
    },
  });
}
