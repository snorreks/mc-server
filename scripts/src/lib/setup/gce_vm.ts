#!/usr/bin/env bun

// scripts/src/lib/setup/gce_vm.ts
// Create the Minecraft server GCE VM with Docker modpack support.
// Uses Container-Optimized OS with the itzg/minecraft-server image.
// For CurseForge modpacks, set CF_API_KEY in scripts/.env

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fmt, gcloud, run } from '../cli_utils';
import { MC_MEMORY, PROJECT_ID, VM_INSTANCE, VM_ZONE } from '../deployment_config';
import type { Check } from './project';
import { IP_NAME } from './static_ip';

export type { Check };

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../../..');
const MACHINE_TYPE = 'n2-highmem-4'; // 4 vCPU, 32 GB RAM
const DATA_DISK_SIZE = '50GB';

async function getStaticIp(): Promise<string | null> {
  const region = VM_ZONE.replace(/-[a-z]$/, '');
  const { out } = await run([
    'gcloud',
    'compute',
    'addresses',
    'describe',
    IP_NAME,
    `--project=${PROJECT_ID}`,
    `--region=${region}`,
    '--format=value(address)',
    '--quiet',
  ]);
  return out.trim() || null;
}

async function instanceExists(): Promise<boolean> {
  const { code } = await gcloud(
    'compute',
    'instances',
    'describe',
    VM_INSTANCE,
    `--project=${PROJECT_ID}`,
    `--zone=${VM_ZONE}`,
  );
  return code === 0;
}

async function diskExists(name: string): Promise<boolean> {
  const { code } = await gcloud(
    'compute',
    'disks',
    'describe',
    name,
    `--project=${PROJECT_ID}`,
    `--zone=${VM_ZONE}`,
  );
  return code === 0;
}

export async function setupGceVm(dryRun: boolean): Promise<{ checks: Check[] }> {
  const checks: Check[] = [];
  console.log(fmt.section('GCE VM Instance (Docker + Modpack)'));

  const ip = await getStaticIp();
  if (!ip) {
    console.log(fmt.err('Static IP not found — run static IP setup first'));
    checks.push({ name: 'GCE VM', status: 'error', detail: 'No static IP' });
    return { checks };
  }

  const exists = await instanceExists();
  if (exists) {
    console.log(fmt.ok(`VM "${VM_INSTANCE}" already exists`));
    checks.push({ name: `GCE VM: ${VM_INSTANCE}`, status: 'ok' });

    // Show update-container command as a manual step
    console.log(fmt.note('To update the Docker container, run:'));
    console.log(
      fmt.cmd(
        `gcloud compute instances update-container ${VM_INSTANCE} --zone=${VM_ZONE} --project=${PROJECT_ID} --container-name=mc --container-env-file=scripts/.env --container-image=itzg/minecraft-server:latest`,
      ),
    );
    return { checks };
  }

  // Check for Docker data disk
  const dataDiskName = `${VM_INSTANCE}-data`;
  const hasDataDisk = await diskExists(dataDiskName);

  if (!dryRun) {
    if (!hasDataDisk) {
      console.log(fmt.fix(`Creating data disk "${dataDiskName}"...`));
      const diskResult = await run([
        'gcloud',
        'compute',
        'disks',
        'create',
        dataDiskName,
        `--project=${PROJECT_ID}`,
        `--zone=${VM_ZONE}`,
        `--size=${DATA_DISK_SIZE}`,
        '--type=pd-ssd',
        '--quiet',
      ]);
      if (diskResult.code !== 0) {
        console.log(fmt.err(`Failed to create data disk: ${diskResult.err}`));
        checks.push({ name: 'GCE VM disk', status: 'error', detail: diskResult.err });
        return { checks };
      }
      console.log(fmt.ok(`Data disk "${dataDiskName}" created`));
      checks.push({ name: 'GCE VM disk', status: 'missing', fixed: true });
    }

    console.log(fmt.fix(`Creating VM "${VM_INSTANCE}" with Docker (this takes ~2 min)...`));

    // Build container env vars from config and scripts/.env
    // The startup script runs docker run with proper port publishing
    // (konlet agent is deprecated and breaks port bindings)
    const IMAGE = 'itzg/minecraft-server:java17-jdk';

    const startupScript = [
      '#!/bin/bash',
      'set -euo pipefail',
      '',
      '# Mount data disk',
      'DISK=/dev/disk/by-id/scsi-0Google_PersistentDisk_data',
      'MNT=/mnt/disks/data',
      'if [ -e "$DISK" ] && ! grep -qs "$MNT" /proc/mounts; then',
      '  mkdir -p "$MNT"',
      '  if ! blkid "$DISK" 2>/dev/null; then',
      '    mkfs.ext4 -m 0 -E lazy_itable_init=0,lazy_journal_init=0,discard "$DISK"',
      '  fi',
      '  mount -o discard,defaults "$DISK" "$MNT"',
      'fi',
      '',
      '# Remove konlet-created containers (they have no port publishing)',
      'docker rm -f $(docker ps -a -q --filter "name=klt-") 2>/dev/null || true',
      '',
      '# Start Minecraft container with proper port publishing + JVM flags',
      'docker stop mc-server 2>/dev/null || true',
      'docker rm mc-server 2>/dev/null || true',
      `docker run -d --name mc-server --restart=always \\`,
      '  -p 25575:25575 \\',
      '  -p 25565:25565 \\',
      '  -e EULA=TRUE \\',
      '  -e RCON_PASSWORD=minecraft \\',
      '  -e ENABLE_RCON=true \\',
      '  -e TYPE=FORGE \\',
      '  -e ALLOW_FLIGHT=true \\',
      '  -e MAX_TICK_TIME=-1 \\',
      `  -e MEMORY=${MC_MEMORY} \\`,
      `  -e JVM_OPTS='-XX:+UseZGC -XX:+AlwaysPreTouch -XX:+ZProactive -XX:+DisableExplicitGC' \\`,
      '  -v /mnt/disks/data:/data \\',
      `  ${IMAGE}`,
      '',
      'echo "Startup script complete: mc-server started with port publishing"',
    ].join('\n');

    const startupScriptPath = resolve(ROOT, 'scripts/.local-data/startup-mount-data.sh');
    await Bun.write(startupScriptPath, startupScript);

    const createArgs = [
      'gcloud',
      'compute',
      'instances',
      'create',
      VM_INSTANCE,
      `--project=${PROJECT_ID}`,
      `--zone=${VM_ZONE}`,
      `--machine-type=${MACHINE_TYPE}`,
      '--tags=minecraft-server',
      `--address=${ip}`,
      '--boot-disk-type=pd-ssd',
      '--boot-disk-size=20GB',
      `--create-disk=name=${dataDiskName},device-name=data,auto-delete=no,mode=rw`,
      `--metadata-from-file=startup-script=${startupScriptPath}`,
      '--quiet',
    ];

    const result = await run(createArgs);
    if (result.code !== 0) {
      console.log(fmt.err(`Failed to create VM: ${result.err}`));
      checks.push({ name: `GCE VM: ${VM_INSTANCE}`, status: 'error', detail: result.err });
      return { checks };
    }

    console.log(fmt.ok(`VM "${VM_INSTANCE}" created with Docker modpack`));
    checks.push({ name: `GCE VM: ${VM_INSTANCE}`, status: 'missing', fixed: true });
  } else {
    console.log(fmt.fix(`Would create VM "${VM_INSTANCE}" with Docker (dry-run)`));
    checks.push({ name: `GCE VM: ${VM_INSTANCE}`, status: 'missing', fixed: true });
  }

  return { checks };
}
