import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@gluonjs/core': resolve(import.meta.dirname, 'src/index.ts'),
      '@gluonjs/reactivity': resolve(import.meta.dirname, 'packages/reactivity/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests-node/router*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'packages/router/src/history.ts',
        'packages/router/src/matcher.ts',
        'packages/router/src/query.ts',
        'packages/router/src/router.ts',
      ],
      reportsDirectory: 'coverage/router',
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
