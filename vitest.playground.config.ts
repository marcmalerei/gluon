import { resolve } from 'node:path';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: {
    '@gluonjs/compiler/diagnostics': resolve(import.meta.dirname, 'packages/compiler/src/diagnostics.ts'),
    '@gluonjs/compiler': resolve(import.meta.dirname, 'packages/compiler/src/index.ts'),
    '@gluonjs/core': resolve(import.meta.dirname, 'src/index.ts'),
    '@gluonjs/language-server': resolve(import.meta.dirname, 'packages/language-server/src/index.ts'),
    '@gluonjs/reactivity': resolve(import.meta.dirname, 'packages/reactivity/src/index.ts'),
  } },
  test: {
    browser: { enabled: true, provider: playwright(), instances: [{ browser: 'chromium' }] },
    include: ['tests/playground.browser.ts'],
  },
});
