// $lib/server/rcon.ts — RCON client for Minecraft server commands.
//
// Instead of connecting to RCON port directly (Docker doesn't publish it),
// SSHs into the VM as mc-backup and runs `docker exec rcon-cli` inside
// the container. The itzg/minecraft-server image includes rcon-cli.

import { Client } from 'ssh2';
import { VM_IP } from '$config';
import { env } from '$env/dynamic/private';
import { logger } from '$logger';

const RCON_HOST = VM_IP;
const SSH_USER = 'mc-backup';
const SSH_PORT = 22;

function getSshKey(): string {
  const encoded = env.BACKUP_SSH_KEY;
  if (!encoded) throw new Error('BACKUP_SSH_KEY env var not set');
  return Buffer.from(encoded, 'base64').toString('utf-8');
}

function sshExec(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const stdout: string[] = [];

    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          reject(err);
          return;
        }
        stream.on('close', (code: number) => {
          conn.end();
          if (code === 0) {
            resolve(stdout.join('').trim());
          } else {
            reject(
              new Error(
                `rcon-cli exited with code ${code}: ${stdout.join('').slice(0, 200)}`,
              ),
            );
          }
        });
        stream.on('data', (data: Buffer) => {
          stdout.push(data.toString());
        });
        stream.stderr.on('data', (data: Buffer) => {
          stdout.push(`[stderr] ${data.toString()}`);
        });
      });
    });

    conn.on('error', (e) => {
      reject(e);
    });

    conn.connect({
      host: RCON_HOST,
      port: SSH_PORT,
      username: SSH_USER,
      privateKey: getSshKey(),
      readyTimeout: 10000,
    });
  });
}

export async function rconCommand(command: string): Promise<string> {
  logger.debug('rcon', `→ ${command} (via SSH docker exec rcon-cli)`);
  const start = Date.now();

  // mc-backup is in the docker group — runs docker directly
  const sshCommand = `docker exec $(docker ps -q --filter 'name=mc') rcon-cli "${command}"`;

  try {
    const output = await sshExec(sshCommand);
    const elapsed = Date.now() - start;
    logger.debug('rcon', `← ${command} (${elapsed}ms)`, { output: output.slice(0, 200) });
    return output;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('rcon', `RCON via SSH failed: ${msg}`);
    throw e;
  }
}
