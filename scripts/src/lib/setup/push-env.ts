#!/usr/bin/env bun
// scripts/src/lib/setup/push-env.ts
//
// Pushes secrets from frontend/.env to Netlify environment variables.
// Uses netlify-cli under the hood.
//
// Usage:
//   bun run scripts/src/lib/setup/push-env.ts              # push both secrets
//   bun run scripts/src/lib/setup/push-env.ts --dry-run     # preview only
//   bun run scripts/src/lib/setup/push-env.ts --site=my-site # specify Netlify site

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { c, fmt, hasFlag, run } from '../cli_utils';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../../../');
const FRONTEND_ENV = resolve(ROOT, 'frontend/.env');

/** Keys to push to Netlify, in order */
const KEYS: string[] = ['FIREBASE_SERVICE_ACCOUNT', 'BACKUP_SSH_KEY'];

async function readEnv(path: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const text = await Bun.file(path).text();
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      map.set(trimmed.slice(0, eqIdx).trim(), trimmed.slice(eqIdx + 1).trim());
    }
  } catch {
    /* file doesn't exist */
  }
  return map;
}

async function main() {
  const dryRun = hasFlag(Bun.argv.slice(2), 'dry-run');

  console.log(fmt.head('Push env vars to Netlify'));

  // 1. Read .env
  const env = await readEnv(FRONTEND_ENV);
  if (env.size === 0) {
    console.error(fmt.err(`${FRONTEND_ENV} not found or empty`));
    process.exit(1);
  }

  // 2. Collect values
  const pairs: { key: string; value: string }[] = [];
  for (const key of KEYS) {
    const value = env.get(key);
    if (!value) {
      console.warn(fmt.warn(`${key} not found in .env — skipping`));
      continue;
    }
    pairs.push({ key, value });
  }

  if (pairs.length === 0) {
    console.error(fmt.err('No secrets to push'));
    process.exit(1);
  }

  // 3. Show sizes
  console.log(fmt.section('Secrets'));
  for (const { key, value } of pairs) {
    const sizeKB = (Buffer.byteLength(key + '=' + value, 'utf-8') / 1024).toFixed(2);
    console.log(`  ${c.bold}${key}${c.reset}: ${Buffer.byteLength(value, 'utf-8')} bytes (${sizeKB} KB with key name)`);
  }
  const total = pairs.reduce((sum, { key, value }) => sum + Buffer.byteLength(key + '=' + value, 'utf-8'), 0);
  const totalKB = (total / 1024).toFixed(2);
  console.log(`  ${c.dim}Combined: ${total} bytes (${totalKB} KB) — Lambda limit is 4 KB${c.reset}`);

  if (total >= 4096) {
    console.warn(fmt.warn(`Total (${totalKB} KB) exceeds Lambda's 4 KB limit!`));
  } else {
    console.log(fmt.ok(`Under Lambda 4 KB limit by ${(4096 - total) / 1024} KB`));
  }

  // 4. Push to Netlify
  if (dryRun) {
    console.log(fmt.section('Dry run — would run'));
    for (const { key } of pairs) {
      console.log(fmt.fix(`netlify env:set ${key} <${key.length} chars>`));
    }
    return;
  }

  // Check that netlify CLI is available
  const { code: whichCode } = await run(['which', 'netlify']);
  if (whichCode !== 0) {
    console.error(fmt.err('netlify CLI not found. Run: bun add -d netlify-cli'));
    process.exit(1);
  }

  console.log(fmt.section('Pushing to Netlify'));
  for (const { key, value } of pairs) {
    console.log(fmt.note(`Setting ${key}...`));
    // Use '--' to stop oclif flag parsing — the value may start with dashes
    // (e.g. the SSH key: -----BEGIN OPENSSH PRIVATE KEY-----)
    const { code, err } = await run(['netlify', 'env:set', key, '--', value]);
    if (code === 0) {
      console.log(fmt.ok(`${key} set`));
    } else {
      console.error(fmt.err(`Failed to set ${key}: ${err}`));
      process.exit(1);
    }
  }

  console.log(fmt.ok('Done — redeploy your site for the new env vars to take effect'));
}

await main();
