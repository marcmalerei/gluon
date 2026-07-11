import { renderRequest, type SsrRequestResult } from '@gluonjs/ssr';
import { createShopApplication, createShopRoutes } from './app.js';
import { createShopStore } from './state.js';

/** Renders one isolated GLUON GOODS request through the public SSR package. */
export function renderShopRequest(url: string): Promise<SsrRequestResult> {
  return renderRequest({
    url,
    routes: (storeManager) => createShopRoutes(createShopStore(storeManager)),
    createApp: ({ router, store }) => createShopApplication(undefined, {
      router,
      storeManager: store,
      storage: null,
    }).app,
  });
}
