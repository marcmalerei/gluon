import { resolve } from 'node:path';
import vue from '@vitejs/plugin-vue';
import gluon from '@gluonjs/vite';
import { defineConfig } from 'vite';

const repositoryRoot = resolve(import.meta.dirname, '../..');

export default defineConfig({
  plugins: [gluon(), vue({
    template: {
      compilerOptions: {
        isCustomElement: (tag) => tag === 'gluon-product-configurator',
      },
    },
  })],
  root: import.meta.dirname,
  base: '/gluon/1.2.0/examples/',
  resolve: {
    alias: {
      '@gluonjs/core/decorators': resolve(repositoryRoot, 'src/decorators.ts'),
      '@gluonjs/core': resolve(repositoryRoot, 'src/index.ts'),
      '@gluonjs/quarks': resolve(repositoryRoot, 'packages/quarks/src/index.ts'),
      '@gluonjs/atoms': resolve(repositoryRoot, 'packages/atoms/src/index.ts'),
      '@gluonjs/molecules': resolve(repositoryRoot, 'packages/molecules/src/index.ts'),
      '@gluonjs/organisms': resolve(repositoryRoot, 'packages/organisms/src/index.ts'),
      '@gluonjs/reactivity/signals': resolve(repositoryRoot, 'packages/reactivity/src/signals/index.ts'),
      '@gluonjs/reactivity': resolve(repositoryRoot, 'packages/reactivity/src/index.ts'),
    },
  },
  build: {
    outDir: '../dist/1.2.0/examples',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        plain: resolve(import.meta.dirname, 'plain.html'),
        ui: resolve(import.meta.dirname, 'ui.html'),
        vue: resolve(import.meta.dirname, 'vue.html'),
      },
    },
  },
});
