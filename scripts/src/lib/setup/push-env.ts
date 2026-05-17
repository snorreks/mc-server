#!/usr/bin/env bun
// scripts/src/lib/setup/push-env.ts
//
// Pushes secrets from frontend/.env to Netlify environment variables.
//
// Usage:
//   bun run push-env              # push both secrets
//   bun run push-env --dry-run    # preview only

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { c, fmt, hasFlag } from '../cli_utils';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../../../');
const FRONTEND_ENV = resolve(ROOT, 'frontend/.env');

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
  } catch { /* file doesn't exist */ }
  return map;
}

function findNetlifyCli(): string {
  // Walk up from the scripts dir to find node_modules/.bin/netlify
  let dir = __dirname;
  for (let i = 0; i < 5; i++) {
    const candidate = resolve(dir, 'node_modules', '.bin', 'netlify');
    if (Bun.spawnSync(['test', '-x', candidate]).exitCode === 0) return candidate;
    dir = resolve(dir, '..');
  }
  // Fall back to PATH
  return 'netlify';
}

async function main() {
  const dryRun = hasFlag(Bun.argv.slice(2), 'dry-run');
  const netlifyBin = findNetlifyCli();

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
    console.log(`  ${c.bold}${key}${c.reset}: ${Buffer.byteLength(value, 'utf-8')} bytes`);
  }
  const total = pairs.reduce((s, { key, value }) => s + Buffer.byteLength(key + '=' + value, 'utf-8'), 0);
  console.log(`  ${c.dim}Combined: ${total} bytes (${(total / 1024).toFixed(2)} KB) — Lambda limit is 4 KB${c.reset}`);
  if (total < 4096) {
    console.log(fmt.ok(`Under Lambda 4 KB limit by ${((4096 - total) / 1024).toFixed(2)} KB`));
  } else {
    console.warn(fmt.warn(`Total exceeds Lambda's 4 KB limit!`));
  }

  if (dryRun) {
    console.log(fmt.section('Dry run — would run'));
    for (const { key } of pairs) {
      console.log(`  echo '<value>' | ${netlifyBin} env:set ${key}`);
    }
    console.log(fmt.note('Then: trigger a Netlify deploy'));
    return;
  }

  // 4. Push each env var via stdin (avoids CLI flag-parsing issues with values starting with -)
  console.log(fmt.section('Pushing to Netlify'));
  for (const { key, value } of pairs) {
    console.log(fmt.note(`Setting ${key} (${Buffer.byteLength(value, 'utf-8')} bytes)...`));
    const proc = Bun.spawn([netlifyBin, 'env:set', key], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...process.env, NETLIFY_SITE_ID: undefined }, // let auto-detect work
    });
    proc.stdin.write(value);
    proc.stdin.end();

    const out = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();
    const code = await proc.exited;

    if (code === 0) {
      console.log(fmt.ok(`${key} set`));
    } else {
      console.error(fmt.err(`Failed to set ${key}: ${err || out}`));
      process.exit(1);
    }
  }

  console.log(fmt.ok('Done! Redeploy your site for the new env vars to take effect.'));
}

await main();
