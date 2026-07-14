import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const repositoryRoot = resolve(import.meta.dirname, '../..');

export default defineConfig({
  root: import.meta.dirname,
  resolve: {
    conditions: ['browser'],
    alias: {
      '@gluonjs/core': resolve(repositoryRoot, 'src/index.ts'),
      '@gluonjs/reactivity': resolve(repositoryRoot, 'packages/reactivity/src/index.ts'),
    },
  },
  build: {
    outDir: resolve(repositoryRoot, '.tmp/renderer-allocation-benchmark'),
    emptyOutDir: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4176,
    strictPort: true,
  },
});
