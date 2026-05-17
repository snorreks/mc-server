#!/usr/bin/env bun
// scripts/src/lib/setup/backup_ssh.ts
//
// Generates an SSH key pair for triggering backups from the web app.
// The public key is added to the minecraft user's authorized_keys on the VM,
// and the private key is saved to both frontend/.env and scripts/.env as
// BACKUP_SSH_KEY (also uploaded to Netlify as a secret).
//
// Usage:
//   bun run scripts/src/lib/setup/backup_ssh.ts          # generate + upload
//   bun run scripts/src/lib/setup/backup_ssh.ts --dry-run # preview only
//   bun run scripts/src/lib/setup/backup_ssh.ts --rotate  # replace existing key

import { utils } from 'ssh2';
const { generateKeyPairSync } = utils;
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { c, fmt, hasFlag, run, confirm } from '../cli_utils';
import { PROJECT_ID, VM_INSTANCE, VM_ZONE } from '../deployment_config';
import type { Check } from './project';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../../../');
const FRONTEND_ENV = resolve(ROOT, 'frontend/.env');
const SCRIPTS_ENV = resolve(ROOT, 'scripts/.env');

const SSH_KEY_COMMENT = 'mc-server-backup';
const SSH_BACKUP_USER = 'mc-backup';
const REMOTE_AUTH_KEYS = `/home/${SSH_BACKUP_USER}/.ssh/authorized_keys`;

// ── Key generation ───────────────────────────────────────────────────────────
// Uses ssh2's generateKeyPairSync which produces OpenSSH format private keys
// (natively supported by ssh2's Client.connect — no DER/PKCS8 issues).

function generateKeyPair(): { publicKey: string; privateKey: string } {
  const key = generateKeyPairSync('ed25519');
  return {
    publicKey: `${key.public.trim()} ${SSH_KEY_COMMENT}\n`,
    privateKey: key.private,
  };
}

// ── Env file helpers ─────────────────────────────────────────────────────────

async function readEnv(path: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const text = await Bun.file(path).text();
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      map.set(trimmed.slice(0, eqIdx).trim(), trimmed.slice(eqIdx + 1).trim());
    }
  } catch {
    /* file doesn't exist yet */
  }
  return map;
}

async function writeEnv(path: string, key: string, value: string): Promise<void> {
  const env = await readEnv(path);

  let text: string;
  if (env.has(key)) {
    const lines = (await Bun.file(path).exists() ? await Bun.file(path).text() : '').split('\n');
    text = lines
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) return line;
        const k = trimmed.slice(0, eqIdx).trim();
        if (k === key) return `${key}=${value}`;
        return line;
      })
      .join('\n');
  } else {
    const existing = (await Bun.file(path).exists() ? await Bun.file(path).text() : '').trimEnd();
    text = existing ? `${existing}\n${key}=${value}\n` : `${key}=${value}\n`;
  }

  await Bun.write(path, text);
}

// ── Upload public key to VM ──────────────────────────────────────────────────

async function addKeyToVm(publicKey: string): Promise<void> {
  const tmpKeyPath = '/tmp/mc-server-backup.pub';

  await Bun.write(tmpKeyPath, publicKey);

  const { code: scpCode, err: scpErr } = await run([
    'gcloud',
    'compute',
    'scp',
    tmpKeyPath,
    `${VM_INSTANCE}:${tmpKeyPath}`,
    `--zone=${VM_ZONE}`,
    `--project=${PROJECT_ID}`,
    '--quiet',
  ]);

  if (scpCode !== 0) {
    throw new Error(`Failed to upload public key: ${scpErr}`);
  }

  const authKeysCmd = [
    // Create mc-backup user if not exists
    `sudo id -u ${SSH_BACKUP_USER} 2>/dev/null || sudo useradd -m -s /bin/bash -G docker ${SSH_BACKUP_USER}`,
    // Set up .ssh directory
    `sudo mkdir -p /home/${SSH_BACKUP_USER}/.ssh`,
    `sudo chmod 700 /home/${SSH_BACKUP_USER}/.ssh`,
    // Add the public key
    `cat ${tmpKeyPath} | sudo tee -a ${REMOTE_AUTH_KEYS} > /dev/null`,
    `sudo sort -u -o ${REMOTE_AUTH_KEYS} ${REMOTE_AUTH_KEYS}`,
    `sudo chmod 600 ${REMOTE_AUTH_KEYS}`,
    `sudo chown -R ${SSH_BACKUP_USER}:${SSH_BACKUP_USER} /home/${SSH_BACKUP_USER}/.ssh`,
    // Allow passwordless sudo for backup script
    `echo '${SSH_BACKUP_USER} ALL=(ALL) NOPASSWD: /mnt/disks/data/mc-backup.sh' | sudo tee /etc/sudoers.d/${SSH_BACKUP_USER} > /dev/null`,
    `sudo chmod 440 /etc/sudoers.d/${SSH_BACKUP_USER}`,
    // Clean up temp file
    `sudo rm ${tmpKeyPath}`,
    `echo "OK"`,
  ].join(' && ');

  const { code: sshCode, err: sshErr } = await run([
    'gcloud',
    'compute',
    'ssh',
    VM_INSTANCE,
    `--zone=${VM_ZONE}`,
    `--project=${PROJECT_ID}`,
    `--command=${authKeysCmd}`,
    '--quiet',
  ]);

  if (sshCode !== 0) {
    throw new Error(`Failed to add key to authorized_keys: ${sshErr}`);
  }
}

// ── Setup export (called from project.ts) ────────────────────────────────────

export async function setupBackupSsh(dryRun: boolean): Promise<{ checks: Check[] }> {
  const checks: Check[] = [];
  console.log(fmt.section('Backup SSH Key'));

  // Check both .env files for an existing key
  const scriptsEnv = await readEnv(SCRIPTS_ENV);
  const frontendEnv = await readEnv(FRONTEND_ENV);
  let existingKey = scriptsEnv.get('BACKUP_SSH_KEY') || frontendEnv.get('BACKUP_SSH_KEY');

  if (existingKey) {
    console.log(fmt.ok('BACKUP_SSH_KEY already exists in .env'));
    // Sync to the other .env if missing
    if (!scriptsEnv.has('BACKUP_SSH_KEY') && !dryRun) {
      // existingKey may already be base64 or raw PEM — write as-is
      await writeEnv(SCRIPTS_ENV, 'BACKUP_SSH_KEY', existingKey);
      console.log(fmt.note('Copied to scripts/.env'));
    }
    if (!frontendEnv.has('BACKUP_SSH_KEY') && !dryRun) {
      await writeEnv(FRONTEND_ENV, 'BACKUP_SSH_KEY', existingKey);
      console.log(fmt.note('Copied to frontend/.env'));
    }
    checks.push({ name: 'Backup SSH key', status: 'ok' });
    return { checks };
  }

  // 1. Generate key pair
  console.log(fmt.note('Generating new ED25519 key pair...'));
  const { publicKey, privateKey } = generateKeyPair();

  // 2. Upload public key to VM
  if (dryRun) {
    console.log(fmt.fix('Would upload public key to VM and add to authorized_keys'));
  } else {
    try {
      await addKeyToVm(publicKey);
      console.log(fmt.ok(`Public key added to ${REMOTE_AUTH_KEYS}`));
    } catch (e) {
      console.error(fmt.err(`Failed to add key to VM: ${e instanceof Error ? e.message : String(e)}`));
      console.log(fmt.note('Make sure the VM is running. You can run this step manually:'));
      console.log(fmt.cmd('bun run scripts/src/lib/setup/backup_ssh.ts'));
      checks.push({ name: 'Backup SSH key', status: 'error', detail: 'Could not upload to VM' });
      return { checks };
    }
  }

  // 3. Base64-encode and save private key to .env files
  //    (single-line, compatible with Netlify/AWS Lambda limits)
  if (!dryRun) {
    const encoded = Buffer.from(privateKey, 'utf-8').toString('base64');
    await writeEnv(FRONTEND_ENV, 'BACKUP_SSH_KEY', encoded);
    await writeEnv(SCRIPTS_ENV, 'BACKUP_SSH_KEY', encoded);
    console.log(fmt.ok('BACKUP_SSH_KEY saved (base64) to frontend/.env and scripts/.env'));
  } else {
    console.log(fmt.fix('Would save BACKUP_SSH_KEY to .env files'));
  }

  // 4. Reminder about Netlify
  console.log(fmt.note('For production, add both secrets as Netlify env vars:'));
  console.log(fmt.note('  ED25519 is small enough (~400 B) to stay under the 4KB Lambda limit.'));
  console.log(fmt.cmd('netlify env:set BACKUP_SSH_KEY "<value>"'));
  console.log(fmt.cmd('netlify env:set FIREBASE_SERVICE_ACCOUNT "<value>"'));

  checks.push({ name: 'Backup SSH key', status: existingKey ? 'ok' : 'missing', fixed: !existingKey && !dryRun });
  return { checks };
}

// ── Standalone entry ─────────────────────────────────────────────────────────

if (import.meta.main) {
  const dryRun = hasFlag(Bun.argv.slice(2), 'dry-run');
  const rotate = hasFlag(Bun.argv.slice(2), 'rotate');

  console.log(fmt.head('Backup SSH Key Setup'));

  const scriptsEnv = await readEnv(SCRIPTS_ENV);
  const existingKey = scriptsEnv.get('BACKUP_SSH_KEY');

  if (existingKey && !rotate) {
    console.log(fmt.ok('BACKUP_SSH_KEY already exists in scripts/.env'));
    const redo = confirm('Re-generate and re-upload (rotate)?', false);
    if (!redo) {
      console.log(fmt.note('Skipping. Use --rotate to force re-generation.'));
      process.exit(0);
    }
  }

  await setupBackupSsh(dryRun);

  console.log(fmt.head('Done'));
}
