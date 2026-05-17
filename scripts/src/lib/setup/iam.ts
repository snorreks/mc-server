#!/usr/bin/env bun
// scripts/src/lib/setup/iam.ts
//
// Grant IAM roles to the Firebase Admin service account so it can
// manage the Minecraft VM (start/stop/check) and read billing info.
//
// Usage:  bun run scripts/src/lib/setup/iam.ts [--dry-run]

import { c, fmt, run } from '../cli_utils';
import { PROJECT_ID } from '../deployment_config';

export type Check = {
  name: string;
  status: 'ok' | 'missing' | 'error';
  detail?: string;
  fixed?: boolean;
};

const SA_EMAIL = 'firebase-adminsdk-fbsvc@agmcs2026.iam.gserviceaccount.com';

// Project-level roles (applied via projects.add-iam-policy-binding)
const PROJECT_ROLES = ['roles/compute.instanceAdmin.v1'];

// Billing account-level roles (applied via billing.accounts.add-iam-policy-binding)
const BILLING_ROLES = ['roles/billing.viewer'];

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getBillingAccount(): Promise<string | null> {
  const { out, code } = await run([
    'gcloud',
    'billing',
    'projects',
    'describe',
    PROJECT_ID,
    '--format=json',
    '--quiet',
  ]);
  if (code !== 0) return null;
  try {
    const ba = (JSON.parse(out) as { billingAccountName?: string }).billingAccountName;
    return ba?.replace('billingAccounts/', '') ?? null;
  } catch {
    return null;
  }
}

async function hasProjectRole(role: string): Promise<boolean> {
  const filterValue = SA_EMAIL.replace(/^serviceAccount:/, '');
  const { out, code } = await run([
    'gcloud',
    'projects',
    'get-iam-policy',
    PROJECT_ID,
    '--flatten=bindings[].members',
    `--filter=bindings.members:${filterValue}`,
    '--format=json',
    '--quiet',
  ]);
  if (code !== 0) return false;
  try {
    const policies = JSON.parse(out) as Array<{ bindings?: { role: string; members: string[] } }>;
    return new Set(policies.flatMap((p) => (p.bindings?.role ? [p.bindings.role] : []))).has(role);
  } catch {
    return false;
  }
}

async function hasBillingRole(billingAccount: string, role: string): Promise<boolean> {
  const { out, code } = await run([
    'gcloud',
    'billing',
    'accounts',
    'get-iam-policy',
    billingAccount,
    '--format=json',
    '--quiet',
  ]);
  if (code !== 0) return false;
  try {
    const policy = JSON.parse(out) as { bindings?: Array<{ role: string; members: string[] }> };
    const bound = policy.bindings?.find((b) =>
      b.members.some((m) => m.includes(SA_EMAIL.split('@')[0])),
    );
    return bound?.role === role;
  } catch {
    return false;
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

export const setupIam = async (dryRun: boolean): Promise<{ checks: Check[] }> => {
  const checks: Check[] = [];

  console.log(fmt.section('Project-level IAM'));
  for (const role of PROJECT_ROLES) {
    const already = await hasProjectRole(role);
    if (already) {
      console.log(fmt.ok(` ${role}`));
      checks.push({ name: `IAM: ${role}`, status: 'ok' });
    } else {
      console.log(fmt.fix(`Granting ${role} to ${SA_EMAIL}...`));
      if (!dryRun) {
        const { code } = await run([
          'gcloud',
          'projects',
          'add-iam-policy-binding',
          PROJECT_ID,
          `--member=serviceAccount:${SA_EMAIL}`,
          `--role=${role}`,
          '--quiet',
        ]);
        if (code === 0) {
          console.log(fmt.ok(` ${role} granted`));
          checks.push({ name: `IAM: ${role}`, status: 'missing', fixed: true });
        } else {
          console.log(fmt.err(`Failed to grant ${role}`));
          checks.push({ name: `IAM: ${role}`, status: 'error' });
        }
      } else {
        checks.push({ name: `IAM: ${role}`, status: 'missing', fixed: true });
      }
    }
  }

  console.log(fmt.section('Billing account IAM'));
  const billingAccount = await getBillingAccount();
  if (!billingAccount) {
    console.log(fmt.warn('No billing account linked — skipping billing roles. Create one at:'));
    console.log(fmt.url('https://console.cloud.google.com/billing'));
  } else {
    for (const role of BILLING_ROLES) {
      const already = await hasBillingRole(billingAccount, role);
      if (already) {
        console.log(fmt.ok(` ${role}`));
        checks.push({ name: `IAM: ${role}`, status: 'ok' });
      } else {
        console.log(fmt.fix(`Granting ${role} on billing account ${billingAccount}...`));
        if (!dryRun) {
          const { code } = await run([
            'gcloud',
            'billing',
            'accounts',
            'add-iam-policy-binding',
            billingAccount,
            `--member=serviceAccount:${SA_EMAIL}`,
            `--role=${role}`,
            '--quiet',
          ]);
          if (code === 0) {
            console.log(fmt.ok(` ${role} granted`));
            checks.push({ name: `IAM: ${role}`, status: 'missing', fixed: true });
          } else {
            console.log(fmt.warn(`Could not grant ${role} — needs billing admin`));
            console.log(fmt.note('Manually run:'));
            console.log(
              fmt.cmd(
                `gcloud billing accounts add-iam-policy-binding ${billingAccount} --member=serviceAccount:${SA_EMAIL} --role=${role}`,
              ),
            );
            checks.push({ name: `IAM: ${role}`, status: 'ok' });
          }
        } else {
          checks.push({ name: `IAM: ${role}`, status: 'missing', fixed: true });
        }
      }
    }
  }

  return { checks };
};

// ── Standalone entry ────────────────────────────────────────────────────────
if (import.meta.main) {
  const dryRun = Bun.argv.includes('--dry-run');
  console.log(fmt.head('IAM Setup'));
  if (dryRun) console.log(fmt.warn('Dry-run mode — no changes will be made.\n'));

  const { checks } = await setupIam(dryRun);

  const ok = checks.filter((c) => c.status === 'ok').length;
  const fixed = checks.filter((c) => c.fixed).length;
  const errors = checks.filter((c) => c.status === 'error').length;
  console.log(fmt.head('Summary'));
  console.log(`  ${c.green}${ok}${c.reset} already set, ${c.cyan}${fixed}${c.reset} granted`);
  if (errors) console.log(`  ${c.red}${errors}${c.reset} errors`);
  process.exit(errors > 0 ? 1 : 0);
}
