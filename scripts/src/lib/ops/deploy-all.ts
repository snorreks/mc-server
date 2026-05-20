#!/usr/bin/env bun
/**
 * Full deployment: Build frontend → Deploy Cloud Run → Deploy Firebase Hosting.
 *
 * Usage:
 *   bun run scripts -- deploy-all        # build + deploy both
 *   bun run scripts -- deploy-all --hosting-only   # deploy hosting only (if Cloud Run unchanged)
 *   bun run scripts -- deploy-all --cloudrun-only  # deploy Cloud Run only
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../../../');
const FRONTEND = resolve(ROOT, 'frontend');
const BUILD = resolve(FRONTEND, 'build');
const BACKEND = resolve(ROOT, 'backend');

const PROJECT_ID = 'agmcs2026';
const REGION = 'europe-west1';
const SERVICE_NAME = 'mc-server-frontend';
const IMAGE_NAME = `gcr.io/${PROJECT_ID}/${SERVICE_NAME}`;

const args = process.argv.slice(2);
const hostingOnly = args.includes('--hosting-only');
const cloudrunOnly = args.includes('--cloudrun-only');

function run(cmd: string, cwd = ROOT): string {
  console.log(`\n$ ${cmd}`);
  try {
    const result = execSync(cmd, { cwd, encoding: 'utf-8', stdio: 'pipe' });
    console.log(result?.trim() || '');
    return (result || '').trim();
  } catch (e: any) {
    if (e.stdout) process.stdout.write(e.stdout);
    if (e.stderr) process.stderr.write(e.stderr);
    throw e;
  }
}

function runQuiet(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' }).toString().trim();
  } catch {
    return '';
  }
}

async function main() {
  console.log('🚀 AG Server - Full Deployment\n');

  //
  // Step 1: Build frontend
  //
  console.log('📦 Step 1: Building frontend...');
  run('npm run build', FRONTEND);

  if (!existsSync(BUILD)) {
    console.error('❌ Build failed: build/ directory not found');
    process.exit(1);
  }
  console.log('  ✓ Frontend built at frontend/build/');

  //
  // Step 2: Generate runtime package.json for Docker
  //
  if (!hostingOnly) {
    console.log('\n📝 Step 2: Generating runtime package.json...');
    writeFileSync(
      `${BUILD}/package.json`,
      JSON.stringify(
        {
          type: 'module',
          dependencies: {
            firebase: '^12.13.0',
            'firebase-admin': '^13.10.0',
            googleapis: '^171.4.0',
            ssh2: '^1.17.0',
            '@google-cloud/firestore': '^8.6.0',
            svelte: '5.55.7',
          },
        },
        null,
        2,
      ),
    );
    console.log('  ✓ build/package.json generated');
  }

  //
  // Step 3: Build, push Docker image, deploy Cloud Run
  //
  if (!hostingOnly) {
    console.log('\n🐳 Step 3: Building and pushing Docker image...');
    run('gcloud auth configure-docker gcr.io --quiet 2>/dev/null');

    const tag = `${IMAGE_NAME}:${Date.now()}`;
    run(`docker build -t ${tag} -f ${FRONTEND}/Dockerfile ${FRONTEND}`);
    run(`docker tag ${tag} ${IMAGE_NAME}:latest`);
    run(`docker push ${tag}`);
    run(`docker push ${IMAGE_NAME}:latest`);
    console.log(`  ✓ Image: ${tag}`);

    console.log('\n☁️  Deploying to Cloud Run...');

    // Read env vars from .env
    const envContent = existsSync(`${FRONTEND}/.env`)
      ? readFileSync(`${FRONTEND}/.env`, 'utf-8')
      : '';

    // BACKUP_SSH_KEY
    const backupKeyMatch = envContent.match(/^BACKUP_SSH_KEY=(.+)$/m);
    const envVars = ['NODE_ENV=production'];
    if (backupKeyMatch?.[1]) {
      envVars.push(`BACKUP_SSH_KEY=${backupKeyMatch[1].trim()}`);
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

    const existing = runQuiet(
      `gcloud run services describe ${SERVICE_NAME} --region ${REGION} --project ${PROJECT_ID} --format='value(name)'`,
    );

    const deployCmd = [
      'gcloud run deploy',
      SERVICE_NAME,
      `--image ${IMAGE_NAME}:latest`,
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

    if (existing) {
      deployCmd.push('--no-traffic');
      run(deployCmd.join(' '));
      console.log('\n🔄 Migrating traffic to latest revision...');
      run(
        `gcloud run services update-traffic ${SERVICE_NAME} --to-latest --region ${REGION} --project ${PROJECT_ID}`,
      );
    } else {
      run(deployCmd.join(' '));
    }

    // Clean up
    writeFileSync(`${BUILD}/package.json`, '');
  }

  //
  // Step 4: Deploy Firebase Hosting (static assets + CDN + rewrite to Cloud Run)
  //
  if (!cloudrunOnly) {
    console.log('\n🔥 Step 4: Deploying Firebase Hosting...');
    // Find firebase binary
    const firebaseBin = existsSync(`${BACKEND}/node_modules/.bin/firebase`)
      ? `${BACKEND}/node_modules/.bin/firebase`
      : existsSync(`${ROOT}/node_modules/.bin/firebase`)
        ? `${ROOT}/node_modules/.bin/firebase`
        : 'firebase';

    // Prefer local config over committed one
    const hostingConfig = existsSync(`${FRONTEND}/firebase.hosting.local.json`)
      ? `${FRONTEND}/firebase.hosting.local.json`
      : `${FRONTEND}/firebase.hosting.json`;

    run(
      `${firebaseBin} deploy --config ${hostingConfig} --only hosting --project ${PROJECT_ID}`,
      BACKEND,
    );
  }

  //
  // Done!
  //
  const url = runQuiet(
    `gcloud run services describe ${SERVICE_NAME} --region ${REGION} --project ${PROJECT_ID} --format='value(status.url)'`,
  );

  console.log(`\n✅ Deployment complete!`);
  console.log(`   Cloud Run:     ${url || `https://${SERVICE_NAME}-*-${REGION}.run.app`}`);
  console.log(`   Firebase CDN:  https://${PROJECT_ID}.web.app`);
}

await main();
