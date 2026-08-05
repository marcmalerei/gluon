import { resolve } from 'node:path';
import { mergeConfig } from 'vitest/config';
import baseConfig from './vite.config.js';

export default mergeConfig(baseConfig, {
  resolve: {
    alias: {
      '@gluonjs/core': resolve(import.meta.dirname, 'src/index.ts'),
      '@gluonjs/i18n': resolve(import.meta.dirname, 'packages/i18n/src/index.ts'),
      '@gluonjs/reactivity': resolve(import.meta.dirname, 'packages/reactivity/src/index.ts'),
    },
  },
  test: {
    include: ['tests/i18n.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/i18n/src/**/*.ts'],
      reportsDirectory: 'coverage/i18n',
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
