import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@gluonjs/compiler/diagnostics': resolve(import.meta.dirname, 'packages/compiler/src/diagnostics.ts') } },
  test: { environment: 'node', include: ['tests-node/playground.spec.ts'] },
});
