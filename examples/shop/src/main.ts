import { createWebHistory } from '@gluonjs/router';
import { createShopApplication } from './app.js';

const container = document.querySelector<HTMLElement>('#app');
if (!container) throw new Error('GLUON GOODS requires an #app mount element.');

if (document.querySelector('script[data-gluon-state]')) {
  const { hydrateShop } = await import('./hydrate.js');
  await hydrateShop(container);
} else {
  const { app, router } = createShopApplication(createWebHistory(), { styleTarget: document });
  await router.isReady();
  app.mount(container);
}
