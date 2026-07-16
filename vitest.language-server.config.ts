import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@gluonjs/compiler': resolve(import.meta.dirname, 'packages/compiler/src/index.ts') } },
  test: {
    environment: 'node',
    include: ['tests-node/language-server.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/language-server/src/index.ts', 'packages/language-server/src/project-analyzer.ts', 'packages/language-server/src/protocol.ts'],
      reportsDirectory: 'coverage/language-server',
      reporter: ['text', 'html'],
      thresholds: { statements: 90, branches: 85, functions: 90, lines: 90 }
    }
  }
});
