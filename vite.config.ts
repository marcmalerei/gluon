import { resolve } from 'node:path';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
import { browserTarget } from './vitest.browser-target.js';

const entry = {
  index: resolve(import.meta.dirname, 'src/index.ts'),
  styles: resolve(import.meta.dirname, 'src/styles/index.ts'),
  quarks: resolve(import.meta.dirname, 'src/quarks/index.ts'),
  atoms: resolve(import.meta.dirname, 'src/atoms/index.ts'),
  molecules: resolve(import.meta.dirname, 'src/molecules/index.ts'),
  organisms: resolve(import.meta.dirname, 'src/organisms/index.ts'),
};

export default defineConfig({
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },
  resolve: {
    conditions: ['browser'],
    alias: {
      '@gluonjs/core': resolve(import.meta.dirname, 'src/index.ts'),
      '@gluonjs/devtools-api': resolve(import.meta.dirname, 'packages/devtools-api/src/index.ts'),
      '@gluonjs/reactivity': resolve(import.meta.dirname, 'packages/reactivity/src/index.ts'),
      '@gluonjs/router/memory': resolve(import.meta.dirname, 'packages/router/src/memory.ts'),
      '@gluonjs/router': resolve(import.meta.dirname, 'packages/router/src/index.ts'),
      '@gluonjs/ssr/hydration': resolve(import.meta.dirname, 'packages/ssr/src/hydration.ts'),
      '@gluonjs/ssr/streaming': resolve(import.meta.dirname, 'packages/ssr/src/streaming.ts'),
      '@gluonjs/ssr': resolve(import.meta.dirname, 'packages/ssr/src/index.ts'),
      '@gluonjs/store': resolve(import.meta.dirname, 'packages/store/src/index.ts'),
    },
  },
  build: {
    emptyOutDir: true,
    minify: 'oxc',
    lib: {
      entry,
      formats: ['es'],
    },
    rollupOptions: {
      external: ['@gluonjs/reactivity'],
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
  test: {
    include: ['tests/**/*.spec.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: browserTarget }],
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'packages/ssr/src/hydration.ts'],
      exclude: ['packages/**'],
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
