#!/usr/bin/env bun
/**
 * scripts/src/lib/ops/add-videos.ts
 *
 * Add new YouTube videos to the VideoDialog playlist.
 *   - Extracts video IDs from URLs defined below
 *   - Detects duplicates (in new list and existing playlist)
 *   - Validates via YouTube oEmbed API
 *   - Automatically adds valid new IDs to VideoDialog.svelte
 *
 * Usage:
 *   bun run scripts/src/lib/ops/add-videos.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fmt } from '../cli_utils';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VIDEO_FILE = resolve(__dirname, '../../../../frontend/src/lib/components/VideoDialog.svelte');

// ── Paste YouTube URLs below in the template literal ──────────────────
const rawUrls = `
https://www.youtube.com/watch?v=RcCjmaFFGfI
https://www.youtube.com/watch?v=PEj5FoAFOgY&list=RDPEj5FoAFOgY&start_radio=1
`;
// ───────────────────────────────────────────────────────────────────────

const YT_REGEX = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;

function extractVideoIdsFromUrls(text: string): string[] {
  const ids: string[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(YT_REGEX);
    if (match) ids.push(match[1]);
  }
  return ids;
}

function extractExistingIds(content: string): string[] {
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

function addIdsToPlaylist(content: string, newIds: string[]): string {
  const arrayMatch = content.match(/(const allVideos = \[)([\s\S]*?)(\]\s*;)/);
  if (!arrayMatch) {
    console.error('Could not find allVideos array in VideoDialog.svelte');
    process.exit(1);
  }
  const fullMatch = arrayMatch[0];
  const [, prefix, body, suffix] = arrayMatch;

  const existingInBody = new Set([...body.matchAll(/'([a-zA-Z0-9_-]{11})'/g)].map((m) => m[1]));
  const toInsert = newIds.filter((id) => !existingInBody.has(id));
  if (toInsert.length === 0) return content;

  const indentMatch = body.match(/^\n(\s+)/);
  const indent = indentMatch ? indentMatch[1] : '  ';
  const newLines = toInsert.map((id) => `${indent}'${id}',`);
  const updatedBody = body.endsWith('\n')
    ? body + newLines.join('\n') + '\n'
    : body + '\n' + newLines.join('\n') + '\n';

  return content.replace(fullMatch, prefix + updatedBody + suffix);
}

async function main() {
  console.log(fmt.head('Add YouTube Videos'));

  const newIds = extractVideoIdsFromUrls(rawUrls);
  if (newIds.length === 0) {
    console.log(fmt.err('No valid YouTube video IDs found in rawUrls'));
    process.exit(1);
  }
  console.log(fmt.note(`Parsed ${newIds.length} video ID(s) from rawUrls\n`));

  // Internal duplicates
  const seen = new Map<string, number[]>();
  newIds.forEach((id, i) => {
    if (!seen.has(id)) seen.set(id, []);
    seen.get(id)!.push(i);
  });
  const internalDups = [...seen.entries()].filter(([, indices]) => indices.length > 1);
  const uniqueNewIds = [...new Set(newIds)];

  if (internalDups.length > 0) {
    console.log(fmt.warn('Duplicates in input:'));
    for (const [id, indices] of internalDups) {
      const positions = indices.map((i) => `#${i + 1}`).join(', ');
      console.log(`  ${id} — appears ${indices.length}x (${positions})`);
    }
    console.log('');
  }

  // Check against existing playlist
  const content = readFileSync(VIDEO_FILE, 'utf-8');
  const existingIds = new Set(extractExistingIds(content));
  const existingDups = uniqueNewIds.filter((id) => existingIds.has(id));

  if (existingDups.length > 0) {
    console.log(fmt.warn('Already in playlist (skipping):'));
    for (const id of existingDups) {
      console.log(`  ${id} — https://www.youtube.com/watch?v=${id}`);
    }
    console.log('');
  }

  const trulyNew = uniqueNewIds.filter((id) => !existingIds.has(id));
  if (trulyNew.length === 0) {
    console.log(fmt.err('All videos are already in the playlist — nothing to add'));
    process.exit(0);
  }

  // Validate via oEmbed
  console.log(fmt.section('Validating new videos via YouTube oEmbed...'));
  const valid: string[] = [];
  const invalid: string[] = [];
  const errors: string[] = [];

  const batchSize = 5;
  for (let i = 0; i < trulyNew.length; i += batchSize) {
    const batch = trulyNew.slice(i, i + batchSize);
    const results = await Promise.all(batch.map((id) => checkVideo(id)));

    for (let j = 0; j < batch.length; j++) {
      const id = batch[j];
      const status = results[j];
      if (status === 'ok') {
        valid.push(id);
        console.log(fmt.ok(`  ${id} ✓`));
      } else if (status === 'invalid') {
        invalid.push(id);
        console.log(fmt.err(`  ${id} ✗ — not found or private`));
      } else {
        errors.push(id);
        console.log(fmt.warn(`  ${id} ? — could not check`));
      }
    }
    if (i + batchSize < trulyNew.length) await new Promise((r) => setTimeout(r, 500));
  }

  console.log('');
  console.log(fmt.section('Results'));
  console.log(`  ${fmt.ok(`${valid.length} valid`)}`);
  if (invalid.length > 0) console.log(`  ${fmt.err(`${invalid.length} invalid`)}`);
  if (errors.length > 0) console.log(`  ${fmt.warn(`${errors.length} unchecked`)}`);

  // Auto-apply valid ones
  if (valid.length > 0) {
    const updated = addIdsToPlaylist(content, valid);
    writeFileSync(VIDEO_FILE, updated);
    console.log(fmt.ok(`\n✅ Added ${valid.length} video(s) to VideoDialog.svelte`));
    console.log(fmt.note(`  ${VIDEO_FILE}`));
    if (errors.length > 0) {
      console.log(fmt.warn(`  ${errors.length} unchecked video(s) were NOT added (run again)`));
    }
  }

  process.exit(0);
}

await main();
