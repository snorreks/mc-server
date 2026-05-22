// shared/rcon.ts — RCON client for Minecraft server commands.
// Shared by frontend (Cloud Run) and backend (Firebase Functions).
// Connects via TCP to the VM's RCON port (25575).

import { createConnection } from 'node:net';
import { VM_IP } from '../config.js';

export const RCON_HOST = VM_IP;
export const RCON_PORT = 25575;
export const RCON_PASSWORD = process.env.RCON_PASSWORD || 'minecraft';

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

export async function rconCommand(command: string, opts?: {
  log?: (level: string, msg: string, meta?: unknown) => void;
  timeoutMs?: number;
}): Promise<string> {
  const log = opts?.log;
  const timeoutMs = opts?.timeoutMs ?? 5000;

  return new Promise((resolve, reject) => {
    log?.('debug', `connecting to ${RCON_HOST}:${RCON_PORT} for "${command}"`);

    const client = createConnection(RCON_PORT, RCON_HOST);

    client.on('connect', () => {
      log?.('debug', 'TCP connection established, sending auth packet');
      client.write(createPacket(1, 3, RCON_PASSWORD));
    });

    const chunks: Buffer[] = [];
    let authenticated = false;
    let cmdSent = false;

    const timeout = setTimeout(() => {
      client.destroy();
      const msg = `RCON timeout after ${timeoutMs}ms (${command})`;
      log?.('error', msg);
      reject(new Error(msg));
    }, timeoutMs);

    client.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      const data = Buffer.concat(chunks);

      if (!authenticated) {
        const pkt = readPacket(data);
        if (pkt) {
          if (!cmdSent && pkt.id === 1) {
            if (pkt.type === 2) {
              authenticated = true;
              chunks.length = 0;
              log?.('debug', 'auth OK, sending command');
              client.write(createPacket(2, 2, command));
              cmdSent = true;
            } else {
              clearTimeout(timeout);
              client.destroy();
              const msg = `RCON auth failed (type=${pkt.type})`;
              log?.('error', msg);
              reject(new Error(msg));
            }
          }
        }
      } else if (cmdSent) {
        const pkt = readPacket(data);
        if (pkt && (pkt.type === 0 || (pkt.type === 2 && authenticated))) {
          clearTimeout(timeout);
          client.destroy();
          log?.('debug', `← ${command}`, { body: pkt.body.trim().slice(0, 200) });
          resolve(pkt.body.trim());
        }
      }
    });

    client.on('error', (e: NodeJS.ErrnoException) => {
      clearTimeout(timeout);
      client.destroy();
      const msg = `${e.code || e.message} (${RCON_HOST}:${RCON_PORT})`;
      log?.('error', msg);
      reject(e);
    });
  });
}
