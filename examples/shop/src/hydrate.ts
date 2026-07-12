import { hydrateApplication, hydrateRequestState, readHydrationState } from '@gluonjs/ssr/hydration';
import { createRouter, createWebHistory } from '@gluonjs/router';
import { createStoreManager } from '@gluonjs/store';
import { createShopApplication, createShopRoutes } from './app.js';
import { createShopStore } from './state.js';
import { shopHydrationStyleSelection } from './styles.js';

/** Restores the request snapshots and hydrates the server-rendered GLUON GOODS root. */
export async function hydrateShop(
  container: HTMLElement,
  stateRoot: ParentNode = document,
) {
  const storeManager = createStoreManager();
  let router: ReturnType<typeof createRouter> | undefined;
  let uiOwner: ReturnType<typeof createShopApplication>['uiOwner'];
  try {
    const state = readHydrationState(stateRoot);
    const store = createShopStore(storeManager);
    router = createRouter({
      history: createWebHistory(),
      routes: createShopRoutes(store),
      scrollBehavior: (_to, _from, saved) => saved ?? { left: 0, top: 0 },
    });
    await hydrateRequestState(state, router, storeManager);
    const shop = createShopApplication(undefined, {
      router,
      storeManager,
      storage: null,
      styleTarget: document,
      hydrateStyles: true,
    });
    uiOwner = shop.uiOwner;
    const hydrated = await hydrateApplication(shop.app, container, {
      state: { server: state.store, client: storeManager.dehydrate() },
      styleSelection: shopHydrationStyleSelection,
      styleRoot: document,
    });
    return Object.freeze({ ...hydrated, router, storeManager, store, uiOwner: shop.uiOwner! });
  } catch (error) {
    router?.destroy();
    storeManager.dispose();
    uiOwner?.dispose();
    throw error;
  }
}
