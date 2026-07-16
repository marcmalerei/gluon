import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import { transpileGluonDecorators } from './packages/compiler/src/index.js';

export default defineConfig({
  plugins: [{
    name: 'gluon-decorator-tests',
    enforce: 'pre',
    transform(code, id) {
      if (!/from\s+['"][^'"]*\/decorators(?:\.js)?['"]/.test(code)) return null;
      return transpileGluonDecorators(code, id);
    },
  }],
  resolve: {
    alias: {
      '@gluonjs/core/decorators': resolve(import.meta.dirname, 'src/decorators.ts'),
      '@gluonjs/core': resolve(import.meta.dirname, 'src/index.ts'),
      '@gluonjs/reactivity/signals': resolve(import.meta.dirname, 'packages/reactivity/src/signals/index.ts'),
      '@gluonjs/reactivity': resolve(import.meta.dirname, 'packages/reactivity/src/index.ts'),
      '@gluonjs/router/memory': resolve(import.meta.dirname, 'packages/router/src/memory.ts'),
      '@gluonjs/ssr/streaming': resolve(import.meta.dirname, 'packages/ssr/src/streaming.ts'),
      '@gluonjs/ssr/static': resolve(import.meta.dirname, 'packages/ssr/src/static.ts'),
      '@gluonjs/ssr/eleventy': resolve(import.meta.dirname, 'packages/ssr/src/eleventy.ts'),
      '@gluonjs/ssr': resolve(import.meta.dirname, 'packages/ssr/src/index.ts'),
      '@gluonjs/store': resolve(import.meta.dirname, 'packages/store/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests-node/ssr.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/ssr/src/eleventy.ts', 'packages/ssr/src/index.ts', 'packages/ssr/src/static.ts', 'packages/ssr/src/streaming.ts'],
      reportsDirectory: 'coverage/ssr',
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
