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
    lib: { entry: resolve(import.meta.dirname, 'src/index.ts'), formats: ['es'], fileName: 'index' },
    rollupOptions: { external: ['@gluonjs/core', '@gluonjs/quarks'] },
  },
});
