#!/usr/bin/env bun
/**
 * Add an email to the allowed list for the MC Server.
 * Users with emails in this list can sign in with Google and see VM controls.
 *
 * Usage:
 *   bun run scripts/src/lib/ops/create-admin-user.ts user@gmail.com
 */

import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { AG_ALLOWED_EMAILS_PATH, type AllowedEmailData } from '../../../../config';
import { ask, fmt } from '../cli_utils';

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
    console.error(fmt.cmd('export FIREBASE_SERVICE_ACCOUNT=\'{"type":"service_account",...}\''));
    process.exit(1);
  }
  initializeApp({ credential: cert(parseServiceAccount(saString)) });
}

const args = Bun.argv.slice(2).filter((a) => !a.startsWith('--'));
let email = args[0];
if (!email) email = ask('Email');
if (!email) {
  console.log(fmt.err('Email is required.'));
  process.exit(1);
}

const normalized = email.toLowerCase().trim();
console.log(fmt.head('Add Allowed User'));
console.log(fmt.ok(`Email: ${normalized}`));

initFirebase();
const db = getFirestore();

await db.doc(AG_ALLOWED_EMAILS_PATH).set(
  {
    [normalized]: true,
  } as AllowedEmailData,
  { merge: true },
);

console.log(fmt.ok(`${normalized} can now sign in with Google.`));
