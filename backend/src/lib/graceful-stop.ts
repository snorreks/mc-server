/**
 * Graceful Minecraft server shutdown for the daily scheduler:
 *   1. save-all via RCON
 *   2. stop via RCON
 *   3. wait for server to flush and shut down
 *
 * Shares the same logic as frontend/src/lib/server/graceful-stop.ts.
 */

import { createConnection } from 'node:net';
import { VM_IP } from '../../../config';

const RCON_HOST = VM_IP;
const RCON_PORT = 25575;
const RCON_PASSWORD = process.env.RCON_PASSWORD || 'minecraft';
const SHUTDOWN_WAIT_MS = 15_000;

// ── Minimal RCON client (self-contained, no external deps) ─────────────────

function createPacket(id: number, type: number, body: string): Buffer {
  const payload = Buffer.from(body, 'utf-8');
  const packet = Buffer.alloc(14 + payload.length);
  packet.writeInt32LE(10 + payload.length, 0);
  packet.writeInt32LE(id, 4);
  packet.writeInt32LE(type, 8);
  payload.copy(packet, 12);
  packet.writeInt16LE(0, 12 + payload.length);
  return packet;
}

function readPacket(data: Buffer): { id: number; type: number; body: string } | null {
  if (data.length < 14) return null;
  const length = data.readInt32LE(0);
  const id = data.readInt32LE(4);
  const type = data.readInt32LE(8);
  const body = data.subarray(12, length + 4 - 2).toString('utf-8');
  return { id, type, body };
}

function rconCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = createConnection(RCON_PORT, RCON_HOST);

    client.on('connect', () => {
      client.write(createPacket(1, 3, RCON_PASSWORD));
    });

    const chunks: Buffer[] = [];
    let authenticated = false;
    let cmdSent = false;

    const timeout = setTimeout(() => {
      client.destroy();
      reject(new Error('RCON timeout'));
    }, 5000);

    client.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      const data = Buffer.concat(chunks);

      if (!authenticated) {
        const pkt = readPacket(data);
        if (pkt && !cmdSent && pkt.id === 1) {
          if (pkt.type === 2) {
            authenticated = true;
            chunks.length = 0;
            client.write(createPacket(2, 2, command));
            cmdSent = true;
          } else {
            clearTimeout(timeout);
            client.destroy();
            reject(new Error('RCON authentication failed'));
          }
        }
      } else if (cmdSent) {
        const pkt = readPacket(data);
        if (pkt && (pkt.type === 0 || pkt.type === 2)) {
          clearTimeout(timeout);
          client.destroy();
          resolve(pkt.body.trim());
        }
      }
    });

    client.on('error', (e: NodeJS.ErrnoException) => {
      clearTimeout(timeout);
      client.destroy();
      reject(e);
    });
  });
}

// ── Graceful stop ──────────────────────────────────────────────────────────

export async function gracefulStopMc(): Promise<void> {
  // Step 0: Broadcast a fun warning to all players
  try {
    const messages = [
      "㋡ Server is taking a nap! Finish up what you're doing!",
      "㋡ Oof, bedtime! Save your stuff before I yeet into the void!",
      "㋡ Going dark in a bit — log off or get lost in the sauce!",
      "㋡ Server ded. Not big surprise. (kidding, just a restart!)",
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];
    await rconCommand(`say ${msg}`);
    console.log(`[scheduler] graceful-stop: broadcast sent — ${msg}`);
  } catch (e) {
    console.warn('[scheduler] graceful-stop: broadcast failed (no players online or server off)', String(e));
  }

  // Brief pause so players see the message
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Step 1: Save the world
  try {
    console.log('[scheduler] graceful-stop: running save-all flush...');
    const saveResult = await rconCommand('save-all flush');
    console.log(`[scheduler] graceful-stop: save-all done — ${saveResult.slice(0, 200)}`);
  } catch (e) {
    console.warn('[scheduler] graceful-stop: save-all failed (server may be offline)', String(e));
  }

  // Step 2: Tell the server to stop
  try {
    console.log('[scheduler] graceful-stop: sending stop command...');
    // Fire-and-forget — the TCP connection drops when the MC server exits
    rconCommand('stop').catch(() => {});
    console.log(`[scheduler] graceful-stop: waiting ${SHUTDOWN_WAIT_MS / 1000}s for shutdown...`);
    await new Promise((resolve) => setTimeout(resolve, SHUTDOWN_WAIT_MS));
  } catch (e) {
    console.warn('[scheduler] graceful-stop: stop connection dropped (expected)', String(e));
  }
}
