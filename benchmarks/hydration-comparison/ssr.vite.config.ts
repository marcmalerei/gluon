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
  define: {
    __GLUON_DEV__: JSON.stringify(false),
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },
  ssr: {
    noExternal: ['@gluonjs/core', '@gluonjs/reactivity', '@gluonjs/router', '@gluonjs/store', '@gluonjs/ssr'],
  },
  build: {
    ssr: resolve(import.meta.dirname, 'server.ts'),
    outDir: resolve(repositoryRoot, '.tmp/hydration-comparison'),
    emptyOutDir: false,
    rollupOptions: {
      output: { entryFileNames: 'server.mjs', format: 'es' },
    },
  },
});
