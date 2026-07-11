import { createApp, html, type GluonApp } from '@gluonjs/core';
import {
  BagDrawer,
  SiteFooter,
  SiteHeader,
} from './components.js';
import {
  createRouter,
  createRouterPlugin,
  RouterView,
  type Router,
  type RouterHistory,
} from '@gluonjs/router';
import {
  createPersistencePlugin,
  createStoreManager,
  type StorageLike,
  type StoreManager,
} from '@gluonjs/store';
import {
  CatalogPage,
  HomePage,
  NotFoundPage,
  ProductPage,
  ReturnsPage,
  ShippingPage,
} from './pages.js';
import { createShopStore, type ShopStore } from './state.js';

export interface ShopApplication {
  readonly app: GluonApp;
  readonly router: Router;
  readonly storeManager: StoreManager;
  readonly store: ShopStore;
}

export interface ShopApplicationOptions {
  readonly storage?: StorageLike | null;
}

export function createShopApplication(
  history: RouterHistory,
  options: ShopApplicationOptions = {},
): ShopApplication {
  const storage = options.storage === undefined
    ? globalThis.localStorage
    : options.storage;
  const storeManager = createStoreManager({
    plugins: storage
      ? [createPersistencePlugin({ storage, namespace: 'gluon-goods' })]
      : [],
  });
  const store = createShopStore(storeManager);
  const router = createRouter({
    history,
    routes: [
      { path: '/', name: 'home', component: () => HomePage(store) },
      { path: '/shop', name: 'shop', component: () => CatalogPage(store) },
      { path: '/products/:slug', name: 'product', component: () => ProductPage(store) },
      { path: '/shipping', name: 'shipping', component: () => ShippingPage(store) },
      { path: '/returns', name: 'returns', component: () => ReturnsPage(store) },
      { path: '/:path*', name: 'not-found', component: () => NotFoundPage(store) },
    ],
    scrollBehavior: (_to, _from, saved) => saved ?? { left: 0, top: 0 },
  });
  router.afterEach(() => {
    store.menuOpen = false;
    store.searchOpen = false;
    store.bagOpen = false;
  });
  const app = createApp(() => html`
    ${SiteHeader(store)}
    <main id="main-content">${RouterView()}</main>
    ${SiteFooter()}
    ${BagDrawer(store)}
  `);
  app.use(createRouterPlugin(router));
  app.onUnmounted(() => storeManager.dispose());
  return { app, router, storeManager, store };
}
