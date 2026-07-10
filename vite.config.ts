import { resolve } from 'node:path';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const entry = {
  index: resolve(import.meta.dirname, 'src/index.ts'),
  styles: resolve(import.meta.dirname, 'src/styles/index.ts'),
  quarks: resolve(import.meta.dirname, 'src/quarks/index.ts'),
  atoms: resolve(import.meta.dirname, 'src/atoms/index.ts'),
  molecules: resolve(import.meta.dirname, 'src/molecules/index.ts'),
  organisms: resolve(import.meta.dirname, 'src/organisms/index.ts'),
};

export default defineConfig({
  build: {
    emptyOutDir: true,
    minify: 'oxc',
    lib: {
      entry,
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
  test: {
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
});
