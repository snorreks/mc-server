#!/usr/bin/env bun

// scripts/src/lib/setup/firebase_hosting_setup.ts
//
// Sets up Firebase Hosting for the frontend, rewriting all traffic to Cloud Run.
// Creates a dedicated hosting site and deploys a temp config with security headers.
// The deploy config is written to scripts/.local-data/ (gitignored).
//
// Usage:
//   bun run scripts/src/lib/setup/firebase_hosting_setup.ts
//   bun run scripts/src/lib/setup/firebase_hosting_setup.ts --dry-run

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fmt, hasFlag, run } from '../cli_utils';
import { PROJECT_ID, VM_ZONE } from '../deployment_config';
import type { Check } from './project';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../../../');

const REGION = VM_ZONE.replace(/-[a-z]$/, '');
const SERVICE_NAME = PROJECT_ID;
const SITE_ID = PROJECT_ID; // default hosting site (PROJECT_ID.web.app)
const TEMP_CONFIG_PATH = 'scripts/.local-data/hosting-config.json';

const FIREBASE_CLI = ['bunx', 'firebase-tools'];

// ── Config generation ───────────────────────────────────────────────────────

function generateHostingConfig() {
  return {
    hosting: {
      site: SITE_ID,
      public: resolve(ROOT, 'frontend/build/client'),
      ignore: ['firebase.json', '**/.*', '**/node_modules/**'],
      headers: [
        {
          source: '**',
          headers: [
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=63072000; includeSubDomains; preload',
            },
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
            {
              key: 'Content-Security-Policy',
              value:
                "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.firebaseapp.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebaseapp.com https://www.googletagmanager.com https://www.google-analytics.com; frame-src 'self' https://*.firebaseapp.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none';",
            },
            { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          ],
        },
        {
          source: '/_app/immutable/**',
          headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
        },
        {
          source: '**/*.@(avif|gif|ico|jpeg|jpg|png|svg|webp|woff|woff2|css|js)',
          headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }],
        },
      ],
      rewrites: [
        {
          source: '**',
          run: {
            serviceId: SERVICE_NAME,
            region: REGION,
          },
        },
      ],
    },
  };
}

// ── Main ────────────────────────────────────────────────────────────────────

export async function setupFirebaseHosting(
  projectId: string,
  dryRun: boolean,
  verbose = false,
): Promise<{ checks: Check[] }> {
  const checks: Check[] = [];

  console.log(fmt.section('Firebase Hosting'));

  // Check Firebase auth first
  const {
    code: authCode,
    out: authOut,
    err: authErr,
  } = await run(['bunx', 'firebase-tools', 'login:list']);
  if (verbose) {
    if (authOut) console.log(fmt.note(authOut));
    if (authErr) console.log(fmt.note(authErr));
  }
  if (authCode !== 0) {
    console.log(fmt.warn('Not logged into Firebase. Run: bunx firebase-tools login'));
    checks.push({
      name: 'Hosting: Firebase auth',
      status: 'error',
      detail: 'Run: bunx firebase-tools login',
    });
    return { checks };
  }

  // Deploy hosting config to default site (PROJECT_ID.web.app)
  const hostingConfig = generateHostingConfig();
  console.log(fmt.note(`Deploying to default hosting → ${PROJECT_ID}.web.app`));
  console.log(fmt.note(`Writing temp config to ${TEMP_CONFIG_PATH}`));

  if (!dryRun) {
    await Bun.write(TEMP_CONFIG_PATH, `${JSON.stringify(hostingConfig, null, 2)}\n`);
    checks.push({ name: 'Hosting: temp config', status: 'missing', fixed: true });

    console.log(fmt.fix('Deploying hosting config...'));
    const firebaseArgs = [
      ...FIREBASE_CLI,
      'deploy',
      '--only',
      'hosting',
      `--project=${projectId}`,
      `--config=${TEMP_CONFIG_PATH}`,
    ];
    if (verbose) firebaseArgs.push('--debug');
    const { code, out, err } = await run(firebaseArgs);

    if (code === 0) {
      console.log(fmt.ok(`Hosting deployed → ${SITE_ID} → ${SERVICE_NAME} (${REGION})`));
      if (verbose && out) console.log(fmt.note(out));
      checks.push({ name: 'Hosting: deployed', status: 'ok' });
    } else {
      console.error(fmt.err('Deploy failed'));
      console.error(fmt.err(`exit code: ${code}`));
      if (err) console.error(fmt.err(err.slice(0, 2000)));
      if (out) console.log(fmt.note(out.slice(0, 1000)));
      checks.push({ name: 'Hosting: deployed', status: 'error', detail: err });
      if (err) console.error(fmt.note(err));
      checks.push({ name: 'Hosting: deployed', status: 'error', detail: err });
    }
  } else {
    console.log(fmt.fix(`Would write ${TEMP_CONFIG_PATH} and deploy (dry-run)`));
    checks.push({ name: 'Hosting: temp config', status: 'missing', fixed: true });
  }

  return { checks };
}

// ── Standalone entry ────────────────────────────────────────────────────────
if (import.meta.main) {
  const dryRun = hasFlag(Bun.argv.slice(2), 'dry-run');
  const verbose = Bun.argv.includes('--verbose');

  console.log(fmt.head(`Firebase Hosting → Cloud Run — ${PROJECT_ID}`));
  if (dryRun) console.log(fmt.warn('Dry-run — no changes will be made.\n'));

  const { checks } = await setupFirebaseHosting(PROJECT_ID, dryRun, verbose);
  const errors = checks.filter((c) => c.status === 'error');
  if (errors.length > 0) process.exit(1);
}
