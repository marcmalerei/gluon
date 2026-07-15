import { resolve } from 'node:path';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
import { browserTarget } from './vitest.browser-target.js';

export default defineConfig({
  resolve: {
    alias: {
      '@gluonjs/core': resolve(import.meta.dirname, 'src/index.ts'),
      '@gluonjs/reactivity': resolve(import.meta.dirname, 'packages/reactivity/src/index.ts'),
      '@gluonjs/router': resolve(import.meta.dirname, 'packages/router/src/index.ts'),
      '@gluonjs/store': resolve(import.meta.dirname, 'packages/store/src/index.ts'),
      '@gluonjs/ssr': resolve(import.meta.dirname, 'packages/ssr/src/index.ts'),
      '@gluonjs/test-utils/ssr': resolve(import.meta.dirname, 'packages/test-utils/src/ssr.ts'),
      '@gluonjs/test-utils': resolve(import.meta.dirname, 'packages/test-utils/src/index.ts'),
    },
  },
  test: {
    include: ['tests/test-utils.spec.ts', 'tests/test-utils-ssr.spec.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: browserTarget }],
    },
    coverage: {
      provider: 'v8',
      include: ['packages/test-utils/src/**/*.ts'],
      reportsDirectory: 'coverage/test-utils',
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
