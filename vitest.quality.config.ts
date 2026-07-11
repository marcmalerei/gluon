import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@gluonjs/core': resolve(import.meta.dirname, 'src/index.ts'),
      '@gluonjs/reactivity': resolve(import.meta.dirname, 'packages/reactivity/src/index.ts'),
      '@gluonjs/router/memory': resolve(import.meta.dirname, 'packages/router/src/memory.ts'),
      '@gluonjs/store': resolve(import.meta.dirname, 'packages/store/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests-node/quality-property-fuzz.spec.ts'],
  },
});
