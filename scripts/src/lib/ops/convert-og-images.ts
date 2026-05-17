#!/usr/bin/env bun
/**
 * scripts/src/lib/ops/convert-og-images.ts
 *
 * Converts + resizes all images in frontend/static/images/ to 1200x630px JPEG
 * for social preview compatibility (Discord, Telegram, Facebook, Twitter).
 *
 * Uses ImageMagick (must be installed: `brew install imagemagick` / `apt install imagemagick`).
 * Keeps original files intact — creates/resizes .jpg copies.
 *
 * 1200x630 is the standard OG image size. Images are center-cropped to fit.
 *
 * Usage:
 *   bun run scripts/src/lib/ops/convert-og-images.ts
 *
 * After running, the OG_IMAGES array stays the same (filenames don't change).
 */

import { readdirSync, existsSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fmt, run } from '../cli_utils';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = resolve(__dirname, '../../../../frontend/static/images');

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const SUPPORTED = ['.webp', '.png', '.jpg', '.jpeg'];

async function main() {
  console.log(fmt.head('Convert & Resize OG Images to 1200x630 JPEG'));

  if (!existsSync(IMAGES_DIR)) {
    console.error(fmt.err(`Directory not found: ${IMAGES_DIR}`));
    process.exit(1);
  }

  const files = readdirSync(IMAGES_DIR).filter((f) => {
    const ext = extname(f).toLowerCase();
    // Only process non-JPEG sources to avoid double-processing and derivative regeneration
    return ext === '.webp' || ext === '.png';
  });

  if (files.length === 0) {
    console.log(fmt.warn('No images found'));
    process.exit(0);
  }

  console.log(fmt.note(`Found ${files.length} images in ${IMAGES_DIR}\n`));

  let processed = 0;
  let skipped = 0;
  const jpgFiles: string[] = [];

  for (const file of files) {
    const basename = file.replace(/\.[^.]+$/, '');
    const src = resolve(IMAGES_DIR, file);
    const dst = resolve(IMAGES_DIR, `${basename}.jpg`);

    // Convert source to resized JPEG with padding (no crop)
    // Uses: resize to fit within 1200x630, then pad with black bands
    const args = [
      'magick', 'convert', src,
      '-resize', `${OG_WIDTH}x${OG_HEIGHT}`,
      '-background', 'black',
      '-gravity', 'center',
      '-extent', `${OG_WIDTH}x${OG_HEIGHT}`,
      '-quality', '85',
      dst,
    ];

    console.log(fmt.note(`  ${file} → ${basename}.jpg`));
    const { code, err } = await run(args);
    if (code === 0) {
      processed++;
      jpgFiles.push(`${basename}.jpg`);
      console.log(fmt.ok(`  OK (${basename}.jpg)`));
    } else {
      console.error(fmt.err(`  FAIL ${file}: ${err}`));
    }
  }

  console.log(fmt.head('Summary'));
  console.log(`  ${fmt.ok(`${processed} images → 1200x630 JPEG`)}`);
  console.log(fmt.note('OG_IMAGES array stays the same — filenames unchanged'));
}

await main();
