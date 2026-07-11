import { adoptStyles } from '@gluonjs/core';
import { createWebHistory } from '@gluonjs/router';
import { createShopApplication } from './app.js';
import { shopStyles } from './styles.js';
import { hydrateShop } from './hydrate.js';

const container = document.querySelector<HTMLElement>('#app');
if (!container) throw new Error('GLUON GOODS requires an #app mount element.');

if (document.querySelector('script[data-gluon-state]')) {
  await hydrateShop(container);
} else {
  adoptStyles(document, shopStyles);
  const { app, router } = createShopApplication(createWebHistory());
  await router.isReady();
  app.mount(container);
}
