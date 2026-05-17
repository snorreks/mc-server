#!/usr/bin/env bun
/**
 * scripts/src/lib/ops/convert-og-images.ts
 *
 * Converts all images in frontend/static/images/ to JPEG format for
 * social preview compatibility (Discord, Telegram, Facebook, etc. don't
 * reliably support WebP for OG images).
 *
 * Uses ImageMagick (must be installed: `brew install imagemagick` / `apt install imagemagick`).
 * Keeps original files intact — creates .jpg copies.
 *
 * Usage:
 *   bun run scripts/src/lib/ops/convert-og-images.ts
 *
 * After running, update the OG_IMAGES array in frontend/src/routes/+layout.svelte
 * with the output from this script.
 */

import { readdirSync, existsSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fmt, run } from '../cli_utils';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = resolve(__dirname, '../../../../frontend/static/images');

const SUPPORTED = ['.webp', '.png', '.jpg', '.jpeg'];

async function main() {
  console.log(fmt.head('Convert OG Images to JPEG'));

  if (!existsSync(IMAGES_DIR)) {
    console.error(fmt.err(`Directory not found: ${IMAGES_DIR}`));
    process.exit(1);
  }

  const files = readdirSync(IMAGES_DIR).filter((f) => {
    const ext = extname(f).toLowerCase();
    return SUPPORTED.includes(ext);
  });

  if (files.length === 0) {
    console.log(fmt.warn('No images found to convert'));
    process.exit(0);
  }

  console.log(fmt.note(`Found ${files.length} images in ${IMAGES_DIR}`));

  let converted = 0;
  const jpgFiles: string[] = [];

  for (const file of files) {
    const basename = file.replace(/\.[^.]+$/, '');
    const src = resolve(IMAGES_DIR, file);
    const dst = resolve(IMAGES_DIR, `${basename}.jpg`);

    if (file.endsWith('.jpg') || file.endsWith('.jpeg')) {
      // Already JPEG, just add to array
      jpgFiles.push(`${basename}.jpg`);
      continue;
    }

    if (existsSync(dst)) {
      console.log(fmt.note(`  SKIP ${file} → ${basename}.jpg (already exists)`));
      jpgFiles.push(`${basename}.jpg`);
      continue;
    }

    console.log(fmt.note(`  Converting ${file} → ${basename}.jpg...`));
    const { code, err } = await run(['magick', 'convert', src, '-quality', '85', dst]);
    if (code === 0) {
      converted++;
      jpgFiles.push(`${basename}.jpg`);
      console.log(fmt.ok(`  OK ${basename}.jpg`));
    } else {
      console.error(fmt.err(`  FAIL ${file}: ${err}`));
    }
  }

  console.log(fmt.head('Summary'));
  console.log(`  ${converted} converted, ${jpgFiles.length - converted} already JPEG`);
  console.log(fmt.ok(`Total JPEG files: ${jpgFiles.length}`));

  // Output the array for easy copy-paste into +layout.svelte
  console.log(fmt.section('OG_IMAGES array for +layout.svelte'));
  const arrayStr = jpgFiles.map((f) => `'${f}'`).join(',\n  ');
  console.log(`[\n  ${arrayStr},\n]`);
}

await main();
