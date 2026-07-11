import { hydrateApplication, hydrateRequestState, readHydrationState } from '@gluonjs/ssr/hydration';
import { createRouter, createWebHistory } from '@gluonjs/router';
import { createStoreManager } from '@gluonjs/store';
import { createShopApplication, createShopRoutes } from './app.js';
import { createShopStore } from './state.js';

/** Restores the request snapshots and hydrates the server-rendered GLUON GOODS root. */
export async function hydrateShop(
  container: HTMLElement,
  stateRoot: ParentNode = document,
) {
  const state = readHydrationState(stateRoot);
  const storeManager = createStoreManager();
  const store = createShopStore(storeManager);
  const router = createRouter({
    history: createWebHistory(),
    routes: createShopRoutes(store),
    scrollBehavior: (_to, _from, saved) => saved ?? { left: 0, top: 0 },
  });
  await hydrateRequestState(state, router, storeManager);
  const { app } = createShopApplication(undefined, {
    router,
    storeManager,
    storage: null,
  });
  const hydrated = await hydrateApplication(app, container, {
    state: { server: state.store, client: storeManager.dehydrate() },
  });
  return Object.freeze({ ...hydrated, router, storeManager, store });
}
