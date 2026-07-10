import { adoptStyles } from '@gluonjs/core';
import { createWebHistory } from '@gluonjs/router';
import { createShopApplication } from './app.js';
import { shopStyles } from './styles.js';

adoptStyles(document, shopStyles);

const container = document.querySelector<HTMLElement>('#app');
if (!container) throw new Error('GLUON GOODS requires an #app mount element.');

const { app, router } = createShopApplication(createWebHistory());
await router.isReady();
app.mount(container);
