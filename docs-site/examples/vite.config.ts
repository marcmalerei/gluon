import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const repositoryRoot = resolve(import.meta.dirname, '../..');

export default defineConfig({
  root: import.meta.dirname,
  base: '/gluon/0.0.0/examples/',
  resolve: {
    alias: {
      '@gluonjs/core': resolve(repositoryRoot, 'src/index.ts'),
      '@gluonjs/reactivity': resolve(repositoryRoot, 'packages/reactivity/src/index.ts'),
    },
  },
  build: {
    outDir: '../dist/0.0.0/examples',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        plain: resolve(import.meta.dirname, 'plain.html'),
        vue: resolve(import.meta.dirname, 'vue.html'),
      },
    },
  },
});
