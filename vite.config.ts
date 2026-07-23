import { resolve } from 'node:path';
import { playwright } from '@vitest/browser-playwright';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';
import {
  compileGluonSfc,
  transpileGluonDecorators,
} from './packages/compiler/src/index.js';
import { browserTarget } from './vitest.browser-target.js';

const entry = {
  decorators: resolve(import.meta.dirname, 'src/decorators.ts'),
  index: resolve(import.meta.dirname, 'src/index.ts'),
  styles: resolve(import.meta.dirname, 'src/styles/index.ts'),
};

export default defineConfig({
  plugins: [{
    name: 'gluon-decorator-tests',
    enforce: 'pre',
    transform(code, id) {
      if (!/from\s+['"][^'"]*\/decorators(?:\.js)?['"]/.test(code)) return null;
      return transpileGluonDecorators(code, id);
    },
  }, {
    name: 'gluon-sfc-tests',
    enforce: 'pre',
    transform(code, id) {
      if (!id.split('?', 1)[0]?.endsWith('.gluon')) return null;
      const compiled = compileGluonSfc(code, { filename: id });
      return transpileGluonDecorators(compiled.code, `${id}.ts`);
    },
  }, vue({
    template: {
      compilerOptions: {
        isCustomElement: (tag) => tag === 'gluon-product-configurator',
      },
    },
  })],
  optimizeDeps: {
    include: ['axe-core'],
  },
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },
  resolve: {
    conditions: ['browser'],
    alias: {
      '@gluonjs/core/decorators': resolve(import.meta.dirname, 'src/decorators.ts'),
      '@gluonjs/core': resolve(import.meta.dirname, 'src/index.ts'),
      '@gluonjs/quarks': resolve(import.meta.dirname, 'packages/quarks/src/index.ts'),
      '@gluonjs/atoms': resolve(import.meta.dirname, 'packages/atoms/src/index.ts'),
      '@gluonjs/molecules': resolve(import.meta.dirname, 'packages/molecules/src/index.ts'),
      '@gluonjs/organisms': resolve(import.meta.dirname, 'packages/organisms/src/index.ts'),
      '@gluonjs/example-component-library/manifest': resolve(import.meta.dirname, 'examples/component-library/library/src/manifest.ts'),
      '@gluonjs/example-component-library/product-badge': resolve(import.meta.dirname, 'examples/component-library/library/src/product-badge.ts'),
      '@gluonjs/example-component-library/product-picker': resolve(import.meta.dirname, 'examples/component-library/library/src/product-picker.ts'),
      '@gluonjs/example-component-library': resolve(import.meta.dirname, 'examples/component-library/library/src/index.ts'),
      '@gluonjs/devtools-api': resolve(import.meta.dirname, 'packages/devtools-api/src/index.ts'),
      '@gluonjs/reactivity/preact-signals': resolve(import.meta.dirname, 'packages/reactivity/src/preact-signals.ts'),
      '@gluonjs/reactivity/signals': resolve(import.meta.dirname, 'packages/reactivity/src/signals/index.ts'),
      '@gluonjs/reactivity': resolve(import.meta.dirname, 'packages/reactivity/src/index.ts'),
      '@gluonjs/router/memory': resolve(import.meta.dirname, 'packages/router/src/memory.ts'),
      '@gluonjs/router': resolve(import.meta.dirname, 'packages/router/src/index.ts'),
      '@gluonjs/ssr/hydration': resolve(import.meta.dirname, 'packages/ssr/src/hydration.ts'),
      '@gluonjs/ssr/eleventy': resolve(import.meta.dirname, 'packages/ssr/src/eleventy.ts'),
      '@gluonjs/ssr/streaming': resolve(import.meta.dirname, 'packages/ssr/src/streaming.ts'),
      '@gluonjs/ssr': resolve(import.meta.dirname, 'packages/ssr/src/index.ts'),
      '@gluonjs/store': resolve(import.meta.dirname, 'packages/store/src/index.ts'),
      '@gluonjs/test-utils/ssr': resolve(import.meta.dirname, 'packages/test-utils/src/ssr.ts'),
      '@gluonjs/test-utils': resolve(import.meta.dirname, 'packages/test-utils/src/index.ts'),
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
      expect: {
        toMatchScreenshot: {
          resolveScreenshotPath: ({
            arg,
            ext,
            root,
            screenshotDirectory,
            testFileDirectory,
            testFileName,
            browserName,
          }) => resolve(
            root,
            testFileDirectory,
            screenshotDirectory,
            testFileName,
            `${arg}-${browserName}${ext}`,
          ),
        },
      },
    },
    coverage: {
      provider: 'v8',
      include: [
        'src/**/*.ts',
        'packages/quarks/src/**/*.ts',
        'packages/atoms/src/**/*.ts',
        'packages/molecules/src/**/*.ts',
        'packages/organisms/src/**/*.ts',
        'packages/ssr/src/hydration.ts',
      ],
      exclude: [
        'packages/compiler/**',
        'packages/create-gluon/**',
        'packages/devtools/**',
        'packages/devtools-api/**',
        'packages/language-server/**',
        'packages/reactivity/**',
        'packages/router/**',
        'packages/ssr/src/index.ts',
        'packages/ssr/src/eleventy.ts',
        'packages/ssr/src/static.ts',
        'packages/ssr/src/streaming.ts',
        'packages/store/**',
        'packages/test-utils/**',
        'packages/vite/**',
      ],
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
