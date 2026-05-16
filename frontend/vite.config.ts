import { builtinModules } from 'node:module';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const port = Number(process.env.PORT || 5173);

// Native Node.js modules that should never be bundled
const NODE_BUILTINS = [
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
];

// Server-only packages (firebase-admin, googleapis)
const SERVER_ONLY_PACKAGES = [
  'firebase-admin',
  'firebase-admin/app',
  'firebase-admin/auth',
  'firebase-admin/firestore',
  'googleapis',
  'google-auth-library',
  '@google-cloud/firestore',
];

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  envPrefix: ['PUBLIC_'],
  build: {
    rollupOptions: {
      external: [...SERVER_ONLY_PACKAGES, ...NODE_BUILTINS],
      onwarn(warning, warn) {
        if (
          warning.code === 'EVAL' ||
          warning.message.includes('Use of direct `eval`')
        ) {
          return;
        }
        warn(warning);
      },
    },
  },
  ssr: {
    external: [...SERVER_ONLY_PACKAGES, ...NODE_BUILTINS],
  },
  server: {
    port,
  },
});
