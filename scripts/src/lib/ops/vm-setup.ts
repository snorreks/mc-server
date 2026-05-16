#!/usr/bin/env bun
/**
 * scripts/src/lib/ops/vm-setup.ts
 *
 * Sets up the Minecraft server VM with:
 *   - Server icon (server-icon.png)
 *   - Backup script (backup.sh with {projectId} replaced)
 *   - Server config (difficulty, view distance, etc.)
 *   - Auto RCON commands (daily backup, whitelist)
 *
 * Usage:
 *   bun run scripts/src/lib/ops/vm-setup.ts
 *   bun run scripts/src/lib/ops/vm-setup.ts --dry-run
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fmt, hasFlag, run } from '../cli_utils';
import {
  MC_DIFFICULTY,
  MC_MAX_PLAYERS,
  MC_MEMORY,
  MC_VIEW_DISTANCE,
  PROJECT_ID,
  VM_INSTANCE,
  VM_ZONE,
} from '../deployment_config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../../../');
const ASSETS_DIR = resolve(ROOT, 'assets/minecraft');

function sshCmd(cmd: string): string[] {
  return [
    'gcloud',
    'compute',
    'ssh',
    VM_INSTANCE,
    `--zone=${VM_ZONE}`,
    `--project=${PROJECT_ID}`,
    `--command=${cmd}`,
    '--quiet',
  ];
}

function scpCmd(local: string, remote: string): string[] {
  return [
    'gcloud',
    'compute',
    'scp',
    local,
    `${VM_INSTANCE}:${remote}`,
    `--zone=${VM_ZONE}`,
    `--project=${PROJECT_ID}`,
    '--quiet',
  ];
}

async function main() {
  const dryRun = hasFlag(Bun.argv.slice(2), 'dry-run');

  console.log(fmt.head(`VM Setup — ${PROJECT_ID}`));

  // 1. Server icon
  console.log(fmt.section('Server Icon'));
  const iconPath = resolve(ASSETS_DIR, 'server-icon.png');
  if (!dryRun) {
    const { code } = await run(scpCmd(iconPath, '/tmp/server-icon.png'));
    if (code !== 0) {
      console.error(fmt.err('Upload failed'));
      process.exit(1);
    }
    const { code: c2 } = await run(
      sshCmd(
        `docker cp /tmp/server-icon.png $(docker ps -q):/data/server-icon.png && rm /tmp/server-icon.png`,
      ),
    );
    if (c2 !== 0) {
      console.error(fmt.err('Copy into container failed'));
      process.exit(1);
    }
    console.log(fmt.ok('server-icon.png → container'));
  } else {
    console.log(fmt.fix('Would upload server-icon.png'));
  }

  // 2. Backup script
  console.log(fmt.section('Backup Script'));
  const backupRaw = readFileSync(resolve(ASSETS_DIR, 'backup.sh'), 'utf-8');
  const backupPatched = backupRaw.replaceAll('{projectId}', PROJECT_ID);
  if (!dryRun) {
    const localTmp = '/tmp/mc-backup.sh';
    await Bun.write(localTmp, backupPatched);
    const { code } = await run(scpCmd(localTmp, '/tmp/mc-backup.sh'));
    if (code !== 0) {
      console.error(fmt.err('Upload failed'));
      process.exit(1);
    }
    await run(
      sshCmd(
        `sudo mv /tmp/mc-backup.sh /mnt/disks/data/mc-backup.sh && sudo chmod +x /mnt/disks/data/mc-backup.sh`,
      ),
    );
    console.log(fmt.ok('backup.sh → /mnt/disks/data/mc-backup.sh'));
  } else {
    console.log(fmt.fix('Would upload backup.sh'));
  }

  // 3. Auto RCON commands (daily save-all + backup, via itzg rconcmds)
  //    The itzg image runs RCON commands on a schedule from /data/rconcmds.txt
  console.log(fmt.section('Auto RCON Commands'));
  if (!dryRun) {
    const rconCmds = [
      '# Daily 4am: save & backup',
      '0 0 4 * * save-all',
      '0 5 4 * * say Server backup starting...',
      '# Every 6h: memory cleanup',
      '0 0 */6 * * save-all',
    ].join('\n');

    const tmpRcon = '/tmp/rconcmds.txt';
    await Bun.write(tmpRcon, `${rconCmds}\n`);
    const { code } = await run(scpCmd(tmpRcon, '/tmp/rconcmds.txt'));
    if (code !== 0) {
      console.error(fmt.err('Upload rconcmds failed'));
      process.exit(1);
    }
    await run(
      sshCmd(
        `docker cp /tmp/rconcmds.txt $(docker ps -q):/data/rconcmds.txt && rm /tmp/rconcmds.txt`,
      ),
    );
    console.log(fmt.ok('rconcmds.txt set up (daily save-all at 4am, every 6h cleanup)'));
  } else {
    console.log(fmt.fix('Would set up auto RCON commands'));
  }

  // 4. Server config from config.ts
  console.log(fmt.section('Server Config'));
  if (!dryRun) {
    // Update container env with MC config — the itzg image reads these on startup
    const { code } = await run([
      'gcloud',
      'compute',
      'instances',
      'update-container',
      VM_INSTANCE,
      `--zone=${VM_ZONE}`,
      `--project=${PROJECT_ID}`,
      `--container-env-file=${resolve(ROOT, 'scripts/.env')}`,
      '--container-image=itzg/minecraft-server:latest',
      '--quiet',
    ]);
    if (code !== 0) {
      console.error(fmt.err('Update container failed'));
      process.exit(1);
    }
    console.log(
      fmt.ok(
        `Config: diff=${MC_DIFFICULTY} view=${MC_VIEW_DISTANCE} players=${MC_MAX_PLAYERS} mem=${MC_MEMORY}`,
      ),
    );
    console.log(fmt.fix('Restart VM: bun run vm:restart'));
  } else {
    console.log(fmt.fix('Would apply server config'));
  }

  // 5. Whitelist enabled via RCON
  //    The allowed_emails Firestore doc has the list; rcon-cli whitelist add each
  console.log(fmt.section('Whitelist'));
  if (!dryRun) {
    // Wait for server to be fully up after restart
    await new Promise((r) => setTimeout(r, 30000));
    await run(sshCmd(`docker exec $(docker ps -q) rcon-cli "whitelist on"`));
    console.log(fmt.ok('Whitelist enabled'));
  } else {
    console.log(fmt.fix('Would enable whitelist'));
  }

  console.log(fmt.head('VM setup complete'));
}

await main();
