#!/usr/bin/env bun
// scripts/src/lib/setup/static_ip.ts
// Reserve a static external IP for the Minecraft server VM.

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fmt, gcloud, run } from '../cli_utils';
import type { Check } from './project';

export type { Check };

export const IP_NAME = 'mc-server-ip';
export const ZONE = 'europe-west1-b';
const REGION = ZONE.replace(/-[a-z]$/, '');

async function ipExists(projectId: string): Promise<boolean> {
  const { code } = await gcloud(
    'compute',
    'addresses',
    'describe',
    IP_NAME,
    `--project=${projectId}`,
    `--region=${REGION}`,
  );
  return code === 0;
}

async function getIpAddress(projectId: string): Promise<string | null> {
  const { out } = await run([
    'gcloud',
    'compute',
    'addresses',
    'describe',
    IP_NAME,
    `--project=${projectId}`,
    `--region=${REGION}`,
    '--format=value(address)',
    '--quiet',
  ]);
  return out.trim() || null;
}

async function reserveIp(projectId: string): Promise<boolean> {
  const { code } = await run([
    'gcloud',
    'compute',
    'addresses',
    'create',
    IP_NAME,
    `--project=${projectId}`,
    `--region=${REGION}`,
    '--quiet',
  ]);
  return code === 0;
}

async function updateConfigIp(ip: string): Promise<void> {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
  const configPath = `${root}/config.ts`;
  const file = Bun.file(configPath);
  if (!(await file.exists())) return;
  let text = await file.text();
  text = text.replace(/export const VM_IP = '[^']*'/, `export const VM_IP = '${ip}'`);
  await Bun.write(configPath, text);
}

export async function setupStaticIp(
  projectId: string,
  dryRun: boolean,
): Promise<{ checks: Check[]; ipAddress?: string }> {
  const checks: Check[] = [];
  console.log(fmt.section('Static IP'));

  const exists = await ipExists(projectId);

  if (exists) {
    const ip = await getIpAddress(projectId);
    console.log(fmt.ok(`Static IP "${IP_NAME}" exists: ${ip ?? 'unknown'}`));
    if (ip) await updateConfigIp(ip).catch(() => {});
    checks.push({ name: `Static IP: ${IP_NAME}`, status: 'ok' });
    return { checks, ipAddress: ip ?? undefined };
  }

  if (!dryRun) {
    console.log(fmt.fix(`Reserving static IP "${IP_NAME}"...`));
    const ok = await reserveIp(projectId);
    if (ok) {
      const ip = await getIpAddress(projectId);
      console.log(fmt.ok(`Static IP "${IP_NAME}" = ${ip ?? 'unknown'}`));
      if (ip) await updateConfigIp(ip).catch(() => {});
      checks.push({ name: `Static IP: ${IP_NAME}`, status: 'missing', fixed: true });
      return { checks, ipAddress: ip ?? undefined };
    }
    console.log(fmt.err('Failed to reserve static IP'));
    checks.push({ name: `Static IP: ${IP_NAME}`, status: 'error' });
  } else {
    console.log(fmt.fix(`Would reserve static IP "${IP_NAME}" (dry-run)`));
    checks.push({ name: `Static IP: ${IP_NAME}`, status: 'missing', fixed: true });
  }

  return { checks };
}
