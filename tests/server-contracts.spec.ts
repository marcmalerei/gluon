import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GluonElement,
  adoptStyles,
  createApp,
  css,
  defineElement,
  directive,
  disposeGluonApplicationForServer,
  event,
  getStyleSheetText,
  getTemplateValueServerContract,
  html,
  renderGluonApplicationForServer,
  renderGluonElementForServer,
  repeat,
  unsafeHTML,
  unsafeURL,
} from '@gluonjs/core';
import { createMemoryHistory, createRouter } from '@gluonjs/router';
import { createStoreManager } from '@gluonjs/store';
import { createShopApplication, createShopRoutes } from '../examples/shop/src/app.js';
import { createShopStore } from '../examples/shop/src/state.js';

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe('public Core server contracts in a browser build', () => {
  it('evaluates and disposes an application without mount lifecycle', async () => {
    const mounted = vi.fn();
    const unmounted = vi.fn();
    const cleanup = vi.fn();
    const app = createApp(() => html`<main>Server template</main>`);
    app.use(() => cleanup);
    app.onMounted(mounted);
    app.onUnmounted(unmounted);
    expect(renderGluonApplicationForServer(app).strings.join('')).toContain('Server template');
    expect(mounted).not.toHaveBeenCalled();
    await disposeGluonApplicationForServer(app);
    expect(cleanup).toHaveBeenCalledOnce();
    expect(unmounted).not.toHaveBeenCalled();
    await disposeGluonApplicationForServer(app);
    expect(() => renderGluonApplicationForServer(app)).toThrow('before browser mount');
    expect(() => renderGluonApplicationForServer({} as never)).toThrow('created by createApp');
    await expect(disposeGluonApplicationForServer({} as never)).rejects.toThrow('created by createApp');

    const staticApp = createApp(html`<p>Static root</p>`);
    expect(renderGluonApplicationForServer(staticApp).strings.join('')).toContain('Static root');
    await disposeGluonApplicationForServer(staticApp);

    const invalidApp = createApp(() => 'invalid' as never);
    expect(() => renderGluonApplicationForServer(invalidApp)).toThrow('must return a TemplateResult');
    await disposeGluonApplicationForServer(invalidApp);

    const cleanupError = vi.fn();
    const failingCleanupApp = createApp(() => html`Cleanup`);
    failingCleanupApp.config.errorHandler = ({ error }) => cleanupError(error);
    failingCleanupApp.use(() => () => { throw new Error('cleanup failed'); });
    await disposeGluonApplicationForServer(failingCleanupApp);
    expect(cleanupError).toHaveBeenCalledWith(expect.objectContaining({ message: 'cleanup failed' }));

    const mountedApp = createApp(() => html`Mounted`);
    const root = document.createElement('div');
    document.body.append(root);
    mountedApp.mount(root);
    expect(() => renderGluonApplicationForServer(mountedApp)).toThrow('before browser mount');
    await disposeGluonApplicationForServer(mountedApp);
    mountedApp.unmount();
  });

  it('returns an unattached registered element template without connection hooks', () => {
    const connected = vi.fn();
    class ServerElement extends GluonElement {
      static override readonly properties = { label: String };
      declare label: string;
      constructor() {
        super();
        this.onConnected(connected);
      }
      protected override render() { return html`<p>${this.label}</p>`; }
    }
    defineElement('gluon-browser-server-contract', ServerElement);
    expect(defineElement('gluon-browser-server-contract', ServerElement)).toBe(ServerElement);
    const rendered = renderGluonElementForServer(ServerElement, { label: 'Ready' });
    expect(rendered.tagName).toBe('gluon-browser-server-contract');
    expect(rendered.template.values).toEqual(['Ready']);
    expect(connected).not.toHaveBeenCalled();
    expect(renderGluonElementForServer(ServerElement).template.values).toEqual([undefined]);

    class ConflictingElement extends GluonElement {
      protected override render() { return html`Conflict`; }
    }
    expect(() => defineElement('gluon-browser-server-contract', ConflictingElement))
      .toThrow('already defined with another constructor');

    class UnregisteredElement extends GluonElement {
      protected override render() { return html`Unregistered`; }
    }
    expect(() => renderGluonElementForServer(UnregisteredElement)).toThrow('must be registered');
    expect(() => defineElement('gluon-other-server-contract', ServerElement)).toThrow('already registered');
  });

  it('exposes DOM-free template value contracts and browser stylesheet text', () => {
    const repeated = repeat(['a'], (value) => value, (value) => value);
    expect(getTemplateValueServerContract(repeated)).toEqual({
      kind: 'repeat',
      items: [{ key: 'a', value: 'a' }],
    });
    expect(getTemplateValueServerContract(unsafeHTML('<b>ok</b>'))).toEqual({
      kind: 'unsafe-html',
      markup: '<b>ok</b>',
    });
    expect(getTemplateValueServerContract(unsafeURL('https://example.test'))).toEqual({
      kind: 'unsafe-url',
      value: 'https://example.test',
    });
    expect(getTemplateValueServerContract(event(() => undefined))).toEqual({ kind: 'event' });
    expect(getTemplateValueServerContract(directive(() => () => undefined)())).toEqual({ kind: 'directive' });
    expect(getTemplateValueServerContract('ordinary')).toBeUndefined();
    expect(getStyleSheetText(css`:host { display: block; }`)).toContain('display: block');

    vi.stubGlobal('CSSStyleSheet', undefined);
    expect(() => css`:host { color: red; }`).toThrow('requires constructable CSSStyleSheet');
    vi.stubGlobal('CSSStyleSheet', class UnsupportedSheet {});
    expect(() => css`:host { color: blue; }`).toThrow('requires constructable CSSStyleSheet');
    expect(() => adoptStyles({} as never, {} as CSSStyleSheet)).toThrow('requires adoptedStyleSheets');
  });

  it('accepts request-owned Router and Store resources in the shop application', async () => {
    const manager = createStoreManager();
    const router = createRouter({
      history: createMemoryHistory(['/']),
      routes: createShopRoutes(createShopStore(manager)),
    });
    await router.isReady();
    const shop = createShopApplication(undefined, {
      router,
      storeManager: manager,
      storage: null,
    });
    expect(shop.router).toBe(router);
    expect(shop.storeManager).toBe(manager);
    shop.store.changeQuantity('missing-line', 1);
    shop.store.removeFromBag('missing-line');
    await disposeGluonApplicationForServer(shop.app);
    expect(shop.store.bagCount).toBe(0);
    manager.dispose();
    expect(() => createShopApplication(undefined, { storage: null })).toThrow('requires a Router or history');
  });
});
