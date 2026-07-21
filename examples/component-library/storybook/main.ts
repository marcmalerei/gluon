import { resolve } from 'node:path';
import type { StorybookConfig } from '@storybook/web-components-vite';
const config: StorybookConfig = { stories: ['../stories/**/*.stories.ts'], addons: ['@storybook/addon-a11y'], framework: '@storybook/web-components-vite', viteFinal: async (current) => ({ ...current, resolve: { ...current.resolve, alias: { '@gluonjs/core': resolve(import.meta.dirname, '../../../src/index.ts'), '@gluonjs/quarks': resolve(import.meta.dirname, '../../../packages/quarks/src/index.ts'), '@gluonjs/reactivity': resolve(import.meta.dirname, '../../../packages/reactivity/src/index.ts'), '@gluonjs/example-component-library': resolve(import.meta.dirname, '../library/src/index.ts') } } }) };
export default config;
