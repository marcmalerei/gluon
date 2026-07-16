import {
  KeepAlive,
  createApp,
  html,
  type GluonApp,
  type StyleTarget,
} from '@gluonjs/core';
import type { UiOwner } from '@gluonjs/atoms';
import {
  BagOverlay,
  SiteFooter,
  SiteHeader,
  disposeShopDialogs,
} from './components.js';
import {
  createRouter,
  createRouterPlugin,
  RouterView,
  type Router,
  type RouterHistory,
  type RouteRecordRaw,
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
  CheckoutPage,
  OrderConfirmationPage,
  ShippingPage,
} from './pages.js';
import { createShopStore, type ShopStore } from './state.js';
import type { ProductConfiguratorRenderer } from './product-configurator.js';
import { installShopUi } from './styles.js';

export interface ShopApplication {
  readonly app: GluonApp;
  readonly router: Router;
  readonly storeManager: StoreManager;
  readonly store: ShopStore;
  readonly uiOwner?: UiOwner;
}

export interface ShopApplicationOptions {
  readonly storage?: StorageLike | null;
  readonly router?: Router;
  readonly storeManager?: StoreManager;
  readonly styleTarget?: StyleTarget;
  readonly hydrateStyles?: boolean;
}

export function createShopApplication(
  history: RouterHistory | undefined,
  options: ShopApplicationOptions = {},
): ShopApplication {
  if (!options.router && !history) throw new Error('A shop application requires a Router or history.');
  const storage = options.storage === undefined
    ? globalThis.localStorage
    : options.storage;
  const ownsStoreManager = options.storeManager === undefined;
  const storeManager = options.storeManager ?? createStoreManager({
    plugins: storage
      ? [createPersistencePlugin({ storage, namespace: 'gluon-goods' })]
      : [],
  });
  const store = createShopStore(storeManager);
  const router = options.router ?? createRouter({
    history: history!,
    routes: createShopRoutes(store),
    scrollBehavior: (_to, _from, saved) => saved ?? { left: 0, top: 0 },
  });
  router.afterEach(() => {
    store.menuOpen = false;
    store.searchOpen = false;
    store.bagOpen = false;
  });
  const app = createApp(() => {
    const route = router.currentRoute.value;
    return html`
      <a class="skip-link" href="#main-content">Skip to content</a>
      ${SiteHeader(store)}
      <main id="main-content">${KeepAlive({
        cacheKey: route.fullPath,
        max: 4,
        children: RouterView(),
      })}</main>
      ${SiteFooter()}
      ${BagOverlay(store)}
    `;
  });
  app.use(createRouterPlugin(router));
  let uiOwner: UiOwner | undefined;
  try {
    uiOwner = options.styleTarget
      ? installShopUi(options.styleTarget, { hydrate: options.hydrateStyles })
      : undefined;
  } catch (error) {
    if (!options.router) router.destroy();
    if (ownsStoreManager) storeManager.dispose();
    throw error;
  }
  if (ownsStoreManager) app.onUnmounted(() => storeManager.dispose());
  app.onUnmounted(() => {
    disposeShopDialogs();
    uiOwner?.dispose();
  });
  return { app, router, storeManager, store, ...(uiOwner ? { uiOwner } : {}) };
}

export function createShopRoutes(
  store: ShopStore,
  renderProductConfigurator?: ProductConfiguratorRenderer,
): readonly RouteRecordRaw[] {
  return [
    { path: '/', name: 'home', component: () => HomePage(store) },
    { path: '/shop', name: 'shop', component: () => CatalogPage(store) },
    {
      path: '/products/:slug',
      name: 'product',
      component: () => ProductPage(store, renderProductConfigurator),
    },
    { path: '/shipping', name: 'shipping', component: () => ShippingPage(store) },
    { path: '/returns', name: 'returns', component: () => ReturnsPage(store) },
    { path: '/checkout', name: 'checkout', component: () => CheckoutPage(store) },
    { path: '/orders/:id', name: 'order', component: () => OrderConfirmationPage(store) },
    { path: '/:path*', name: 'not-found', component: () => NotFoundPage(store) },
  ];
}
