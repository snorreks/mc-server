#!/usr/bin/env bun
/**
 * SSH into the Minecraft server VM.
 *
 * Usage:
 *   bun run scripts/src/lib/ops/vm-ssh.ts              # interactive shell
 *   bun run scripts/src/lib/ops/vm-ssh.ts -- "command"  # run a command
 *
 * Examples:
 *   bun run scripts/src/lib/ops/vm-ssh.ts
 *   bun run scripts/src/lib/ops/vm-ssh.ts -- "ls -la /home/minecraft"
 */

import { run } from '../cli_utils';
import { VM_SSH_HOST } from './vm-shared';

const args = Bun.argv.slice(2);
const isCommand = args[0] === '--';

if (isCommand) {
  // Run a single command: gcloud compute ssh <host> --command="..."
  const command = args.slice(1).join(' ');
  const { code, out, err } = await run([
    'gcloud',
    'compute',
    'ssh',
    ...VM_SSH_HOST.split(' '),
    `--command=${command}`,
    '--quiet',
  ]);
  console.log(out);
  if (err) console.error(err);
  process.exit(code);
} else {
  // Interactive shell: gcloud compute ssh <host>
  const { code } = await Bun.spawn(
    ['gcloud', 'compute', 'ssh', ...VM_SSH_HOST.split(' '), '--quiet'],
    {
      stdio: ['inherit', 'inherit', 'inherit'],
    },
  ).exited;
  process.exit(code);
}
