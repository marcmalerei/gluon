import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: { alias: {
    '@gluonjs/core': resolve(import.meta.dirname, '../../../src/index.ts'),
    '@gluonjs/quarks': resolve(import.meta.dirname, '../../../packages/quarks/src/index.ts'),
    '@gluonjs/reactivity': resolve(import.meta.dirname, '../../../packages/reactivity/src/index.ts'),
  } },
  build: {
    emptyOutDir: true,
    lib: {
      entry: {
        index: resolve(import.meta.dirname, 'src/index.ts'),
        manifest: resolve(import.meta.dirname, 'src/manifest.ts'),
        'product-badge': resolve(import.meta.dirname, 'src/product-badge.ts'),
        'product-picker': resolve(import.meta.dirname, 'src/product-picker.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: { external: ['@gluonjs/core', '@gluonjs/quarks'] },
  },
});
