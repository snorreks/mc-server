import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from '@sveltejs/adapter-netlify';

const projectDirectory = dirname(fileURLToPath(import.meta.url));
const rootDirectory = resolve(projectDirectory, '..');

const config = {
  preprocess: [vitePreprocess()],
  kit: {
    adapter: adapter(),
    alias: {
      $logger: resolve(projectDirectory, 'src/lib/utils/logger.ts'),
      $config: resolve(rootDirectory, 'config.ts'),
      $lib: resolve(projectDirectory, 'src/lib'),
      '$components/*': resolve(projectDirectory, 'src/lib/components/*'),
      '$types': resolve(projectDirectory, 'src/lib/types.ts'),
    },
    env: {
      publicPrefix: 'PUBLIC_',
    },
  },
};

export default config;
