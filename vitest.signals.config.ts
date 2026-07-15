import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@gluonjs/reactivity/preact-signals': resolve(import.meta.dirname, 'packages/reactivity/src/preact-signals.ts'),
      '@gluonjs/reactivity/signals': resolve(import.meta.dirname, 'packages/reactivity/src/signals/index.ts'),
      '@gluonjs/reactivity': resolve(import.meta.dirname, 'packages/reactivity/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests-node/signals.spec.ts', 'tests-node/signals-preact.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/reactivity/src/signals/**/*.ts', 'packages/reactivity/src/preact-signals.ts'],
      reportsDirectory: 'coverage/signals',
      reporter: ['text', 'html'],
      thresholds: {
        statements: 95,
        branches: 90,
        functions: 95,
        lines: 95
      }
    }
  }
});
