import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import gluon from '@gluonjs/vite';

const repositoryRoot = resolve(import.meta.dirname, '../..');

export default defineConfig({
  plugins: [gluon({ universal: true })],
  root: import.meta.dirname,
  publicDir: false,
  resolve: {
    alias: {
      '@gluonjs/core': resolve(repositoryRoot, 'src/index.ts'),
      '@gluonjs/quarks': resolve(repositoryRoot, 'packages/quarks/src/index.ts'),
      '@gluonjs/atoms': resolve(repositoryRoot, 'packages/atoms/src/index.ts'),
      '@gluonjs/molecules': resolve(repositoryRoot, 'packages/molecules/src/index.ts'),
      '@gluonjs/organisms': resolve(repositoryRoot, 'packages/organisms/src/index.ts'),
      '@gluonjs/reactivity': resolve(repositoryRoot, 'packages/reactivity/src/index.ts'),
      '@gluonjs/router/memory': resolve(repositoryRoot, 'packages/router/src/memory.ts'),
      '@gluonjs/router': resolve(repositoryRoot, 'packages/router/src/index.ts'),
      '@gluonjs/ssr/hydration': resolve(repositoryRoot, 'packages/ssr/src/hydration.ts'),
      '@gluonjs/ssr': resolve(repositoryRoot, 'packages/ssr/src/index.ts'),
      '@gluonjs/store': resolve(repositoryRoot, 'packages/store/src/index.ts'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    port: 4173,
  },
});
