#!/usr/bin/env bun
// scripts/src/lib/setup/firewall.ts
// Create firewall rules for the Minecraft server VM.

import { fmt, gcloud, run } from '../cli_utils';
import type { Check } from './project';

export type { Check };

const FIREWALL_RULES = [
  {
    name: 'minecraft-server',
    description: 'Minecraft server ports',
    allow: ['tcp:25565', 'tcp:25575', 'tcp:8123', 'tcp:8100', 'udp:24454'],
    targetTags: 'minecraft-server',
    sourceRanges: '0.0.0.0/0',
  },
  {
    name: 'minecraft-ssh',
    description: 'SSH from IAP',
    allow: ['tcp:22'],
    targetTags: 'minecraft-server',
    sourceRanges: '35.235.240.0/20',
  },
];

async function ruleExists(projectId: string, name: string): Promise<boolean> {
  const { code } = await gcloud(
    'compute',
    'firewall-rules',
    'describe',
    name,
    `--project=${projectId}`,
  );
  return code === 0;
}

async function createRule(
  projectId: string,
  rule: (typeof FIREWALL_RULES)[number],
): Promise<boolean> {
  const { code } = await run([
    'gcloud',
    'compute',
    'firewall-rules',
    'create',
    rule.name,
    `--project=${projectId}`,
    '--direction=INGRESS',
    '--priority=1000',
    '--network=default',
    `--allow=${rule.allow.join(',')}`,
    `--target-tags=${rule.targetTags}`,
    `--source-ranges=${rule.sourceRanges}`,
    `--description=${rule.description}`,
    '--quiet',
  ]);
  return code === 0;
}

export async function setupFirewall(
  projectId: string,
  dryRun: boolean,
): Promise<{ checks: Check[] }> {
  const checks: Check[] = [];
  console.log(fmt.section('Firewall Rules'));

  for (const rule of FIREWALL_RULES) {
    const exists = await ruleExists(projectId, rule.name);
    if (exists) {
      console.log(fmt.ok(`Rule ${rule.name} exists`));
      checks.push({ name: `Firewall: ${rule.name}`, status: 'ok' });
    } else if (!dryRun) {
      console.log(fmt.fix(`Creating rule ${rule.name}...`));
      const ok = await createRule(projectId, rule);
      if (ok) {
        console.log(fmt.ok(`Rule ${rule.name} created`));
        checks.push({ name: `Firewall: ${rule.name}`, status: 'missing', fixed: true });
      } else {
        console.log(fmt.err(`Failed to create rule ${rule.name}`));
        checks.push({ name: `Firewall: ${rule.name}`, status: 'error' });
      }
    } else {
      console.log(fmt.fix(`Would create rule ${rule.name} (dry-run)`));
      checks.push({ name: `Firewall: ${rule.name}`, status: 'missing', fixed: true });
    }
  }

  return { checks };
}
