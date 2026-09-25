import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const repositoryRoot = resolve(import.meta.dirname, '../..');

export default defineConfig({
  root: import.meta.dirname,
  resolve: {
    alias: [
      { find: '@gluonjs/core', replacement: resolve(repositoryRoot, 'src/index.ts') },
      { find: '@gluonjs/reactivity', replacement: resolve(repositoryRoot, 'packages/reactivity/src/index.ts') },
      { find: '@gluonjs/router/memory', replacement: resolve(repositoryRoot, 'packages/router/src/memory.ts') },
      { find: '@gluonjs/ssr/streaming', replacement: resolve(repositoryRoot, 'packages/ssr/src/streaming.ts') },
      { find: '@gluonjs/ssr', replacement: resolve(repositoryRoot, 'packages/ssr/src/index.ts') },
      { find: '@gluonjs/store', replacement: resolve(repositoryRoot, 'packages/store/src/index.ts') },
    ],
  },
  ssr: {
    noExternal: ['@gluonjs/core', '@gluonjs/reactivity', '@gluonjs/router', '@gluonjs/store', '@gluonjs/ssr'],
  },
  build: {
    ssr: resolve(import.meta.dirname, 'entry.ts'),
    outDir: resolve(repositoryRoot, '.tmp/ssr-load'),
    emptyOutDir: true,
    rollupOptions: {
      output: { entryFileNames: 'ssr-load.js', format: 'es' },
    },
  },
});
