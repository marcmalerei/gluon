import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests-node/vue-migration-analyzer.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/vue-migration-analyzer/src/index.ts', 'packages/vue-migration-analyzer/src/schema.ts'],
      reportsDirectory: 'coverage/vue-migration-analyzer',
      reporter: ['text', 'html'],
      thresholds: { statements: 75, branches: 65, functions: 75, lines: 75 }
    }
  }
});
