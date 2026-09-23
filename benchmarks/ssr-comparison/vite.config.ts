import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const repositoryRoot = resolve(import.meta.dirname, '../..');

export default defineConfig({
  root: import.meta.dirname,
  resolve: {
    alias: {
      '@gluonjs/core': resolve(repositoryRoot, 'src/index.ts'),
      '@gluonjs/reactivity': resolve(repositoryRoot, 'packages/reactivity/src/index.ts'),
      '@gluonjs/router/memory': resolve(repositoryRoot, 'packages/router/src/memory.ts'),
      '@gluonjs/ssr': resolve(repositoryRoot, 'packages/ssr/src/index.ts'),
      '@gluonjs/store': resolve(repositoryRoot, 'packages/store/src/index.ts'),
    },
  },
  ssr: {
    noExternal: ['@gluonjs/core', '@gluonjs/reactivity', '@gluonjs/router', '@gluonjs/store', '@gluonjs/ssr'],
  },
  build: {
    ssr: resolve(import.meta.dirname, 'entry.ts'),
    outDir: resolve(repositoryRoot, '.tmp/ssr-comparison'),
    emptyOutDir: true,
    rollupOptions: {
      output: { entryFileNames: 'ssr.js', format: 'es' },
    },
  },
});
