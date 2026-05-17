#!/usr/bin/env bun
/**
 * scripts/src/lib/ops/check-videos.ts
 *
 * Checks all video IDs in the VideoDialog playlist for availability
 * using YouTube's oEmbed API. Reports which videos are invalid
 * (private, deleted, or embed disabled).
 *
 * Usage:
 *   bun run scripts/src/lib/ops/check-videos.ts
 *   bun run scripts/src/lib/ops/check-videos.ts --verbose  # show all results
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fmt, hasFlag } from '../cli_utils';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VIDEO_FILE = resolve(__dirname, '../../../../frontend/src/lib/components/VideoDialog.svelte');

// Extract video IDs from the Svelte file
function extractVideoIds(content: string): string[] {
  // Only match quoted strings that look like YouTube video IDs
  const matches = content.match(/'([a-zA-Z0-9_-]{11})'/g);
  return [...new Set(matches?.map((m) => m.replace(/'/g, '')) ?? [])];
}

async function checkVideo(id: string): Promise<'ok' | 'invalid' | 'error'> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`,
      { signal: controller.signal },
    );
    if (res.ok) return 'ok';
    if (res.status === 401 || res.status === 404) return 'invalid';
    return 'error';
  } catch {
    return 'error';
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const verbose = hasFlag(Bun.argv.slice(2), 'verbose');
  console.log(fmt.head('Check YouTube Videos'));

  const content = await Bun.file(VIDEO_FILE).text();
  const ids = extractVideoIds(content);

  console.log(fmt.note(`Found ${ids.length} video IDs in VideoDialog.svelte\n`));

  let ok = 0;
  let invalid = 0;
  let errors = 0;
  const invalidIds: string[] = [];

  // Check in batches to avoid rate limiting
  const batchSize = 5;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const results = await Promise.all(batch.map((id) => checkVideo(id)));

    for (let j = 0; j < batch.length; j++) {
      const id = batch[j];
      const status = results[j];

      if (status === 'ok') {
        ok++;
        if (verbose) console.log(fmt.ok(`${id} ✓`));
      } else if (status === 'invalid') {
        invalid++;
        invalidIds.push(id);
        console.log(fmt.err(`${id} ✗ — not found or private`));
      } else {
        errors++;
        if (verbose) console.log(fmt.warn(`${id} ? — could not check (timeout/network)`));
      }
    }

    // Small delay between batches
    if (i + batchSize < ids.length) await new Promise((r) => setTimeout(r, 500));
  }

  console.log(fmt.head('Results'));
  console.log(`  ${fmt.ok(`${ok} OK`)}`);
  if (invalid > 0) console.log(`  ${fmt.err(`${invalid} invalid`)}`);
  if (errors > 0) console.log(`  ${fmt.warn(`${errors} could not be checked`)}`);

  if (invalidIds.length > 0) {
    console.log(fmt.section('Invalid video IDs'));
    for (const id of invalidIds) {
      console.log(`  ${id} — https://www.youtube.com/watch?v=${id}`);
    }
  }

  process.exit(invalid > 0 ? 1 : 0);
}

await main();
