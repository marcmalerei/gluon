import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import gluon from '@gluonjs/vite';

export default defineConfig({
  root: import.meta.dirname,
  plugins: [gluon()],
  resolve: { alias: {
    '@gluonjs/compiler': resolve(import.meta.dirname, '../../packages/compiler/src/index.ts'),
    '@gluonjs/core': resolve(import.meta.dirname, '../../src/index.ts'),
    '@gluonjs/quarks': resolve(import.meta.dirname, '../../packages/quarks/src/index.ts'),
    '@gluonjs/reactivity': resolve(import.meta.dirname, '../../packages/reactivity/src/index.ts'),
    '@gluonjs/vite': resolve(import.meta.dirname, '../../packages/vite/src/index.ts'),
  } },
  build: { outDir: 'dist', emptyOutDir: true },
});
