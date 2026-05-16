#!/usr/bin/env bun
// scripts/src/lib/ops/deploy-frontend.ts
// Deploy the frontend to Google Cloud Run using source-based deployment.
// Cloud Build handles building the container from source + Dockerfile.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fmt, run } from '../cli_utils';
import { PROJECT_ID, VM_ZONE } from '../deployment_config';

const REGION = VM_ZONE.replace(/-[a-z]$/, '');
const SERVICE_NAME = PROJECT_ID;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../../..');
const FRONTEND_DIR = join(ROOT, 'frontend');
const BUILD_DIR = join(FRONTEND_DIR, 'build');
const ASSETS_DOCKERFILE = join(ROOT, 'assets', 'Bun.Dockerfile');

const args = Bun.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');

async function runOrDie(cmd: string[], label: string): Promise<string> {
  const result = await run(cmd);
  if (VERBOSE) {
    if (result.out) console.log(fmt.note(result.out));
    if (result.err) console.log(fmt.note(result.err));
  }
  if (result.code !== 0) {
    if (!VERBOSE) {
      console.log(fmt.note(`exit code: ${result.code}`));
      if (result.err) console.log(fmt.err(`stderr:\n${result.err}`));
    }
    console.error(fmt.err(`${label} failed`));
    process.exit(1);
  }
  return result.out;
}

async function main() {
  console.log(fmt.head('Deploy frontend to Cloud Run'));
  console.log(fmt.ok(`Project: ${PROJECT_ID}`));
  console.log(fmt.ok(`Service: ${SERVICE_NAME}`));
  console.log(fmt.ok(`Region:  ${REGION}`));
  if (DRY_RUN) console.log(fmt.warn('Dry-run — no changes will be made.\n'));

  // ── Build ──
  console.log(fmt.section('Build'));
  if (!DRY_RUN) {
    await runOrDie(['sh', '-c', `cd '${FRONTEND_DIR}' && bun run build`], 'Frontend build');
  }
  console.log(fmt.ok('Frontend built'));

  // ── Prepare deploy directory ──
  console.log(fmt.section('Prepare deploy source'));
  const frontendPkg = JSON.parse(readFileSync(join(FRONTEND_DIR, 'package.json'), 'utf-8'));
  const runtimeDeps: Record<string, string> = {};
  for (const [name, version] of Object.entries(frontendPkg.dependencies ?? {})) {
    if (typeof version !== 'string') continue;
    runtimeDeps[name] = version;
  }
  if (!DRY_RUN) {
    writeFileSync(
      join(BUILD_DIR, 'package.json'),
      JSON.stringify(
        { name: SERVICE_NAME, type: 'module', private: true, dependencies: runtimeDeps },
        null,
        2,
      ),
    );
    // Copy Dockerfile for Cloud Build to use
    writeFileSync(join(BUILD_DIR, 'Dockerfile'), readFileSync(ASSETS_DOCKERFILE, 'utf-8'));

writeFileSync(join(BUILD_DIR, '.gcloudignore'), "node_modules/\n.git/\n");
  }
  console.log(fmt.ok('Deploy source prepared'));

  // ── Cloud Run (source deploy) ──
  console.log(fmt.section('Cloud Run'));
  if (!DRY_RUN) {
    const out = await runOrDie(
      [
        'gcloud',
        'beta',
        'run',
        'deploy',
        SERVICE_NAME,
        '--source',
        FRONTEND_DIR,
        '--region',
        REGION,
        '--project',
        PROJECT_ID,
        '--memory',
        '2Gi',
        '--cpu',
        '1',
        '--min-instances',
        '0',
        '--max-instances',
        '10',
        '--concurrency',
        '80',
        '--timeout',
        '300',
        '--service-account',
        'firebase-adminsdk-fbsvc@agmcs2026.iam.gserviceaccount.com',
        '--allow-unauthenticated',
        '--set-env-vars',
        'NODE_ENV=production,FIRESTORE_PREFER_REST=true,HOST=0.0.0.0',
        '--execution-environment',
        'gen2',
        '--cpu-boost',
        '--quiet',
      ],
      'Cloud Run deploy',
    );
    console.log(fmt.ok('Deployed to Cloud Run'));
    console.log(fmt.url(out.match(/https:\/\/[^\s]+/)?.[0] ?? ''));
  } else {
    console.log(fmt.fix('Would deploy (dry-run)'));
  }

  console.log(fmt.head('Done'));
}

await main();
