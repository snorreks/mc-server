#!/usr/bin/env bun
/**
 * scripts/src/lib/ops/vm-restart.ts
 *
 * Stops and starts the Minecraft server VM to apply new container config.
 *
 * Usage:
 *   bun run scripts/src/lib/ops/vm-restart.ts
 */

import { fmt, run } from '../cli_utils';
import { PROJECT_ID, VM_INSTANCE, VM_ZONE } from '../deployment_config';

console.log(fmt.head('Restarting VM'));

const { code: stopCode } = await run([
  'gcloud',
  'compute',
  'instances',
  'stop',
  VM_INSTANCE,
  `--zone=${VM_ZONE}`,
  `--project=${PROJECT_ID}`,
  '--quiet',
]);

if (stopCode !== 0) {
  console.error(fmt.err('Failed to stop VM'));
  process.exit(1);
}

const { code: startCode } = await run([
  'gcloud',
  'compute',
  'instances',
  'start',
  VM_INSTANCE,
  `--zone=${VM_ZONE}`,
  `--project=${PROJECT_ID}`,
  '--quiet',
]);

if (startCode !== 0) {
  console.error(fmt.err('Failed to start VM'));
  process.exit(1);
}

console.log(fmt.ok('VM restarted'));
