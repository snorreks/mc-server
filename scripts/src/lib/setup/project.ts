#!/usr/bin/env bun
// scripts/src/lib/setup/project.ts
// One-time infrastructure setup for the MC Server.
// Runs all steps in dependency order.

import { banner, c, fmt, run } from '../cli_utils';
import { PROJECT_ID } from '../deployment_config';
import { setupFirebaseHosting } from './firebase_hosting_setup';
import { setupFirewall } from './firewall';
import { setupGceVm } from './gce_vm';
import { setupGcpApis } from './gcp_apis';
import { setupIam } from './iam';
import { setupStaticIp } from './static_ip';

export type CheckStatus = 'ok' | 'missing' | 'error';
export type Check = { name: string; status: CheckStatus; detail?: string; fixed?: boolean };
type ManualStep = { title: string; url?: string; detail: string };

async function checkGcloudAuth(): Promise<string | null> {
  const { out, code } = await run([
    'gcloud',
    'auth',
    'list',
    '--filter=status:ACTIVE',
    '--format=json',
    '--quiet',
  ]);
  if (code !== 0) return null;
  try {
    return (JSON.parse(out) as Array<{ account: string }>)[0]?.account ?? null;
  } catch {
    return null;
  }
}

async function main() {
  banner('MC Server Setup');

  const DRY_RUN = Bun.argv.includes('--dry-run');

  if (DRY_RUN) console.log(fmt.warn('Dry-run — no changes will be made.\n'));

  // ── gcloud auth ───────────────────────────────────────────────────────────
  console.log(fmt.section('Checking gcloud auth'));
  const gcloudAccount = await checkGcloudAuth();
  if (!gcloudAccount) {
    console.log(fmt.err('Not logged in. Run: gcloud auth login'));
    process.exit(1);
  }
  console.log(fmt.ok(`Logged in as ${c.bold}${gcloudAccount}${c.reset}`));

  console.log(`  Project: ${c.bold}${PROJECT_ID}${c.reset}`);

  // Check project exists
  const { code: projCode } = await run([
    'gcloud',
    'projects',
    'describe',
    PROJECT_ID,
    '--format=json',
    '--quiet',
  ]);
  if (projCode !== 0) {
    console.log(fmt.err(`Project "${PROJECT_ID}" not found.`));
    console.log(fmt.note('Create it at: https://console.cloud.google.com/projectcreate'));
    process.exit(1);
  }
  console.log(fmt.ok(`Project ${PROJECT_ID} exists`));

  const allChecks: Check[] = [];
  const allManualSteps: ManualStep[] = [];

  // ── 1. GCP APIs ──────────────────────────────────────────────────────────
  {
    const { checks } = await setupGcpApis(PROJECT_ID, DRY_RUN);
    allChecks.push(...checks);
  }

  // ── 2. Static IP ─────────────────────────────────────────────────────────
  const { checks: ipChecks } = await setupStaticIp(PROJECT_ID, DRY_RUN);
  allChecks.push(...ipChecks);

  // ── 3. Firewall ──────────────────────────────────────────────────────────
  {
    const { checks } = await setupFirewall(PROJECT_ID, DRY_RUN);
    allChecks.push(...checks);
  }

  // ── 4. GCE VM ────────────────────────────────────────────────────────────
  {
    // Check for CF_API_KEY before creating VM
    const envPath = 'scripts/.env';
    const envFile = Bun.file(envPath);
    if (await envFile.exists()) {
      const envText = await envFile.text();
      if (!envText.includes('CF_API_KEY=') || envText.match(/CF_API_KEY=\s*$/)) {
        console.log(fmt.warn('CF_API_KEY is empty in scripts/.env'));
        console.log(fmt.note('For CurseForge modpacks, set your API key:'));
        console.log(fmt.url('https://console.curseforge.com/?#/api-keys'));
        console.log(fmt.cmd('echo CF_API_KEY=your_key_here >> scripts/.env'));
        allChecks.push({ name: 'CF_API_KEY', status: 'missing' });
        allManualSteps.push({
          title: 'Set CF_API_KEY in scripts/.env for CurseForge modpacks',
          url: 'https://console.curseforge.com/?#/api-keys',
          detail: 'Generate an API key and add CF_API_KEY=your_key to scripts/.env',
        });
      }
    }
    const { checks } = await setupGceVm(DRY_RUN);
    allChecks.push(...checks);
  }

  // ── 5. IAM ────────────────────────────────────────────────────────────────
  {
    const { checks } = await setupIam(DRY_RUN);
    allChecks.push(...checks);
  }

  // ── 6. Firebase Hosting → Cloud Run ────────────────────────────────────
  {
    const { checks } = await setupFirebaseHosting(PROJECT_ID, DRY_RUN);
    allChecks.push(...checks);
  }

  // ── Billing check ─────────────────────────────────────────────────────────
  console.log(fmt.section('Billing'));
  const { out: billingOut } = await run([
    'gcloud',
    'billing',
    'projects',
    'describe',
    PROJECT_ID,
    '--format=json',
    '--quiet',
  ]);
  let billingEnabled = false;
  try {
    billingEnabled =
      (JSON.parse(billingOut) as { billingEnabled?: boolean }).billingEnabled === true;
  } catch {
    /* empty */
  }

  if (billingEnabled) {
    console.log(fmt.ok('Billing is enabled'));
    allChecks.push({ name: 'Billing', status: 'ok' });
  } else {
    console.log(fmt.warn('Billing is NOT enabled'));
    allChecks.push({ name: 'Billing', status: 'missing' });
    allManualSteps.push({
      title: 'Enable billing on the project',
      url: `https://console.cloud.google.com/billing/linkedaccount?project=${PROJECT_ID}`,
      detail: 'Required for: Compute Engine, Cloud Build, etc.',
    });
  }

  // ── Manual steps ──────────────────────────────────────────────────────────
  allManualSteps.push({
    title: 'Create Gmail + GCP project (free $300 credits)',
    detail: [
      '1. Create Gmail: https://mail.google.com/mail/signup',
      '2. Start GCP free trial: https://console.cloud.google.com/freetrial',
      '   -- Credit card for verification only, no charges',
      '   -- You get $300 credits for 90 days',
      `3. Create project "${PROJECT_ID}": https://console.cloud.google.com/projectcreate`,
      '4. Invite snorre@mailvideo.com as Owner:',
      `   https://console.cloud.google.com/iam-admin/iam?project=${PROJECT_ID}`,
      '   → Click "Grant Access" → snorre@mailvideo.com → Role: Owner',
      '5. Run this setup script again to provision everything',
    ].join('\n'),
  });

  allManualSteps.push({
    title: 'Get Firebase config + set up .env files',
    detail: [
      `1. Open Firebase Console: https://console.firebase.google.com/project/${PROJECT_ID}`,
      '2. Project Settings → General → Web App → copy firebaseConfig',
      '3. Run: bun run scripts/src/lib/setup/env.ts',
      '   Paste the config + service account JSON when prompted',
    ].join('\n'),
  });

  allManualSteps.push({
    title: 'Set up Firebase in the console',
    detail: [
      `1. Firebase Console: https://console.firebase.google.com/project/${PROJECT_ID}`,
      '2. Authentication → Sign-in method → Add Google (enable it)',
      `   https://console.firebase.google.com/project/${PROJECT_ID}/authentication/providers`,
      '3. Firestore Database → Create database → europe-west1 (single region)',
      `   https://console.firebase.google.com/project/${PROJECT_ID}/firestore`,
      '4. Storage → Get started → europe-west1',
      `   https://console.firebase.google.com/project/${PROJECT_ID}/storage`,
      '5. Hosting → Get started (creates the default site at PROJECT_ID.web.app)',
      `   https://console.firebase.google.com/project/${PROJECT_ID}/hosting`,
      '6. Functions (optional, for scheduler)',
      `   https://console.firebase.google.com/project/${PROJECT_ID}/functions`,
      '7. Project Settings → Service Accounts → Generate new private key',
      `   https://console.firebase.google.com/project/${PROJECT_ID}/settings/serviceaccounts/adminsdk`,
      '   Paste the JSON into scripts/.env as FIREBASE_SERVICE_ACCOUNT',
    ].join('\n'),
  });

  allManualSteps.push({
    title: 'Configure your CurseForge modpack',
    detail: [
      '1. Get your CF_API_KEY: https://console.curseforge.com/?#/api-keys',
      '   Add it to scripts/.env: CF_API_KEY=your_key',
      '2. Find your modpack ID on CurseForge (the number in the URL)',
      '   Example: All the Mods 9 = https://www.curseforge.com/minecraft/modpacks/all-the-mods-9',
      '   Add to scripts/.env: CF_MODPACK_ID=715572',
      '   Or use: CF_MODPACK_PAGE_URL=https://www.curseforge.com/minecraft/modpacks/all-the-mods-9',
      '3. Re-run setup to recreate the VM with your modpack',
    ].join('\n'),
  });

  // ── Summary ──────────────────────────────────────────────────────────────
  const fixed = allChecks.filter((c) => c.fixed).length;
  const errors = allChecks.filter((c) => c.status === 'error').length;
  const alreadyOk = allChecks.filter((c) => c.status === 'ok').length;

  console.log(fmt.head('═══ Summary ═══'));
  console.log(`  ${c.green}${alreadyOk}${c.reset} already configured`);
  console.log(`  ${c.cyan}${fixed}${c.reset} fixed automatically`);
  if (errors > 0) console.log(`  ${c.red}${errors}${c.reset} errors`);

  if (allManualSteps.length > 0) {
    console.log(fmt.head(`═══ Manual Steps (${allManualSteps.length}) ═══`));
    console.log(fmt.note('Complete these in order:\n'));
    allManualSteps.forEach((step, i) => {
      console.log(fmt.step(i + 1, `${c.bold}${step.title}${c.reset}`));
      if (step.url) console.log(fmt.url(step.url));
      for (const line of step.detail.split('\n')) console.log(fmt.note(line));
      console.log();
    });
  }

  if (errors > 0) {
    console.log(fmt.err('Some steps failed.\n'));
    process.exit(1);
  }

  console.log(`${c.green}${c.bold}Done!${c.reset} Complete manual steps above.\n`);
}

await main();
