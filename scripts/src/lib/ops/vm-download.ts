#!/usr/bin/env bun
/**
 * Download files/directories from the Minecraft server VM.
 *
 * Uses gcloud compute scp under the hood.
 *
 * Usage:
 *   bun run scripts/src/lib/ops/vm-download.ts <remote-path> [local-path]
 *
 * Examples:
 *   bun run scripts/src/lib/ops/vm-download.ts /home/minecraft/server.properties .
 *   bun run scripts/src/lib/ops/vm-download.ts /home/minecraft/world ./backups/
 *
 * The default local path is the current directory.
 * Trailing slash on directories matters — same as scp behaviour.
 */

import { c, fmt } from '../cli_utils';
import { VM_SSH_HOST } from './vm-shared';

const args = Bun.argv.slice(2).filter((a) => !a.startsWith('--'));

if (args.length < 1) {
  console.log(fmt.head('Download files from the MC Server VM'));
  console.log(`\n${c.bold}Usage:${c.reset}`);
  console.log(fmt.cmd('bun run scripts/src/lib/ops/vm-download.ts <remote-path> [local-path]'));
  console.log(`\n${c.bold}Examples:${c.reset}`);
  console.log(
    fmt.cmd('bun run scripts/src/lib/ops/vm-download.ts /home/minecraft/server.properties .'),
  );
  console.log(
    fmt.cmd('bun run scripts/src/lib/ops/vm-download.ts /home/minecraft/world ./backups/'),
  );
  process.exit(1);
}

const [remoteSrc, ...rest] = args;
const localDest = rest.join(' ') || '.';

// gcloud compute scp expects: <host>:<remote> <local>
const source = `${VM_SSH_HOST}:${remoteSrc}`;

console.log(fmt.section('Download'));
console.log(fmt.ok(`From: ${source}`));
console.log(fmt.ok(`To:   ${localDest}`));

const { code } = await Bun.spawn(
  [
    'gcloud',
    'compute',
    'scp',
    '--recurse',
    ...VM_SSH_HOST.split(' ').slice(0, 1),
    source,
    localDest,
    '--quiet',
  ],
  {
    stdio: ['inherit', 'inherit', 'inherit'],
  },
).exited;

if (code === 0) {
  console.log(fmt.ok('Download complete'));
} else {
  console.error(fmt.err(`Download failed (exit ${code})`));
}
process.exit(code);
