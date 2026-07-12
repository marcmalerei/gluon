import { adoptStyles, unadoptStyles } from '@gluonjs/core';
import { createApp as createVueApp, type App } from 'vue';
import { shopStyles } from '../../examples/shop/src/styles.js';
import { registerProductConfigurator } from '../../examples/shop/src/product-configurator.js';
import VueProductHost from './VueProductHost.vue';
import { vueHostStyles } from './vue-host-styles.js';

export interface VueHostMount {
  readonly app: App<Element>;
  unmount(): void;
}

export function mountVueHost(target: string | Element = '#vue-host'): VueHostMount {
  registerProductConfigurator();
  adoptStyles(document, shopStyles, vueHostStyles);
  const app = createVueApp(VueProductHost);
  app.mount(target);
  return Object.freeze({
    app,
    unmount() {
      app.unmount();
      unadoptStyles(document, vueHostStyles, shopStyles);
    },
  });
}

if (document.querySelector('#vue-host')) mountVueHost();
