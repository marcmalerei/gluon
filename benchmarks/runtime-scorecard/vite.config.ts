import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const repositoryRoot = resolve(import.meta.dirname, '../..');

export default defineConfig({
  root: import.meta.dirname,
  resolve: {
    conditions: ['browser'],
    alias: {
      '@gluonjs/core': resolve(repositoryRoot, 'src/index.ts'),
      '@gluonjs/example-component-library/manifest': resolve(repositoryRoot, 'examples/component-library/library/src/manifest.ts'),
      '@gluonjs/example-component-library/product-badge': resolve(repositoryRoot, 'examples/component-library/library/src/product-badge.ts'),
      '@gluonjs/quarks': resolve(repositoryRoot, 'packages/quarks/src/index.ts'),
      '@gluonjs/reactivity': resolve(repositoryRoot, 'packages/reactivity/src/index.ts'),
      '@gluonjs/router/memory': resolve(repositoryRoot, 'packages/router/src/memory.ts'),
      '@gluonjs/ssr/hydration': resolve(repositoryRoot, 'packages/ssr/src/hydration.ts'),
      '@gluonjs/ssr': resolve(repositoryRoot, 'packages/ssr/src/index.ts'),
      '@gluonjs/store': resolve(repositoryRoot, 'packages/store/src/index.ts'),
    },
  },
  define: {
    __GLUON_DEV__: JSON.stringify(false),
  },
  build: {
    outDir: resolve(repositoryRoot, '.tmp/runtime-scorecard'),
    emptyOutDir: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4177,
    strictPort: true,
  },
});
