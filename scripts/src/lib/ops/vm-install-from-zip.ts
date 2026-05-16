#!/usr/bin/env bun
/**
 * scripts/src/lib/ops/vm-install-from-zip.ts
 *
 * Installs a modpack from a user-provided zip file.
 *
 * 1. Cleans /data (keeps world, server.properties, server-icon.png, mc-backup.sh, rconcmds.txt)
 * 2. Uploads the zip
 * 3. Extracts it into /data/mods + /data/config + overrides
 * 4. Removes client-side mods
 * 5. Fixes permissions
 *
 * Usage:
 *   bun run scripts/src/lib/ops/vm-install-from-zip.ts /path/to/modpack.zip
 */

import { existsSync } from 'node:fs';
import { fmt, run } from '../cli_utils';
import { PROJECT_ID, VM_INSTANCE, VM_ZONE } from '../deployment_config';

const zipPath = Bun.argv[2];
if (!zipPath || !existsSync(zipPath)) {
  console.log(fmt.head('Install modpack from zip'));
  console.log('Usage: bun run scripts/src/lib/ops/vm-install-from-zip.ts /path/to/modpack.zip');
  process.exit(1);
}

const filename = zipPath.split('/').pop();
const SSH = `gcloud compute ssh ${VM_INSTANCE} --zone=${VM_ZONE} --project=${PROJECT_ID}`;

async function sh(command: string) {
  const { code, out, err } = await run([...SSH.split(' '), `--command=${command}`, '--quiet']);
  return { code, out, err };
}

async function main() {
  console.log(fmt.head('Install modpack from zip'));

  // 1. Clean /data — keep only essentials
  console.log(fmt.section('Clean /data'));
  const keep = [
    'world',
    'world_nether',
    'world_the_end',
    'server.properties',
    'server-icon.png',
    'mc-backup.sh',
    'rconcmds.txt',
    'banned-ips.json',
    'banned-players.json',
    'ops.json',
    'whitelist.json',
    'usercache.json',
    'eula.txt',
    'lost+found',
  ];

  // Move keep-files to temp, nuke everything else, restore keep-files
  const cleanCmd = [
    'mkdir -p /tmp/keep && ',
    ...keep.map(
      (f) => `[ -e "/mnt/disks/data/${f}" ] && mv /mnt/disks/data/${f} /tmp/keep/ 2>/dev/null; `,
    ),
    'rm -rf /mnt/disks/data/* /mnt/disks/data/.* 2>/dev/null; ',
    'mv /tmp/keep/* /mnt/disks/data/ 2>/dev/null; ',
    'rmdir /tmp/keep; ',
    'echo CLEAN_DONE',
  ].join('');

  const { out: cleanOut } = await sh(cleanCmd);
  console.log(cleanOut);
  console.log(fmt.ok('Cleaned /data (kept world + config)'));

  // 2. Upload the zip
  console.log(fmt.section('Upload zip'));
  const { code: scpCode } = await run([
    'gcloud',
    'compute',
    'scp',
    zipPath,
    `${VM_INSTANCE}:/tmp/modpack.zip`,
    `--zone=${VM_ZONE}`,
    `--project=${PROJECT_ID}`,
    '--quiet',
  ]);
  if (scpCode !== 0) {
    console.error(fmt.err('Upload failed'));
    process.exit(1);
  }
  console.log(fmt.ok(`${filename} uploaded`));

  // 3. Extract into container
  console.log(fmt.section('Extract'));
  // Copy zip into container, unzip there
  const zipCopyCmd = [
    'ZIPNAME=$(basename /tmp/modpack.zip .zip); ',
    'docker cp /tmp/modpack.zip $(docker ps -q):/tmp/modpack.zip && ',
    'docker exec $(docker ps -q) sh -c "',
    '  cd /tmp && unzip -o /tmp/modpack.zip -d /tmp/modpack_extracted > /dev/null 2>&1; ',
    '  echo EXTRACTED; ',
    '  ls /tmp/modpack_extracted/',
    '"',
  ].join('');
  const { out: extractOut } = await sh(zipCopyCmd);
  console.log(extractOut);
  console.log(fmt.ok('Zip extracted'));

  // 4. Copy mods + config + overrides into /data
  console.log(fmt.section('Install'));
  const installCmd = [
    'docker exec $(docker ps -q) sh -c "',
    '  SRC=/tmp/modpack_extracted; ',
    '  DATA=/data; ',
    '  # If the zip has a single top-level dir, go inside it',
    '  SUB=$(ls "$SRC" 2>/dev/null | head -1); ',
    '  [ -d "$SRC/$SUB" ] && [ "$(ls "$SRC" | wc -l)" = 1 ] && SRC=$SRC/$SUB; ',
    '  echo Source: $SRC; ls $SRC; ',
    '  # Copy mods',
    '  [ -d "$SRC/mods" ] && cp -r $SRC/mods/* $DATA/mods/ 2>/dev/null && echo MODS_COPIED; ',
    '  # Copy config',
    '  [ -d "$SRC/config" ] && cp -r $SRC/config/* $DATA/config/ 2>/dev/null && echo CONFIG_COPIED; ',
    '  # Copy kubejs, scripts, defaultconfigs',
    '  for d in kubejs scripts defaultconfigs; do',
    '    [ -d "$SRC/$d" ] && cp -r $SRC/$d $DATA/ 2>/dev/null && echo $d COPIED; ',
    '  done; ',
    '  # Copy overrides from manifest',
    '  [ -d "$SRC/overrides" ] && cp -r $SRC/overrides/* $DATA/ 2>/dev/null && echo OVERRIDES_COPIED; ',
    '  chown -R minecraft:minecraft $DATA/mods $DATA/config $DATA/kubejs $DATA/defaultconfigs 2>/dev/null; ',
    '  echo INSTALL_DONE; ',
    '  ls $DATA/mods/*.jar 2>/dev/null | wc -l; echo mods; ',
    '"',
  ].join(' ');
  const { out: installOut } = await sh(installCmd);
  console.log(installOut);

  // 5. Remove client-side mods
  console.log(fmt.section('Remove client-side mods'));
  const clientMods = [
    'badoptimizations',
    'betterbiomereblend',
    'betterf3',
    'betterfpsdist',
    'blur-forge',
    'cinematiczoom',
    'craftpresence',
    'crashassistant-forge',
    'createbetterfps',
    'drippyloadingscreen',
    'dynamiccrosshair',
    'ding',
    'enhancedvisuals',
    'enhanced_boss_bars',
    'entityculling-forge',
    'entity_model_features',
    'entity_texture_features',
    'extrasounds',
    'euphoriapatcher',
    'fancymenu',
    'gpumemleakfix',
    'immediatelyfast-forge',
    'itemphysiclite',
    'make_bubbles_pop',
    'melody_forge',
    'oculus-flywheel-compat',
    'oculus-mc',
    'particle_core',
    'perception-forge',
    'radium-mc',
    'rubidium-extra',
    'shouldersurfing-forge',
    'simplemenu',
    'skinlayers3d-forge',
    'sodiumdynamiclights',
    'sodiumextras',
    'sodiumoptionsapi',
    'visuality-forge',
    'visual_keybinder',
    'yungsmenutweaks',
  ];

  const removeCmd = [
    'docker exec $(docker ps -q) sh -c "',
    '  count=0;',
    ...clientMods.map(
      (m) => `  for f in /data/mods/*${m}*; do [ -f "$f" ] && rm "$f" && count=$((count+1)); done;`,
    ),
    '  echo "Removed $count client mods";',
    '  echo "Total: $(ls /data/mods/*.jar 2>/dev/null | wc -l) mods";',
    '"',
  ].join(' ');
  const { out: removeOut } = await sh(removeCmd);
  console.log(removeOut);

  // 6. Cleanup temp
  console.log(fmt.section('Cleanup'));
  await sh('rm -f /tmp/modpack.zip');
  await sh('docker exec $(docker ps -q) rm -rf /tmp/modpack.zip /tmp/modpack_extracted');
  console.log(fmt.ok('Temp files cleaned'));

  console.log(fmt.head('Done'));
  console.log(fmt.note('Restart the container to load new mods: bun run vm:restart'));
}

await main();
