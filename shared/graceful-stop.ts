// shared/graceful-stop.ts — Graceful Minecraft server shutdown.
// Shared by frontend (Cloud Run) and backend (Firebase Functions).
// Takes a logger object with info/warn/debug methods, and an optional rconCommand override.

import { rconCommand as defaultRcon } from './rcon.js';

const SHUTDOWN_WAIT_MS = 15_000;

export type Logger = {
  info: (module: string, msg: string, meta?: unknown) => void;
  warn: (module: string, msg: string, meta?: unknown) => void;
  debug?: (module: string, msg: string, meta?: unknown) => void;
};

const MESSAGES = [
  "㋡ Server is taking a nap! Finish up what you're doing!",
  "㋡ Oof, bedtime! Save your stuff before I yeet into the void!",
  "㋡ Going dark in a bit — log off or get lost in the sauce!",
  "㋡ Server ded. Not big surprise. (kidding, just a restart!)",
];

export async function gracefulStopMc(opts?: {
  rcon?: (cmd: string) => Promise<string>;
  log?: Logger;
}) {
  const rcon = opts?.rcon ?? defaultRcon;
  const log = opts?.log;
  const info = log?.info ?? (() => {});
  const warn = log?.warn ?? console.warn;

  // Step 0: Broadcast a fun warning to all players
  try {
    const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
    await rcon(`say ${msg}`);
    info('rcon', `graceful-stop: broadcast sent — ${msg}`);
  } catch (e) {
    warn('rcon', `graceful-stop: broadcast failed (no players online or server off): ${String(e)}`);
  }

  // Brief pause so players see the message
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Step 1: Save the world
  try {
    info('rcon', 'graceful-stop: running save-all flush...');
    const saveResult = await rcon('save-all flush');
    info('rcon', `graceful-stop: save-all done — ${saveResult.slice(0, 200)}`);
  } catch (e) {
    warn('rcon', `graceful-stop: save-all failed (server may be offline): ${String(e)}`);
  }

  // Step 2: Tell the server to stop
  try {
    info('rcon', 'graceful-stop: sending stop command...');
    // Fire-and-forget — the TCP connection drops when the MC server process exits
    rcon('stop').catch(() => {});
    info('rcon', `graceful-stop: waiting ${SHUTDOWN_WAIT_MS / 1000}s for shutdown...`);
    await new Promise((resolve) => setTimeout(resolve, SHUTDOWN_WAIT_MS));
  } catch (e) {
    warn('rcon', 'graceful-stop: stop connection dropped (expected)');
  }
}
