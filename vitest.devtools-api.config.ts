import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: {
    '@gluonjs/core': resolve(import.meta.dirname, 'src/index.ts'),
    '@gluonjs/devtools-api': resolve(import.meta.dirname, 'packages/devtools-api/src/index.ts'),
  } },
  test: {
    environment: 'node',
    include: ['tests-node/devtools-api.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/devtools-api/src/index.ts'],
      reportsDirectory: 'coverage/devtools-api',
      reporter: ['text', 'html'],
      thresholds: { statements: 90, branches: 85, functions: 90, lines: 90 }
    }
  }
});
