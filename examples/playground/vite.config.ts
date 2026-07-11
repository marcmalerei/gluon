import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import gluon from '@gluonjs/vite';

export default defineConfig({
  root: import.meta.dirname,
  base: '/gluon/playground/',
  plugins: [gluon()],
  resolve: { alias: {
    '@gluonjs/compiler/diagnostics': resolve(import.meta.dirname, '../../packages/compiler/src/diagnostics.ts'),
    '@gluonjs/compiler': resolve(import.meta.dirname, '../../packages/compiler/src/index.ts'),
    '@gluonjs/core': resolve(import.meta.dirname, '../../src/index.ts'),
    '@gluonjs/language-server': resolve(import.meta.dirname, '../../packages/language-server/src/index.ts'),
    '@gluonjs/reactivity': resolve(import.meta.dirname, '../../packages/reactivity/src/index.ts'),
    '@gluonjs/vite': resolve(import.meta.dirname, '../../packages/vite/src/index.ts'),
  } },
  build: { outDir: 'dist', emptyOutDir: true },
});
