#!/usr/bin/env bun
/**
 * scripts/src/lib/ops/logs.ts
 *
 * Fetch logs from the Cloud Run service.
 *
 * Usage:
 *   bun run scripts/src/lib/ops/logs.ts              # last 10 min
 *   bun run scripts/src/lib/ops/logs.ts --tail        # follow
 *   bun run scripts/src/lib/ops/logs.ts --hours=1     # last hour
 *   bun run scripts/src/lib/ops/logs.ts --errors      # errors only
 *   bun run scripts/src/lib/ops/logs.ts --search=vm   # filter by text
 */

import { fmt, getArg, hasFlag, run } from '../cli_utils';
import { PROJECT_ID, VM_ZONE } from '../deployment_config';

const REGION = VM_ZONE.replace(/-[a-z]$/, '');
const SERVICE_NAME = PROJECT_ID;

async function main() {
  const args = Bun.argv.slice(2);
  const tail = hasFlag(args, 'tail');
  const errorsOnly = hasFlag(args, 'errors');
  const hours = Number(getArg(args, 'hours') ?? '0.16');
  const search = getArg(args, 'search');

  const since = new Date(Date.now() - hours * 3600_000).toISOString();

  const filter: string[] = [
    'resource.type="cloud_run_revision"',
    `resource.labels.service_name="${SERVICE_NAME}"`,
    `resource.labels.location="${REGION}"`,
    `timestamp >= "${since}"`,
  ];

  if (errorsOnly) filter.push('severity>=ERROR');
  if (search) filter.push(`textPayload=~"${search}"`);

  const filterStr = filter.join(' AND ');

  if (tail) {
    console.log(fmt.head(`Tailing logs for ${SERVICE_NAME} (Ctrl+C to stop)\n`));
    await Bun.spawn(
      [
        'gcloud',
        'alpha',
        'logging',
        'tail',
        filterStr,
        `--project=${PROJECT_ID}`,
        '--format=default(timestamp,severity,textPayload)',
        '--quiet',
      ],
      { stdio: ['inherit', 'inherit', 'inherit'] },
    ).exited;
    return;
  }

  const { out, err, code } = await run([
    'gcloud',
    'logging',
    'read',
    filterStr,
    `--project=${PROJECT_ID}`,
    '--format=json',
    '--limit=50',
    '--freshness=24h',
    '--quiet',
  ]);

  if (code !== 0) {
    console.error(fmt.err('Failed to fetch logs'));
    if (err) console.error(fmt.err(err));
    process.exit(1);
  }

  try {
    const entries = JSON.parse(out) as Array<{
      timestamp: string;
      severity: string;
      textPayload?: string;
      jsonPayload?: Record<string, unknown>;
    }>;

    if (entries.length === 0) {
      console.log(fmt.note('No log entries found.'));
      return;
    }

    for (const entry of entries) {
      const ts = entry.timestamp?.replace('T', ' ').replace(/\.\d+Z$/, '') ?? '';
      const sev = entry.severity?.padEnd(5) ?? '';
      const msg =
        entry.textPayload ??
        (entry.jsonPayload ? JSON.stringify(entry.jsonPayload).slice(0, 200) : '');
      if (!msg) continue;
      if (msg === 'undefined') continue;
      console.log(`${ts} ${sev} ${msg}`);
    }

    console.log(fmt.note(`\n${entries.length} entries. Use --tail to follow.`));
  } catch {
    console.log(out);
  }
}

await main();
