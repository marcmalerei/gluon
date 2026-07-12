import { adoptStyles } from '@gluonjs/core';
import { createRouter, createWebHistory } from '@gluonjs/router';
import { routes } from './routes.js';
import { createStoreManager } from '@gluonjs/store';
import { createStyleManifest } from '@gluonjs/ssr';
import { hydrateApplication, hydrateRequestState, readHydrationState } from '@gluonjs/ssr/hydration';
import { createStarterApplication } from './app.js';
import { starterStyles } from './styles.js';

const container = document.querySelector<HTMLElement>('#app');
if (!container) throw new Error('The Gluon starter requires an #app mount element.');

const router = createRouter({ history: createWebHistory(), routes });
await router.isReady();
if (document.querySelector('script[data-gluon-state]')) {
  const state = readHydrationState();
  const storeManager = createStoreManager();
  await hydrateRequestState(state, router, storeManager);
  const { app } = createStarterApplication({ router, storeManager });
  await hydrateApplication(app, container, {
    state: { server: state.store, client: storeManager.dehydrate() },
    styles: createStyleManifest([starterStyles]),
    styleRoot: document,
  });
} else {
  adoptStyles(document, starterStyles);
  createStarterApplication({ router }).app.mount(container);
}
