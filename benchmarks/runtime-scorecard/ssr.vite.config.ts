import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const repositoryRoot = resolve(import.meta.dirname, '../..');

export default defineConfig({
  resolve: {
    alias: {
      '@gluonjs/core': resolve(repositoryRoot, 'src/index.ts'),
      '@gluonjs/reactivity': resolve(repositoryRoot, 'packages/reactivity/src/index.ts'),
      '@gluonjs/router/memory': resolve(repositoryRoot, 'packages/router/src/memory.ts'),
      '@gluonjs/router': resolve(repositoryRoot, 'packages/router/src/index.ts'),
      '@gluonjs/ssr': resolve(repositoryRoot, 'packages/ssr/src/index.ts'),
      '@gluonjs/store': resolve(repositoryRoot, 'packages/store/src/index.ts'),
    },
  },
  define: {
    __GLUON_DEV__: JSON.stringify(false),
  },
  build: {
    ssr: resolve(import.meta.dirname, 'ssr.ts'),
    outDir: resolve(repositoryRoot, '.tmp/runtime-scorecard-node'),
    emptyOutDir: true,
    rollupOptions: {
      output: { entryFileNames: 'ssr.js' },
    },
  },
});
