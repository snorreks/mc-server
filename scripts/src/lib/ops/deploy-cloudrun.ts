#!/usr/bin/env bun
/**
 * Build and deploy the SvelteKit frontend to Google Cloud Run.
 *
 * Usage:
 *   bun run scripts -- deploy-cloudrun
 *
 * Steps:
 *   1. Build the frontend with adapter-node (npm run build)
 *   2. Generate a minimal package.json for the container
 *   3. Build the Docker image and push to Artifact Registry
 *   4. Deploy to Cloud Run
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../../../');
const FRONTEND = resolve(ROOT, 'frontend');
const BUILD = resolve(FRONTEND, 'build');

const PROJECT_ID = 'agmcs2026';
const REGION = 'europe-west1';
const SERVICE_NAME = 'mc-server-frontend';
const IMAGE_NAME = `gcr.io/${PROJECT_ID}/${SERVICE_NAME}`;

function run(cmd: string): string {
  console.log(`\n$ ${cmd}`);
  try {
    const result = execSync(cmd, { cwd: ROOT, encoding: 'utf-8' });
    return (result || '').trim();
  } catch (e: any) {
    if (e.stdout) process.stdout.write(e.stdout);
    if (e.stderr) process.stderr.write(e.stderr);
    throw e;
  }
}

function runQuiet(cmd: string): string {
  try {
    const result = execSync(cmd, { cwd: ROOT, encoding: 'utf-8', stdio: 'pipe' });
    return (result || '').trim();
  } catch {
    return '';
  }
}

async function main() {
  console.log('🚀 Deploy SvelteKit frontend to Google Cloud Run\n');

  // Check auth
  const authCheck = runQuiet('gcloud auth print-access-token');
  if (!authCheck) {
    console.error('❌ Not authenticated. Run: gcloud auth login');
    process.exit(1);
  }
  console.log('  gcloud auth: OK');

  // Step 1: Build the frontend
  console.log('\n📦 Step 1: Building frontend with adapter-node...');
  run('cd frontend && npm run build');

  if (!existsSync(BUILD)) {
    console.error('❌ Build failed: build/ directory not found');
    process.exit(1);
  }
  console.log('  Build output at frontend/build/');

  // Step 2: Generate minimal package.json with only runtime dependencies
  console.log('\n📝 Step 2: Generating minimal package.json...');
  const runtimeDeps: Record<string, string> = {
    'firebase': '^12.13.0',
    'firebase-admin': '^13.10.0',
    'googleapis': '^171.4.0',
    'ssh2': '^1.17.0',
    '@google-cloud/firestore': '^8.6.0',
    'svelte': '5.55.7',
  };
  writeFileSync(
    `${BUILD}/package.json`,
    JSON.stringify({ type: 'module', dependencies: runtimeDeps }, null, 2),
  );
  console.log('  Wrote build/package.json with runtime deps');

  // Step 3: Build and push Docker image
  console.log('\n🐳 Step 3: Building and pushing Docker image...');
  run('gcloud auth configure-docker gcr.io --quiet 2>/dev/null');

  const tag = `${IMAGE_NAME}:${Date.now()}`;
  run(`docker build -t ${tag} -f ${FRONTEND}/Dockerfile ${FRONTEND}`);
  run(`docker tag ${tag} ${IMAGE_NAME}:latest`);
  run(`docker push ${tag}`);
  run(`docker push ${IMAGE_NAME}:latest`);
  console.log(`  Image: ${tag}`);

  // Step 4: Collect env vars from .env
  console.log('\n🔑 Step 4: Collecting environment variables...');
  const envContent = existsSync(`${FRONTEND}/.env`)
    ? readFileSync(`${FRONTEND}/.env`, 'utf-8')
    : '';

  // BACKUP_SSH_KEY
  const envVars: string[] = ['NODE_ENV=production']; // PORT is reserved — Cloud Run sets it automatically

  const backupKeyMatch = envContent.match(/^BACKUP_SSH_KEY=(.+)$/m);
  if (backupKeyMatch?.[1]) {
    envVars.push(`BACKUP_SSH_KEY=${backupKeyMatch[1].trim()}`);
    console.log('  ✓ BACKUP_SSH_KEY');
  } else {
    console.log('  ⚠ BACKUP_SSH_KEY not found in .env');
  }

  // Service account email from FIREBASE_SERVICE_ACCOUNT
  let saEmail = '';
  const firebaseSAMatch = envContent.match(/^FIREBASE_SERVICE_ACCOUNT=(.+)$/m);
  if (firebaseSAMatch?.[1]) {
    try {
      const parsed = JSON.parse(firebaseSAMatch[1]);
      saEmail = parsed.client_email ?? '';
      console.log(`  SA email: ${saEmail}`);
    } catch {
      console.log('  ⚠ Failed to parse FIREBASE_SERVICE_ACCOUNT');
    }
  } else {
    console.log('  ⚠ FIREBASE_SERVICE_ACCOUNT not found in .env');
  }

  // Check if service already exists
  const existing = runQuiet(
    `gcloud run services describe ${SERVICE_NAME} --region ${REGION} --project ${PROJECT_ID} --format='value(name)'`,
  );
  const isFirstDeploy = !existing;

  // Step 5: Deploy to Cloud Run
  console.log('\n☁️ Step 5: Deploying to Cloud Run...');
  const deployCmd = [
    'gcloud run deploy', SERVICE_NAME,
    `--image ${tag}`,
    '--platform managed',
    `--region ${REGION}`,
    `--project ${PROJECT_ID}`,
    '--allow-unauthenticated',
    `--service-account ${saEmail}`,
    '--memory 512Mi',
    '--min-instances 0',
    '--max-instances 10',
    '--concurrency 80',
    '--timeout 300',
    `--set-env-vars "${envVars.join(',')}"`,
  ];

  if (!isFirstDeploy) {
    deployCmd.push('--no-traffic');
    console.log('  (deploying new revision without traffic)');
  }

  run(deployCmd.join(' '));

  // If not first deploy, migrate traffic to the new revision
  if (!isFirstDeploy) {
    console.log('\n🔄 Migrating traffic to latest revision...');
    run(`gcloud run services update-traffic ${SERVICE_NAME} --to-latest --region ${REGION} --project ${PROJECT_ID}`);
  }

  // Clean up
  writeFileSync(`${BUILD}/package.json`, '');
  console.log('  (cleaned up build/package.json)');

  // Get the URL
  const url = runQuiet(
    `gcloud run services describe ${SERVICE_NAME} --region ${REGION} --project ${PROJECT_ID} --format='value(status.url)'`,
  );

  console.log(`\n✅ Deploy complete!`);
  console.log(`   URL: ${url || `https://${SERVICE_NAME}-*-${REGION}.run.app`}`);
}

await main();
