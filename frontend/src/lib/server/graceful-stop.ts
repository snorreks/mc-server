// $lib/server/graceful-stop.ts — delegates to shared/graceful-stop.ts.
// Wires in the logger from the frontend and the shared RCON client.

import { gracefulStopMc as _gracefulStopMc } from '$shared/graceful-stop';
import { rconCommand } from '$shared/rcon';
import { logger } from '$logger';

export async function gracefulStopMc(): Promise<void> {
  return _gracefulStopMc({
    rcon: (cmd: string) => rconCommand(cmd),
    log: {
      info: (module, msg, meta) => logger.info(module, msg, meta),
      warn: (module, msg, meta) => logger.warn(module, msg, meta),
      debug: (module, msg, meta) => logger.debug(module, msg, meta),
    },
  });
}
