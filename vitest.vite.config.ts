import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@gluonjs/compiler': resolve(import.meta.dirname, 'packages/compiler/src/index.ts'),
      '@gluonjs/core': resolve(import.meta.dirname, 'src/index.ts'),
      '@gluonjs/vite': resolve(import.meta.dirname, 'packages/vite/src/index.ts'),
    },
  },
  test: {
    include: ['tests-node/compiler-vite.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/compiler/src/**/*.ts', 'packages/vite/src/index.ts'],
      reportsDirectory: 'coverage/vite',
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
