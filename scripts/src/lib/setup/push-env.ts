#!/usr/bin/env bun
// scripts/src/lib/setup/push-env.ts
//
// Pushes secrets from frontend/.env to Netlify environment variables.
// Uses the Netlify REST API directly — site_id is a query param, not path.
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
const NETLIFY_API = 'https://api.netlify.com/api/v1';

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

function getAuthToken(): string {
  const fromEnv = process.env.NETLIFY_AUTH_TOKEN;
  if (fromEnv) return fromEnv;

  const home = process.env.HOME || process.env.USERPROFILE || '';
  const configPaths = [
    resolve(home, '.config/netlify/config.json'),
    resolve(home, '.netlify/config.json'),
  ];
  for (const configPath of configPaths) {
    try {
      const config = JSON.parse(Bun.spawnSync(['cat', configPath]).stdout.toString());
      const firstUser = Object.values(config.users || {})[0] as
        | { auth?: { token?: string } }
        | undefined;
      if (firstUser?.auth?.token) return firstUser.auth.token;
    } catch {
      /* try next */
    }
  }
  throw new Error('No Netlify auth token. Run `ntl login` first, or set NETLIFY_AUTH_TOKEN.');
}

interface SiteInfo {
  id: string;
  name: string;
  account_slug: string;
}

async function getSite(token: string, siteName: string): Promise<SiteInfo> {
  const res = await fetch(`${NETLIFY_API}/sites?filter=all&per_page=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to list sites: ${res.status}`);
  const sites = (await res.json()) as SiteInfo[];
  const site = sites.find((s: { name: string }) => s.name === siteName);
  if (!site) throw new Error(`Site "${siteName}" not found`);
  return site;
}

async function setEnvVar(token: string, site: SiteInfo, key: string, value: string): Promise<void> {
  // Delete existing first (to wipe all old contexts/values)
  const delUrl = `${NETLIFY_API}/accounts/${site.account_slug}/env/${encodeURIComponent(key)}?site_id=${site.id}`;
  // Ignore 404 on delete (var might not exist yet)
  await fetch(delUrl, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });

  // Create with POST /accounts/{account_slug}/env?site_id={site_id}
  const createUrl = `${NETLIFY_API}/accounts/${site.account_slug}/env?site_id=${site.id}`;
  const body = [
    {
      key,
      values: [{ context: 'all', value }],
      // Minimal payload — scopes default to "all" on free plan
      // Omitting scopes/secret to avoid 403 on free accounts
    },
  ];

  const res = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text.slice(0, 300)}`);
  }
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
    console.log(`  ${c.bold}${key}${c.reset}: ${Buffer.byteLength(value, 'utf-8')} bytes`);
  }
  const total = pairs.reduce(
    (s, { key, value }) => s + Buffer.byteLength(key + '=' + value, 'utf-8'),
    0,
  );
  console.log(
    `  ${c.dim}Combined: ${total} bytes (${(total / 1024).toFixed(2)} KB) — Lambda limit is 4 KB${c.reset}`,
  );
  if (total < 4096) {
    console.log(fmt.ok(`Under Lambda 4 KB limit by ${((4096 - total) / 1024).toFixed(2)} KB`));
  } else {
    console.warn(fmt.warn(`Total exceeds Lambda's 4 KB limit!`));
  }

  if (dryRun) {
    console.log(fmt.section('Dry run — would run'));
    for (const { key } of pairs) {
      console.log(`  POST /accounts/{slug}/env?site_id={id} — ${key}`);
    }
    return;
  }

  // 4. Auth
  console.log(fmt.section('Pushing to Netlify'));
  let token: string;
  try {
    token = getAuthToken();
    console.log(fmt.ok('Authenticated'));
  } catch (e) {
    console.error(fmt.err(`${e}`));
    process.exit(1);
  }

  // 5. Find site
  let site: SiteInfo;
  try {
    site = await getSite(token, 'agmcs');
    console.log(fmt.ok(`Site: ${site.name} (${site.id})`));
  } catch (e) {
    console.error(fmt.err(`${e}`));
    process.exit(1);
  }

  // 6. Push each var (delete + create to ensure "all" context)
  for (const { key, value } of pairs) {
    try {
      console.log(fmt.note(`Setting ${key} (${Buffer.byteLength(value, 'utf-8')} bytes)...`));
      await setEnvVar(token, site, key, value);
      console.log(fmt.ok(`${key} set`));
    } catch (e) {
      console.error(fmt.err(`Failed to set ${key}: ${e}`));
      process.exit(1);
    }
  }

  console.log(fmt.ok('Done! Redeploy your site for the new env vars to take effect.'));
}

await main();
