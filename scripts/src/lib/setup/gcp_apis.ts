#!/usr/bin/env bun
// scripts/src/lib/setup/gcp_apis.ts
// Enable required GCP APIs for the MC Server project.

import { fmt, run } from '../cli_utils';
import type { Check } from './project';

export type { Check };

const REQUIRED_APIS = [
  'compute.googleapis.com', // GCE VM
  'firebase.googleapis.com', // Firebase
  'firestore.googleapis.com', // Firestore
  'storage.googleapis.com', // Cloud Storage
  'cloudfunctions.googleapis.com', // Cloud Functions (firestack)
  'cloudbuild.googleapis.com', // Cloud Build
  'iam.googleapis.com', // IAM
  'iamcredentials.googleapis.com',
  'secretmanager.googleapis.com', // Secrets
  'serviceusage.googleapis.com',
  'cloudresourcemanager.googleapis.com',
  'cloudbilling.googleapis.com', // Billing info
  'billingbudgets.googleapis.com', // Budgets & spend data
] as const;

async function getEnabledApis(projectId: string): Promise<Set<string>> {
  const { out, code } = await run([
    'gcloud',
    'services',
    'list',
    `--project=${projectId}`,
    '--enabled',
    '--format=value(config.name)',
  ]);
  if (code !== 0) return new Set();
  return new Set(out.split('\n').filter(Boolean));
}

export async function setupGcpApis(
  projectId: string,
  dryRun: boolean,
): Promise<{ checks: Check[] }> {
  const checks: Check[] = [];
  console.log(fmt.section('GCP APIs'));

  const enabledApis = await getEnabledApis(projectId);
  const missingApis = REQUIRED_APIS.filter((a) => !enabledApis.has(a));

  for (const api of REQUIRED_APIS.filter((a) => enabledApis.has(a))) {
    console.log(fmt.ok(api));
    checks.push({ name: `API: ${api}`, status: 'ok' });
  }

  if (missingApis.length === 0) return { checks };

  if (!dryRun) {
    console.log(fmt.fix(`Enabling ${missingApis.length} APIs...`));
    const { code } = await run([
      'gcloud',
      'services',
      'enable',
      ...missingApis,
      `--project=${projectId}`,
      '--quiet',
    ]);
    if (code === 0) {
      for (const api of missingApis) {
        console.log(fmt.ok(`${api} enabled`));
        checks.push({ name: `API: ${api}`, status: 'missing', fixed: true });
      }
    } else {
      // Fall back to one-by-one
      for (const api of missingApis) {
        const r2 = await run([
          'gcloud',
          'services',
          'enable',
          api,
          `--project=${projectId}`,
          '--quiet',
        ]);
        if (r2.code === 0) {
          console.log(fmt.ok(`${api} enabled`));
          checks.push({ name: `API: ${api}`, status: 'missing', fixed: true });
        } else {
          console.log(fmt.err(`Failed to enable ${api}`));
          checks.push({ name: `API: ${api}`, status: 'error', detail: r2.err });
        }
      }
    }
    console.log(fmt.note('Waiting 5s for API propagation...'));
    await new Promise((r) => setTimeout(r, 5000));
  } else {
    for (const api of missingApis) {
      console.log(fmt.fix(`Would enable: ${api} (dry-run)`));
      checks.push({ name: `API: ${api}`, status: 'missing', fixed: true });
    }
  }

  return { checks };
}
