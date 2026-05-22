/**
 * Graceful Minecraft server shutdown for the daily scheduler.
 * Delegates to shared/graceful-stop.ts with a console-only logger
 * (Firebase Functions don't need the full logger infrastructure).
 */

import { gracefulStopMc as _gracefulStopMc } from '../../../shared/graceful-stop';
import { rconCommand } from '../../../shared/rcon';

export async function gracefulStopMc(): Promise<void> {
  return _gracefulStopMc({
    rcon: (cmd: string) => rconCommand(cmd),
    log: {
      info: (_module, msg) => console.log(msg),
      warn: (_module, msg) => console.warn(msg),
      debug: (_module, msg) => console.debug(msg),
    },
  });
}
