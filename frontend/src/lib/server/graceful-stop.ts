/**
 * Graceful Minecraft server shutdown:
 *   1. save-all via RCON
 *   2. stop via RCON
 *   3. wait for server to flush and shut down
 *
 * Used by both the stop-vm API endpoint and the daily scheduler.
 */

import { rconCommand } from '$lib/server/rcon';
import { logger } from '$logger';

const SHUTDOWN_WAIT_MS = 15_000;

export async function gracefulStopMc(): Promise<void> {
  // Step 0: Broadcast a fun warning to all players
  try {
    const messages = [
      '㋡ Server is taking a nap! Finish up what you\'re doing!',
      '㋡ Oof, bedtime! Save your stuff before I yeet into the void!',
      '㋡ Going dark in a bit — log off or get lost in the sauce!',
      '㋡ Server ded. Not big surprise. (kidding, just a restart!)',
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];
    await rconCommand(`say ${msg}`);
    logger.info('rcon', `graceful-stop: broadcast sent — ${msg}`);
  } catch (e) {
    logger.warn('rcon', 'graceful-stop: broadcast failed (no players online or server off)', {
      error: String(e),
    });
  }

  // Brief pause so players see the message
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Step 1: Save the world
  try {
    logger.info('rcon', 'graceful-stop: running save-all flush...');
    const saveResult = await rconCommand('save-all flush');
    logger.info('rcon', `graceful-stop: save-all done — ${saveResult.slice(0, 200)}`);
  } catch (e) {
    logger.warn('rcon', 'graceful-stop: save-all failed (server may be offline)', {
      error: String(e),
    });
  }

  // Step 2: Tell the server to stop
  try {
    logger.info('rcon', 'graceful-stop: sending stop command...');
    // Fire-and-forget — the TCP connection drops when the MC server process exits
    rconCommand('stop').catch(() => {});
    logger.info('rcon', `graceful-stop: waiting ${SHUTDOWN_WAIT_MS / 1000}s for shutdown...`);
    await new Promise((resolve) => setTimeout(resolve, SHUTDOWN_WAIT_MS));
  } catch (e) {
    logger.warn('rcon', 'graceful-stop: stop connection dropped (expected)', {
      error: String(e),
    });
  }
}
