import { hydrateApplication, hydrateRequestState, readHydrationState } from '@gluonjs/ssr/hydration';
import { createStyleManifest } from '@gluonjs/ssr';
import { installUi } from '@gluonjs/atoms';
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
  const uiOwner = installUi(document, { theme: 'light', hydrate: true });
  const storeManager = createStoreManager();
  let router: ReturnType<typeof createRouter> | undefined;
  try {
    const state = readHydrationState(stateRoot);
    const store = createShopStore(storeManager);
    router = createRouter({
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
      styles: createStyleManifest(shopHydrationStyleSelection),
      styleRoot: document,
    });
    return Object.freeze({ ...hydrated, router, storeManager, store, uiOwner });
  } catch (error) {
    router?.destroy();
    storeManager.dispose();
    uiOwner.dispose();
    throw error;
  }
}
