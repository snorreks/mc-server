#!/usr/bin/env bun
/**
 * scripts/src/lib/ops/upload-modpack.ts
 *
 * Uploads a Prism Launcher modpack export to Firebase Storage.
 *
 * 1. Export your instance from Prism Launcher as a zip
 * 2. Run this script with the path to that zip
 *
 * Usage:
 *   bun run scripts/src/lib/ops/upload-modpack.ts /path/to/valhelsia-6-prism.zip
 *
 * This uploads to: gs://{projectId}.firebasestorage.app/modpack/valhelsia-6-full.zip
 *
 * Prism Launcher:
 *   Right-click instance → Export → "Export as Zip" → save to .zip
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { fmt } from '../cli_utils';
import { PROJECT_ID } from '../deployment_config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../../../');
const DEST_PATH = 'modpack/valhelsia-6-full.zip';

const zipPath = Bun.argv[2];
if (!zipPath) {
  console.log(fmt.head('Upload Prism Launcher modpack to Firebase Storage'));
  console.log('\nUsage:');
  console.log(fmt.cmd('bun run scripts/src/lib/ops/upload-modpack.ts /path/to/modpack.zip'));
  console.log('\nTip: Export from Prism Launcher as "Instance Zip" (not "MR Pack")');
  process.exit(1);
}

if (!existsSync(zipPath)) {
  console.error(fmt.err(`File not found: ${zipPath}`));
  process.exit(1);
}

// Init Firebase Admin
if (!getApps().length) {
  const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!saRaw) {
    console.error(fmt.err('FIREBASE_SERVICE_ACCOUNT env var not set'));
    process.exit(1);
  }
  const sa = JSON.parse(saRaw);
  initializeApp({ credential: cert(sa) });
}

const bucketName = `${PROJECT_ID}.firebasestorage.app`;
console.log(fmt.head(`Upload to ${bucketName}`));

const bucket = getStorage().bucket(bucketName);
const file = bucket.file(DEST_PATH);

console.log(fmt.note(`Uploading ${zipPath}...`));
const size = existsSync(zipPath) ? readFileSync(zipPath).length : 0;

await bucket.upload(zipPath, {
  destination: DEST_PATH,
  metadata: {
    contentType: 'application/zip',
    cacheControl: 'public, max-age=3600',
  },
});

// Make publicly accessible
await file.makePublic();

console.log(fmt.ok(`Uploaded ${(size / 1024 / 1024).toFixed(1)} MB`));
console.log(fmt.note(`Public URL: https://storage.googleapis.com/${bucketName}/${DEST_PATH}`));
console.log(fmt.note('Update frontend/src/lib/client/services/storage.svelte.ts with this URL'));
