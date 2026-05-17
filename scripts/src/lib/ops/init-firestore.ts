#!/usr/bin/env bun
/**
 * Initialize the default Firestore documents for the MC Server.
 * Creates ag-server/status and ag-server/allowed_emails if they don't exist.
 *
 * Usage:
 *   bun run scripts/src/lib/ops/init-firestore.ts
 *   bun run scripts/src/lib/ops/init-firestore.ts --emails=user1@gmail.com,user2@gmail.com
 */

import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  AG_ALLOWED_EMAILS_PATH,
  AG_STATUS_PATH,
  type AllowedEmailData,
  type ServerStatusData,
} from '../../../../config';
import { fmt, getArg } from '../cli_utils';

const allowedEmails = ['snorristrand@gmail.com'] as const;

function parseServiceAccount(raw: string): ServiceAccount {
  let json = raw;
  if (!raw.trim().startsWith('{')) json = Buffer.from(raw, 'base64').toString('utf-8');
  const parsed = JSON.parse(json) as ServiceAccount;
  if (parsed.privateKey) parsed.privateKey = parsed.privateKey.replace(/\\n/g, '\n');
  return parsed;
}

function initFirebase() {
  if (getApps().length > 0) return;
  const saString = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!saString) {
    console.error(fmt.err('FIREBASE_SERVICE_ACCOUNT is not set.'));
    process.exit(1);
  }
  initializeApp({ credential: cert(parseServiceAccount(saString)) });
}

const args = Bun.argv.slice(2);
const emailsArg = getArg(args, 'emails');
const emails = emailsArg
  ? emailsArg
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  : allowedEmails;

console.log(fmt.head('Initialize Firestore'));

initFirebase();
const db = getFirestore();

// ── Status doc ──────────────────────────────────────────────────────────────
const statusRef = db.doc(AG_STATUS_PATH);
const statusDoc = await statusRef.get();

if (statusDoc.exists) {
  console.log(fmt.ok('ag-server/status already exists'));
} else {
  const now = new Date();
  await statusRef.set({
    serverIsOn: false,
    serverStatus: 'UNKNOWN',
    skipNextAutoShutdown: false,
    updatedAt: now,
    createdAt: now,
  } satisfies ServerStatusData);
  console.log(fmt.ok('ag-server/status created with createdAt'));
}

// ── Allowed emails doc ──────────────────────────────────────────────────────
const emailsRef = db.doc(AG_ALLOWED_EMAILS_PATH);
const emailsDoc = await emailsRef.get();

const existing = (emailsDoc.data() ?? {}) as AllowedEmailData;
const emailsMap: AllowedEmailData = { ...existing };

for (const email of emails) {
  emailsMap[email] = true;
  console.log(fmt.ok(`Added ${email}`));
}

if (Object.keys(emailsMap).length === 0) {
  console.log(fmt.warn('ag-server/allowed_emails is empty. Add emails with --emails=...'));
}

await emailsRef.set(emailsMap);
console.log(fmt.ok('ag-server/allowed_emails saved'));

console.log(fmt.head('Done'));
