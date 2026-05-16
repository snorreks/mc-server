// $lib/server/rcon.ts — simple RCON client for Minecraft server commands.
// Connects via TCP to the VM's RCON port (25575).
import { createConnection } from 'node:net';
import { VM_IP } from '$config';
import { logger } from '$logger';

const RCON_HOST = VM_IP;
const RCON_PORT = 25575;
const RCON_PASSWORD = process.env.RCON_PASSWORD || 'minecraft';

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

export async function rconCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    logger.debug('rcon', `→ ${command}`);

    const client = createConnection(RCON_PORT, RCON_HOST);
    const chunks: Buffer[] = [];
    let authenticated = false;
    let cmdSent = false;

    const timeout = setTimeout(() => {
      client.destroy();
      logger.error('rcon', `timeout after 5000ms (${command})`);
      reject(new Error('RCON timeout'));
    }, 5000);

    client.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      const data = Buffer.concat(chunks);

      if (!authenticated) {
        const pkt = readPacket(data);
        if (pkt && pkt.type === 2 && pkt.id === 1) {
          authenticated = true;
          chunks.length = 0;
          client.write(createPacket(2, 2, command));
          cmdSent = true;
        }
      } else if (cmdSent) {
        const pkt = readPacket(data);
        if (pkt && (pkt.type === 0 || (pkt.type === 2 && authenticated))) {
          clearTimeout(timeout);
          client.destroy();
          const elapsed = Date.now() - start;
          logger.debug('rcon', `← ${command} (${elapsed}ms)`, pkt.body.slice(0, 200));
          resolve(pkt.body.trim());
        }
      }
    });

    client.on('error', (e) => {
      clearTimeout(timeout);
      client.destroy();
      logger.error('rcon', `connection error (${command})`, e);
      reject(e);
    });

    client.write(createPacket(1, 3, RCON_PASSWORD));
  });
}
