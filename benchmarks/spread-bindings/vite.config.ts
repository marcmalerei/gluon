import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const repositoryRoot = resolve(import.meta.dirname, '../..');

export default defineConfig({
  root: import.meta.dirname,
  resolve: {
    conditions: ['browser'],
    alias: {
      '@gluonjs/core': resolve(repositoryRoot, 'src/index.ts'),
    },
  },
  define: {
    __GLUON_DEV__: JSON.stringify(false),
  },
  build: {
    outDir: resolve(repositoryRoot, '.tmp/spread-binding-benchmark'),
    emptyOutDir: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4178,
    strictPort: true,
  },
});
