#!/usr/bin/env bun
/**
 * scripts/src/lib/ops/vm-console.ts
 *
 * Opens an interactive shell inside the Minecraft Docker container.
 *
 * Usage:
 *   bun run scripts/src/lib/ops/vm-console.ts
 */

import { VM_SSH_HOST } from './vm-shared';

const { code } = await Bun.spawn(
  [
    'gcloud',
    'compute',
    'ssh',
    ...VM_SSH_HOST.split(' '),
    '--quiet',
    '--',
    '-t',
    'docker exec -it $(docker ps -q | head -1) bash',
  ],
  { stdio: ['inherit', 'inherit', 'inherit'] },
).exited;

process.exit(code);
