import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import gluon from '@gluonjs/vite';

export default defineConfig({
  root: import.meta.dirname,
  base: '/gluon/examples/signals/',
  plugins: [gluon()],
  resolve: { alias: {
    '@gluonjs/compiler': resolve(import.meta.dirname, '../../packages/compiler/src/index.ts'),
    '@gluonjs/core': resolve(import.meta.dirname, '../../src/index.ts'),
    '@gluonjs/reactivity/preact-signals': resolve(import.meta.dirname, '../../packages/reactivity/src/preact-signals.ts'),
    '@gluonjs/reactivity/signals': resolve(import.meta.dirname, '../../packages/reactivity/src/signals/index.ts'),
    '@gluonjs/reactivity': resolve(import.meta.dirname, '../../packages/reactivity/src/index.ts'),
    '@gluonjs/vite': resolve(import.meta.dirname, '../../packages/vite/src/index.ts')
  } },
  build: { outDir: 'dist', emptyOutDir: true }
});
