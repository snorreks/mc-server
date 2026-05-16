import { defineConfig } from '@snorreks/firestack';
import { PROJECT_ID } from '../config.ts'

export default defineConfig(() => ({
  modes: {
    production: PROJECT_ID,
  },
  region: 'europe-west1',
  nodeVersion: '22',
  engine: 'bun' as const,
  minify: true,
  sourcemap: true,
  includeFilePath: 'src/logger.ts',
}));
