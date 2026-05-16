#!/usr/bin/env bun
/**
 * Upload files/directories to the Minecraft server VM.
 *
 * Uses gcloud compute scp under the hood.
 *
 * Usage:
 *   bun run scripts/src/lib/ops/vm-upload.ts <local-path> [remote-path]
 *
 * Examples:
 *   bun run scripts/src/lib/ops/vm-upload.ts ./vm-files/server.properties
 *   bun run scripts/src/lib/ops/vm-upload.ts ./vm-files/ /home/minecraft/
 *
 * The default remote path is /home/minecraft/.
 * Trailing slash on directories matters — same as scp behaviour.
 */

import { c, fmt } from '../cli_utils';
import { VM_SSH_HOST } from './vm-shared';

const args = Bun.argv.slice(2).filter((a) => !a.startsWith('--'));

if (args.length < 1) {
  console.log(fmt.head('Upload files to the MC Server VM'));
  console.log(`\n${c.bold}Usage:${c.reset}`);
  console.log(fmt.cmd('bun run scripts/src/lib/ops/vm-upload.ts <local-path> [remote-path]'));
  console.log(`\n${c.bold}Examples:${c.reset}`);
  console.log(fmt.cmd('bun run scripts/src/lib/ops/vm-upload.ts ./vm-files/server.properties'));
  console.log(fmt.cmd('bun run scripts/src/lib/ops/vm-upload.ts ./vm-files/ /home/minecraft/'));
  process.exit(1);
}

const [localSrc, ...rest] = args;
const remoteDest = rest.join(' ') || '/home/minecraft/';

// gcloud compute scp expects: <local> <host>:<remote>
const target = `${VM_SSH_HOST}:${remoteDest}`;

console.log(fmt.section('Upload'));
console.log(fmt.ok(`From: ${localSrc}`));
console.log(fmt.ok(`To:   ${target}`));

const { code } = await Bun.spawn(
  [
    'gcloud',
    'compute',
    'scp',
    '--recurse',
    ...VM_SSH_HOST.split(' ').slice(0, 1), // just the instance name
    localSrc,
    target,
    '--quiet',
  ],
  {
    stdio: ['inherit', 'inherit', 'inherit'],
  },
).exited;

if (code === 0) {
  console.log(fmt.ok('Upload complete'));
} else {
  console.error(fmt.err(`Upload failed (exit ${code})`));
}
process.exit(code);
