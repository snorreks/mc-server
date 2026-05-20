#!/usr/bin/env bun
/**
 * scripts/src/lib/setup/firebase-hosting.ts
 *
 * Generates a local firebase.hosting.local.json with:
 *   - Cloud Run rewrite (mc-server-frontend in europe-west1)
 *   - Cache-Control: no-store on SSR pages (fixes CDN user-data leak)
 *   - CSP with Firebase Auth + YouTube frame-src
 *   - Immutable cache for _app/immutable/**
 *
 * This file is gitignored — it contains project-specific service names.
 * Run as part of the setup flow, or manually when the service name changes.
 *
 * Usage:
 *   bun run scripts/src/lib/setup/firebase-hosting.ts
 */

import { existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fmt } from '../cli_utils';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../../..');
const FRONTEND = resolve(ROOT, 'frontend');

/** Change this if you rename the Cloud Run service */
const CLOUD_RUN_SERVICE = 'mc-server-frontend';
const CLOUD_RUN_REGION = 'europe-west1';
const FIREBASE_SITE = 'agmcs2026';

function generateConfig(): string {
  return JSON.stringify(
    {
      hosting: {
        site: FIREBASE_SITE,
        public: 'build/client',
        ignore: ['firebase.json', '**/.*', '**/node_modules/**'],
        headers: [
          {
            source: '**',
            headers: [
              { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
              { key: 'X-Frame-Options', value: 'DENY' },
              { key: 'X-Content-Type-Options', value: 'nosniff' },
              { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
              { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
              {
                key: 'Content-Security-Policy',
                value:
                  "default-src 'self'; " +
                  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.firebaseapp.com https://www.youtube.com https://s.ytimg.com; " +
                  "style-src 'self' 'unsafe-inline'; " +
                  "img-src 'self' data: https:; " +
                  "font-src 'self' data:; " +
                  "connect-src 'self' https://*.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseapp.com; " +
                  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://accounts.google.com https://*.firebaseapp.com; " +
                  "object-src 'none'; base-uri 'self'; frame-ancestors 'none';",
              },
              { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
              // Force CDN + browser to never cache SSR pages (contains user-specific data)
              { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate, private' },
            ],
          },
          {
            source: '**/*.@(avif|gif|ico|jpeg|jpg|png|svg|webp|woff|woff2|css|js)',
            headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }],
          },
          {
            source: '/_app/immutable/**',
            headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
          },
        ],
        rewrites: [
          {
            source: '**',
            run: {
              serviceId: CLOUD_RUN_SERVICE,
              region: CLOUD_RUN_REGION,
            },
          },
        ],
      },
    },
    null,
    2,
  );
}

async function main() {
  console.log(fmt.head('Firebase Hosting Config Setup'));

  const outPath = resolve(FRONTEND, 'firebase.hosting.local.json');
  if (existsSync(outPath)) {
    console.log(fmt.note(`Local config already exists at ${outPath}`));
    console.log(fmt.note('Delete it and re-run to regenerate.'));
    process.exit(0);
  }

  const config = generateConfig();
  writeFileSync(outPath, config + '\n');
  console.log(fmt.ok(`Created ${outPath}`));
  console.log(fmt.section('Config'));
  console.log(fmt.note(`  Cloud Run service: ${CLOUD_RUN_SERVICE}`));
  console.log(fmt.note(`  Region: ${CLOUD_RUN_REGION}`));
  console.log(fmt.note(`  Firebase site: ${FIREBASE_SITE}`));
  console.log(fmt.note(`  SSR Cache-Control: no-cache, no-store, must-revalidate, private`));
  console.log('');
  console.log(fmt.section('Add to .gitignore'));
  console.log(fmt.note('Make sure firebase.hosting.local.json is in .gitignore'));
  console.log('');
  console.log(fmt.section('Deploy'));
  console.log(fmt.note('Use the local config with:'));
  console.log('');
  console.log('  cd backend && firebase deploy --config ../frontend/firebase.hosting.local.json --only hosting');
  console.log('');
  console.log('Or the deploy-all.ts script will auto-prefer the .local.json if it exists.');
}

await main();
