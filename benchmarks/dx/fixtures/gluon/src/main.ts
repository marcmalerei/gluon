import { createStyleSheetOwner } from '@gluonjs/core';
import { installUi } from '@gluonjs/atoms';
import { createRouter, createWebHistory } from '@gluonjs/router';
import { routes } from './routes.js';
import { createStoreManager } from '@gluonjs/store';
import { hydrateApplication, hydrateRequestState, readHydrationState } from '@gluonjs/ssr/hydration';
import { createStarterApplication } from './app.js';
import { starterHydrationStyleSelection, starterStyles } from './styles.js';

const container = document.querySelector<HTMLElement>('#app');
if (!container) throw new Error('The Gluon starter requires an #app mount element.');

const router = createRouter({ history: createWebHistory(), routes });
await router.isReady();
if (document.querySelector('script[data-gluon-state]')) {
  const uiOwner = installUi(document, { theme: 'light', hydrate: true });
  const state = readHydrationState();
  const storeManager = createStoreManager();
  try {
    await hydrateRequestState(state, router, storeManager);
    const { app, cart } = createStarterApplication({ router, storeManager });
    app.onUnmounted(() => {
      uiOwner.dispose();
      storeManager.dispose();
    });
    await hydrateApplication(app, container, {
      state: { server: state.store, client: storeManager.dehydrate() },
      styleSelection: starterHydrationStyleSelection,
      styleRoot: document,
    });
    cart.hydrate();
  } catch (error) {
    storeManager.dispose();
    uiOwner.dispose();
    throw error;
  }
} else {
  const uiOwner = installUi(document, { theme: 'light' });
const appStyleOwner = createStyleSheetOwner(document);
appStyleOwner.retain(starterStyles);
try {
  const { app, cart } = createStarterApplication({ router });
  app.onUnmounted(() => {
    appStyleOwner.dispose();
    uiOwner.dispose();
  });
  app.mount(container);
  cart.hydrate();
} catch (error) {
  appStyleOwner.dispose();
  uiOwner.dispose();
  throw error;
}
}
