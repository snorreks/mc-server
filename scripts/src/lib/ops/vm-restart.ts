#!/usr/bin/env bun
/**
 * scripts/src/lib/ops/vm-restart.ts
 *
 * Recreates the Minecraft Docker container with the latest settings
 * (ports, JVM args, environment). Does NOT restart the VM — only the container.
 *
 * Usage:
 *   bun run scripts/src/lib/ops/vm-restart.ts           # recreate container
 *   bun run scripts/src/lib/ops/vm-restart.ts --vm       # full VM restart (slower)
 */

import { fmt, hasFlag, run } from '../cli_utils';
import { PROJECT_ID, VM_INSTANCE, VM_ZONE } from '../deployment_config';

const args = Bun.argv.slice(2);
const restartVm = hasFlag(args, 'vm');
const DRY_RUN = hasFlag(args, 'dry-run');

if (restartVm) {
  // Full VM restart (for kernel/hardware changes)
  console.log(fmt.head('Restarting VM (full reboot)'));
  if (!DRY_RUN) {
    await run(['gcloud', 'compute', 'instances', 'stop', VM_INSTANCE, `--zone=${VM_ZONE}`, `--project=${PROJECT_ID}`, '--quiet']);
    await run(['gcloud', 'compute', 'instances', 'start', VM_INSTANCE, `--zone=${VM_ZONE}`, `--project=${PROJECT_ID}`, '--quiet']);
  }
  console.log(fmt.ok('VM restarted — container will start automatically'));
  process.exit(0);
}

// Container-only restart (fast — doesn't reboot the VM)
console.log(fmt.head('Recreating Docker container'));

// Get the running container name
const { out: containerName } = await run([
  'gcloud',
  'compute',
  'ssh',
  VM_INSTANCE,
  `--zone=${VM_ZONE}`,
  `--project=${PROJECT_ID}`,
  '--command=docker ps -q --filter="name=mc" --latest',
  '--quiet',
]);
const name = containerName.trim() || 'mc-server';

// Read current env from the running container
const { out: envOut } = await run([
  'gcloud',
  'compute',
  'ssh',
  VM_INSTANCE,
  `--zone=${VM_ZONE}`,
  `--project=${PROJECT_ID}`,
  '--quiet',
  '--command=cat /mnt/disks/data/user_jvm_args.txt',
]);
const jvmArgs = envOut.trim() || '-Xmx13G -Xms13G -XX:+UseZGC -XX:+AlwaysPreTouch -XX:+ZProactive -XX:+DisableExplicitGC';

console.log(fmt.note(`Container: ${name}`));
console.log(fmt.note(`JVM args: ${jvmArgs}`));

if (DRY_RUN) {
  console.log(fmt.fix('Would stop, remove, and recreate container'));
  process.exit(0);
}

// Stop + remove old container
console.log(fmt.fix('Stopping old container...'));
await run([
  'gcloud',
  'compute',
  'ssh',
  VM_INSTANCE,
  `--zone=${VM_ZONE}`,
  `--project=${PROJECT_ID}`,
  '--quiet',
  `--command=docker stop ${name} && docker rm ${name}`,
]);

// Start new container with latest settings
console.log(fmt.fix('Starting new container with JVM_OPTS...'));
await run([
  'gcloud',
  'compute',
  'ssh',
  VM_INSTANCE,
  `--zone=${VM_ZONE}`,
  `--project=${PROJECT_ID}`,
  '--quiet',
  `--command=docker run -d --name mc-server --restart=always \
-p 25575:25575 \
-p 25565:25565 \
-e EULA=TRUE \
-e RCON_PASSWORD=minecraft \
-e ENABLE_RCON=true \
-e TYPE=FORGE \
-e REMOVE_OLD_MODS=false \
-e ALLOW_FLIGHT=true \
-e MAX_TICK_TIME=-1 \
-e MEMORY=13G \
-e JVM_OPTS='${jvmArgs}' \
-v /mnt/disks/data:/data \
itzg/minecraft-server:java17-jdk`,
]);

console.log(fmt.ok('Container recreated with latest settings'));
console.log(fmt.note('Server will be ready in a few minutes (modded Forge cold boot)'));
