import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@gluonjs/reactivity': resolve(import.meta.dirname, 'packages/reactivity/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests-node/store.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/store/src/**/*.ts'],
      reportsDirectory: 'coverage/store',
      reporter: ['text', 'html'],
      thresholds: {
        statements: 95,
        branches: 90,
        functions: 95,
        lines: 95,
      },
    },
  },
});
