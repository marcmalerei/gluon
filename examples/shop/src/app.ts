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
  CatalogPage,
  HomePage,
  NotFoundPage,
  ProductPage,
  ReturnsPage,
  ShippingPage,
} from './pages.js';
import { shopState } from './state.js';

export interface ShopApplication {
  readonly app: GluonApp;
  readonly router: Router;
}

export function createShopApplication(history: RouterHistory): ShopApplication {
  const router = createRouter({
    history,
    routes: [
      { path: '/', name: 'home', component: HomePage },
      { path: '/shop', name: 'shop', component: CatalogPage },
      { path: '/products/:slug', name: 'product', component: ProductPage },
      { path: '/shipping', name: 'shipping', component: ShippingPage },
      { path: '/returns', name: 'returns', component: ReturnsPage },
      { path: '/:path*', name: 'not-found', component: NotFoundPage },
    ],
    scrollBehavior: (_to, _from, saved) => saved ?? { left: 0, top: 0 },
  });
  router.afterEach(() => {
    shopState.menuOpen = false;
    shopState.searchOpen = false;
    shopState.bagOpen = false;
  });
  const app = createApp(() => html`
    ${SiteHeader()}
    <main id="main-content">${RouterView()}</main>
    ${SiteFooter()}
    ${BagDrawer()}
  `);
  app.use(createRouterPlugin(router));
  return { app, router };
}
