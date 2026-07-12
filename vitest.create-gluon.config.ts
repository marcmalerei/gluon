import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@gluonjs/compiler': resolve(import.meta.dirname, 'packages/compiler/src/index.ts'),
      '@gluonjs/language-server': resolve(import.meta.dirname, 'packages/language-server/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests-node/create-gluon.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/create-gluon/src/**/*.ts'],
      exclude: ['packages/create-gluon/src/cli.ts'],
      reportsDirectory: 'coverage/create-gluon',
      reporter: ['text', 'html'],
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
      },
    },
  },
});
