#!/usr/bin/env bun
// scripts/src/lib/ops/upload-assets.ts
// Upload Minecraft server config files to the VM's /data directory.
// Files in assets/minecraft/ are copied to /data on the VM.

import { fmt } from '../cli_utils';
import { PROJECT_ID, VM_INSTANCE, VM_ZONE } from '../deployment_config';

const ASSETS_DIR = 'assets/minecraft';
const REMOTE_PATH = '/mnt/disks/data';

const assets = Bun.file(ASSETS_DIR);
if (!(await assets.exists())) {
  console.log(fmt.warn(`${ASSETS_DIR}/ not found — nothing to upload`));
  process.exit(0);
}

const files = Array.from(new Bun.Glob('**/*').scanSync({ cwd: ASSETS_DIR, absolute: false }));

if (files.length === 0) {
  console.log(fmt.warn(`No files in ${ASSETS_DIR}/`));
  process.exit(0);
}

console.log(fmt.section('Uploading assets to VM'));
for (const file of files) {
  const local = `${ASSETS_DIR}/${file}`;
  const target = `${VM_INSTANCE}:${REMOTE_PATH}/${file}`;

  console.log(fmt.fix(`${local} → ${target}`));
  const { code } = await Bun.spawn(
    [
      'gcloud',
      'compute',
      'scp',
      '--recurse',
      `--project=${PROJECT_ID}`,
      `--zone=${VM_ZONE}`,
      local,
      target,
      '--quiet',
    ],
    { stdio: ['inherit', 'inherit', 'inherit'] },
  ).exited;

  if (code !== 0) {
    console.error(fmt.err(`Failed to upload ${file}`));
  }
}

console.log(fmt.ok('Upload complete'));
