import { renderRequest, type AssetManifest, type SsrRequestResult } from '@gluonjs/ssr';
import { createShopApplication, createShopRoutes } from './app.js';
import { createShopStore } from './state.js';
import { shopStyles } from './styles.js';

export interface ShopServerRequestOptions {
  readonly assets?: AssetManifest;
  readonly nonce?: string;
}

/** Renders one isolated GLUON GOODS request through the public SSR package. */
export function renderShopRequest(
  url: string,
  options: ShopServerRequestOptions = {},
): Promise<SsrRequestResult> {
  return renderRequest({
    url,
    assets: options.assets,
    nonce: options.nonce,
    styles: [shopStyles],
    routes: (storeManager) => createShopRoutes(createShopStore(storeManager)),
    createApp: ({ router, store }) => createShopApplication(undefined, {
      router,
      storeManager: store,
      storage: null,
    }).app,
  });
}
