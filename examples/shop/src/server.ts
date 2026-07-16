import {
  renderElement,
  renderRequest,
  renderToString,
  type AssetManifest,
  type SsrRequestResult,
} from '@gluonjs/ssr';
import { createShopApplication, createShopRoutes } from './app.js';
import {
  ProductConfiguratorElement,
  ProductConfiguratorLightContent,
  ProductConfigurator,
  type ProductConfiguratorRenderer,
} from './product-configurator.js';
import { createShopStore } from './state.js';
import { createShopStyleSelection } from './styles.js';

export interface ShopServerRequestOptions {
  readonly assets?: AssetManifest;
  readonly nonce?: string;
}

/** Renders one isolated GLUON GOODS request through the public SSR package. */
export async function renderShopRequest(
  url: string,
  options: ShopServerRequestOptions = {},
): Promise<SsrRequestResult> {
  let productConfiguratorShadow: Promise<string> | undefined;
  const renderProductConfiguratorForServer: ProductConfiguratorRenderer = (renderOptions) => {
    productConfiguratorShadow = renderToString(renderElement(ProductConfiguratorElement, {
      properties: {
        product: renderOptions.product,
        configuration: renderOptions.configuration,
      },
      children: ProductConfiguratorLightContent(renderOptions.product),
    }), { assets: options.assets });
    return ProductConfigurator(renderOptions);
  };
  const result = await renderRequest({
    url,
    assets: options.assets,
    nonce: options.nonce,
    styles: createShopStyleSelection('light'),
    routes: (storeManager) => createShopRoutes(
      createShopStore(storeManager),
      renderProductConfiguratorForServer,
    ),
    createApp: ({ router, store }) => createShopApplication(undefined, {
      router,
      storeManager: store,
      storage: null,
    }).app,
  });
  if (!productConfiguratorShadow) return result;
  const renderedElement = await productConfiguratorShadow;
  return Object.freeze({
    ...result,
    html: injectProductConfiguratorShadow(result.html, renderedElement),
  });
}

/** @internal Verifies and installs the independently hydrated configurator ShadowRoot. */
export function injectProductConfiguratorShadow(html: string, renderedElement: string): string {
  const templateStart = renderedElement.indexOf('<template shadowrootmode="open"');
  const templateEnd = renderedElement.indexOf('</template>', templateStart);
  if (templateStart < 0 || templateEnd < 0) {
    throw new Error('The product configurator SSR contract did not emit declarative Shadow DOM.');
  }
  const shadowTemplate = renderedElement.slice(templateStart, templateEnd + '</template>'.length);
  const hostStart = html.indexOf('<gluon-product-configurator');
  const hostOpenEnd = html.indexOf('>', hostStart);
  if (hostStart < 0 || hostOpenEnd < 0) return html;
  return `${html.slice(0, hostOpenEnd + 1)}${shadowTemplate}${html.slice(hostOpenEnd + 1)}`;
}
