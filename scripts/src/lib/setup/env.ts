#!/usr/bin/env bun
// scripts/src/lib/setup/env.ts
//
// Interactive setup for .env files.
// Prompts for Firebase public config and service account, writes to frontend/.env.
//
// Usage:
//   bun run scripts/src/lib/setup/env.ts

import { c, confirm, fmt, readMultiLine } from '../cli_utils';
import type { Check } from './project';

const ROOT_CONFIG = '../../../config.ts';
const FRONTEND_ENV = 'frontend/.env';
const SCRIPTS_ENV = 'scripts/.env';

// ── Input parsing ────────────────────────────────────────────────────────────

/**
 * Extracts a JSON-like object from raw text.
 * Handles JS object literals (unquoted keys) by quoting them before parsing.
 * Accepts both:
 *   - firebaseConfig = { apiKey: "...", ... }
 *   - { "type": "service_account", ... }
 */
function extractJsonObject(raw: string): Record<string, unknown> | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  let block = raw.slice(start, end + 1);

  // Quote unquoted keys (after { or ,)
  block = block.replace(/([{,]\s*)([a-zA-Z_$][\w$]*)\s*:/g, '$1"$2":');

  try {
    const parsed = JSON.parse(block);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore — not valid JSON even after fixing
  }
  return null;
}

// ── Env writing ──────────────────────────────────────────────────────────────

async function writeEnvFile(path: string, vars: Record<string, string>): Promise<void> {
  const file = Bun.file(path);
  let lines: string[] = [];

  if (await file.exists()) {
    lines = (await file.text()).split('\n');
  }

  const remaining = new Map(Object.entries(vars));

  // Update existing keys
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    if (remaining.has(key)) {
      lines[i] = `${key}=${remaining.get(key)}`;
      remaining.delete(key);
    }
  }

  // Append new keys
  for (const [key, value] of remaining) {
    lines.push(`${key}=${value}`);
  }

  const content = `${lines.join('\n').replace(/\n+$/, '')}\n`;
  await Bun.write(path, content);
}

// ── Main setup ───────────────────────────────────────────────────────────────

export async function setupEnv(dryRun: boolean): Promise<{ checks: Check[] }> {
  const checks: Check[] = [];

  console.log(fmt.head('Environment (.env) Setup'));
  console.log(
    "This will prompt for your Firebase credentials. You'll need:\n" +
      '  • Public config   → firebaseConfig object from Firebase Console\n' +
      '  • Service account → JSON key from Firebase Console > Project Settings > Service Accounts\n',
    '  Tip: Paste the code in browser first, then copy it again, it will force the code to be a one liner \n',
  );

  if (!confirm('Set up .env files now?', true)) {
    console.log(fmt.warn('Skipped env setup.'));
    checks.push({ name: 'Env files', status: 'missing' });
    return { checks };
  }

  // ── 1. Public Firebase config ────────────────────────────────────────────
  console.log(fmt.section('Public Firebase Config'));

  const configAdded = confirm('Add public Firebase config (PUBLIC_FIREBASE_*)?', true);

  if (configAdded) {
    console.log(fmt.note('Paste your firebaseConfig object from the Firebase Console.'));
    console.log(fmt.note('Example format:'));
    console.log(
      fmt.cmd(
        'firebaseConfig = { apiKey: "AIza...", authDomain: "...", projectId: "...", storageBucket: "...", messagingSenderId: "...", appId: "...", measurementId: "..." }',
      ),
    );
    console.log();

    const rawInput = await readMultiLine('Paste the firebaseConfig');
    const config = extractJsonObject(rawInput);

    if (!config) {
      console.log(fmt.err('Could not parse input. Make sure it contains a valid { ... } object.'));
      checks.push({ name: 'Env: firebaseConfig', status: 'error' });
    } else {
      const keyMap: Record<string, string> = {
        apiKey: 'PUBLIC_FIREBASE_API_KEY',
        authDomain: 'PUBLIC_FIREBASE_AUTH_DOMAIN',
        storageBucket: 'PUBLIC_FIREBASE_STORAGE_BUCKET',
        messagingSenderId: 'PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
        appId: 'PUBLIC_FIREBASE_APP_ID',
        measurementId: 'PUBLIC_FIREBASE_MEASUREMENT_ID',
      };

      const vars: Record<string, string> = {};
      for (const [src, dest] of Object.entries(keyMap)) {
        if (config[src] != null) {
          vars[dest] = String(config[src]);
        }
      }

      if (Object.keys(vars).length === 0) {
        console.log(fmt.warn('No recognized keys found.'));
        checks.push({ name: 'Env: firebaseConfig', status: 'error', detail: 'No recognized keys' });
      } else {
        console.log(`${c.dim}Will write to config.ts:${c.reset}`);
        for (const [k, v] of Object.entries(vars)) {
          console.log(`  ${c.bold}${k}${c.reset}=${v}`);
        }

        if (!dryRun) {
          // Write to config.ts by replacing the FIREBASE_CONFIG block
          const configPath = new URL(ROOT_CONFIG, import.meta.url).pathname;
          let configContent = await Bun.file(configPath).text();

          const firebaseConfigBlock = [
            'export const FIREBASE_CONFIG = {',
            `  apiKey: '${vars.PUBLIC_FIREBASE_API_KEY ?? ''}',`,
            `  authDomain: '${vars.PUBLIC_FIREBASE_AUTH_DOMAIN ?? ''}',`,
            `  storageBucket: '${vars.PUBLIC_FIREBASE_STORAGE_BUCKET ?? ''}',`,
            `  messagingSenderId: '${vars.PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? ''}',`,
            `  appId: '${vars.PUBLIC_FIREBASE_APP_ID ?? ''}',`,
            '};',
          ].join('\n');

          configContent = configContent.replace(
            /export const FIREBASE_CONFIG = \{[^}]+\};/,
            firebaseConfigBlock,
          );

          await Bun.write(configPath, configContent);
          console.log(fmt.ok('Public Firebase config saved to config.ts.'));
          checks.push({ name: 'Env: firebaseConfig', status: 'ok' });
        } else {
          console.log(fmt.fix(`Would write to ${FRONTEND_ENV} (dry-run)`));
          checks.push({ name: 'Env: firebaseConfig', status: 'missing', fixed: true });
        }
      }
    }
  }

  // ── 2. Service account ────────────────────────────────────────────────────
  console.log(fmt.section('Service Account'));

  const saAdded = confirm('Add FIREBASE_SERVICE_ACCOUNT?', true);

  if (saAdded) {
    console.log(
      fmt.note(
        'Paste the service account JSON. You can paste the entire key file content or just the relevant fields.',
      ),
    );
    console.log(
      fmt.url(
        `https://console.firebase.google.com/project/agmcs2025/settings/serviceaccounts/adminsdk`,
      ),
    );
    console.log();

    const rawInput = await readMultiLine('Paste service account JSON');
    let sa: Record<string, unknown> | null = null;

    try {
      sa = JSON.parse(rawInput);
    } catch {
      sa = extractJsonObject(rawInput);
    }

    if (!sa || typeof sa !== 'object') {
      console.log(fmt.err('Could not parse service account JSON.'));
      checks.push({ name: 'Env: service account', status: 'error' });
    } else {
      const required = ['project_id', 'private_key', 'client_email'];
      const missing = required.filter((k) => !(k in (sa ?? {})));
      if (missing.length > 0) {
        console.log(fmt.err(`Missing required keys: ${missing.join(', ')}`));
        checks.push({
          name: 'Env: service account',
          status: 'error',
          detail: `Missing: ${missing.join(', ')}`,
        });
      } else {
        const payload = {
          type: sa.type ?? 'service_account',
          project_id: sa.project_id,
          private_key_id: sa.private_key_id ?? '',
          private_key: sa.private_key,
          client_email: sa.client_email,
          client_id: sa.client_id ?? '',
          auth_uri: sa.auth_uri ?? 'https://accounts.google.com/o/oauth2/auth',
          token_uri: sa.token_uri ?? 'https://oauth2.googleapis.com/token',
          auth_provider_x509_cert_url:
            sa.auth_provider_x509_cert_url ?? 'https://www.googleapis.com/oauth2/v1/certs',
          client_x509_cert_url: sa.client_x509_cert_url ?? '',
          universe_domain: sa.universe_domain ?? 'googleapis.com',
        };
        const saValue = JSON.stringify(payload);

        const truncated = `${saValue.slice(0, 60)}…`;
        console.log(`${c.dim}Will write FIREBASE_SERVICE_ACCOUNT to:${c.reset}`);
        console.log(`  ${FRONTEND_ENV}  → ${truncated}`);
        console.log(`  ${SCRIPTS_ENV}   → ${truncated}`);

        if (!dryRun) {
          const vars = { FIREBASE_SERVICE_ACCOUNT: saValue };
          await writeEnvFile(FRONTEND_ENV, vars);
          await writeEnvFile(SCRIPTS_ENV, vars);
          console.log(fmt.ok('Service account saved.'));
          checks.push({ name: 'Env: service account', status: 'ok' });
        } else {
          console.log(fmt.fix('Would write service account (dry-run)'));
          checks.push({ name: 'Env: service account', status: 'missing', fixed: true });
        }
      }
    }
  }

  return { checks };
}

// ── Standalone entry ────────────────────────────────────────────────────────
if (import.meta.main) {
  const dryRun = Bun.argv.includes('--dry-run');
  console.log(fmt.head('Set up .env'));
  await setupEnv(dryRun);
}
