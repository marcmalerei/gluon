import { resolve } from 'node:path';
import type { StorybookConfig } from '@gluonjs/gluon-components-vite';

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.ts'],
  addons: ['@storybook/addon-a11y'],
  framework: '@gluonjs/gluon-components-vite',
  viteFinal: async (current) => ({
    ...current,
    resolve: {
      ...current.resolve,
      alias: {
        '@gluonjs/core': resolve(import.meta.dirname, '../../../src/index.ts'),
        '@gluonjs/quarks': resolve(import.meta.dirname, '../../../packages/quarks/src/index.ts'),
        '@gluonjs/reactivity': resolve(import.meta.dirname, '../../../packages/reactivity/src/index.ts'),
        '@gluonjs/example-component-library/manifest': resolve(import.meta.dirname, '../library/src/manifest.ts'),
        '@gluonjs/example-component-library/product-badge': resolve(import.meta.dirname, '../library/src/product-badge.ts'),
        '@gluonjs/example-component-library/product-picker': resolve(import.meta.dirname, '../library/src/product-picker.ts'),
        '@gluonjs/example-component-library': resolve(import.meta.dirname, '../library/src/index.ts'),
      },
    },
  }),
};

export default config;
