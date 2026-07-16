import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  compose,
  createComponentStyleSelection,
  createApp,
  createInjectionKey,
  createStyleSheetSelection,
  defineElement,
  defineGluonElement,
  css,
  elementRef,
  GluonElement,
  html,
  hydrate,
  inject,
  repeat,
  renderGluonApplicationForServer,
  Suspense,
  unsafeHTML,
  unmount,
} from '@gluonjs/core';
import { Button, buttonStyles } from '@gluonjs/atoms';
import { Card, cardStyles } from '@gluonjs/molecules';
import { nextTick, ref } from '@gluonjs/reactivity';
import {
  hydrateApplication,
  hydrateElement,
  hydrateTemplate,
} from '@gluonjs/ssr/hydration';
import { createStyleManifest, prepareForHydration, renderProgressively, renderStyleCarriers } from '@gluonjs/ssr';
import { renderEleventyPage } from '@gluonjs/ssr/eleventy';
import type { SsrRequestResult } from '@gluonjs/ssr';
import {
  injectProductConfiguratorShadow,
  renderShopRequest,
} from '../examples/shop/src/server.js';
import {
  cleanupSsrFixtures,
  hydrateSsrFixture,
  renderSsrFixture,
} from '../packages/test-utils/src/ssr.js';
import { hydrateShop } from '../examples/shop/src/hydrate.js';
import type { ProductConfiguratorElement } from '../examples/shop/src/product-configurator.js';
import {
  shopStyles,
  shopUiTokenStyles,
} from '../examples/shop/src/styles.js';

describe('SSR hydration', () => {
  afterEach(cleanupSsrFixtures);

  it('rejects malformed configurator DSD and leaves unrelated routes unchanged', () => {
    expect(() => injectProductConfiguratorShadow(
      '<gluon-product-configurator></gluon-product-configurator>',
      '<gluon-product-configurator></gluon-product-configurator>',
    )).toThrow('did not emit declarative Shadow DOM');
    expect(() => injectProductConfiguratorShadow(
      '<gluon-product-configurator></gluon-product-configurator>',
      '<gluon-product-configurator><template shadowrootmode="open">',
    )).toThrow('did not emit declarative Shadow DOM');
    expect(injectProductConfiguratorShadow(
      '<main>Home</main>',
      '<gluon-product-configurator><template shadowrootmode="open"></template></gluon-product-configurator>',
    )).toBe('<main>Home</main>');
  });

  it('renders non-product shop routes without a configurator shadow payload', async () => {
    const response = await renderShopRequest('/');
    expect(response.html).toContain('Objects that work the way you do.');
    expect(response.html).not.toContain('shadowrootcustomelementregistry');
  });

  it('retains the server DOM produced by a composed functional template', async () => {
    const Panel = (props: { readonly title: string; readonly children: import('@gluonjs/core').TemplateValue }) => html`
      <section><h2>${props.title}</h2>${props.children}</section>
    `;
    const value = html`${compose(Panel, { title: 'Checkout' })`<button>Pay</button>`}`;
    const prepared = await prepareForHydration(value);
    const root = document.createElement('div');
    root.innerHTML = prepared.html;
    const section = root.querySelector('section');
    const result = await hydrateTemplate(value, root);
    expect(result.retained).toBe(true);
    expect(root.querySelector('section')).toBe(section);
  });

  it('retains matching nodes while activating refs, events, context, and reactive updates', async () => {
    const label = ref('Server');
    const key = createInjectionKey<string>('hydration-context');
    const buttonRef = elementRef<HTMLButtonElement>();
    const clicks = vi.fn(() => { label.value = 'Client'; });
    const app = createApp(() => html`
      <main><h1>${inject(key)}</h1><button ...=${{ ref: buttonRef, '@click': clicks }}>${label.value}</button></main>
    `);
    app.provide(key, 'Context');
    const root = document.createElement('div');
    const prepared = await prepareForHydration(renderGluonApplicationForServer(app));
    root.innerHTML = prepared.html;
    const main = root.querySelector('main');
    const heading = root.querySelector('h1');
    const button = root.querySelector('button');

    const result = await hydrateApplication(app, root);
    expect(result.hydration).toEqual(expect.objectContaining({ retained: true, recovered: false }));
    expect(root.querySelector('main')).toBe(main);
    expect(root.querySelector('h1')).toBe(heading);
    expect(root.querySelector('button')).toBe(button);
    expect(buttonRef.value).toBe(button);
    button?.click();
    await nextTick();
    expect(clicks).toHaveBeenCalledOnce();
    expect(button?.textContent).toBe('Client');
    result.mount.unmount();
  });

  it('reports every mismatch category and performs deterministic root recovery', async () => {
    const result = html`<article title=${'expected'} style=${'color:red'}><span>${'text'}</span></article>`;
    const prepared = await prepareForHydration(result);
    const root = document.createElement('div');
    root.innerHTML = prepared.html;
    root.querySelector('article')?.setAttribute('title', 'actual');
    root.querySelector('article')?.setAttribute('style', 'color:blue');
    const text = [...root.querySelector('span')!.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
    if (text) text.textContent = 'changed';
    const original = root.firstChild;
    const mismatches: string[] = [];
    const hydrated = await hydrateTemplate(result, root, {
      state: { server: { count: 1 }, client: { count: 2 } },
      onMismatch: (mismatch) => mismatches.push(mismatch.category),
    });
    expect(new Set(mismatches)).toEqual(new Set(['attribute', 'style', 'text', 'state']));
    expect(hydrated.recovered).toBe(true);
    expect(root.firstChild).not.toBe(original);

    root.innerHTML = prepared.html.replace('<span>', '<strong>');
    const structure = await hydrateTemplate(result, root);
    expect(structure.mismatches.some((mismatch) => mismatch.category === 'structure')).toBe(true);
  });

  it('can abort without mutation and marks suppressed diagnostics explicitly', async () => {
    const result = html`<p>${'expected'}</p>`;
    const prepared = await prepareForHydration(result);
    const root = document.createElement('div');
    root.innerHTML = prepared.html.replace('expected', 'actual');
    const original = root.firstChild;
    await expect(hydrateTemplate(result, root, {
      recovery: 'throw',
      suppress: ['text'],
    })).rejects.toMatchObject({
      mismatches: [expect.objectContaining({ category: 'text', suppressed: true, recovery: 'abort' })],
    });
    expect(root.firstChild).toBe(original);
  });

  it('hydrates GLUON GOODS route and Store snapshots into an interactive product flow', async () => {
    history.replaceState({}, '', '/products/orbit-lamp');
    const server = await renderSsrFixture(
      () => renderShopRequest('/products/orbit-lamp'),
      { name: 'shop-product' },
    );
    const previousSheets = [...document.adoptedStyleSheets];
    const fixture = await hydrateSsrFixture(server, {
      hydrate: ({ container, stateRoot }) => hydrateShop(container, stateRoot),
      dispose: (hydrated) => {
        hydrated.mount.unmount();
        hydrated.uiOwner.dispose();
        hydrated.router.destroy();
        hydrated.storeManager.dispose();
      },
    });
    const root = fixture.container;
    const hydrated = fixture.hydrated;
    const heading = fixture.query('#product-title');
    expect(hydrated.hydration.mismatches).toEqual([]);
    expect(hydrated.hydration.retained).toBe(true);
    expect(root.querySelector('#product-title')).toBe(heading);
    expect(hydrated.router.currentRoute.value.fullPath).toBe('/products/orbit-lamp');
    expect(document.adoptedStyleSheets).toContain(buttonStyles);
    expect(document.adoptedStyleSheets).toContain(shopUiTokenStyles);
    expect(document.adoptedStyleSheets).toContain(shopStyles);

    const configurator = root.querySelector('gluon-product-configurator');
    await (configurator as ProductConfiguratorElement | null)?.updateComplete;
    configurator?.shadowRoot
      ?.querySelector<HTMLElement>('gluon-product-add-action')
      ?.querySelector<HTMLButtonElement>('button')?.click();
    await nextTick();
    expect(hydrated.store.bagCount).toBe(1);
    expect(hydrated.store.bagOpen).toBe(true);

    await fixture.cleanup();
    expect(hydrated.uiOwner.disposed).toBe(true);
    expect(document.adoptedStyleSheets).not.toContain(buttonStyles);
    expect(document.adoptedStyleSheets).not.toContain(shopUiTokenStyles);
    expect(document.adoptedStyleSheets).not.toContain(shopStyles);
    document.adoptedStyleSheets = previousSheets;
  });

  it('hydrates the canonical product route transported through the Eleventy adapter', async () => {
    history.replaceState({}, '', '/products/orbit-lamp');
    let response: SsrRequestResult | undefined;
    const documentHtml = await renderEleventyPage({
      assets: { entry: '/assets/app.js', imports: ['/assets/vendor.js'] },
      createRequest: ({ url, assets, nonce }) => ({
        render: () => renderShopRequest(url, { assets, nonce }),
      }),
      document: (context) => {
        response = context.result;
        return `<!doctype html><head>${context.result.head}</head><body><div id="app">${context.result.html}</div>${context.result.stateScript}</body>`;
      },
    }, '/products/orbit-lamp', 'products/orbit-lamp/index.gluon', {});
    expect(documentHtml).toContain('Orbit Lamp');
    expect(documentHtml).toContain('data-gluon-state');
    const server = await renderSsrFixture(async () => response!, { name: 'shop-eleventy-product' });
    const fixture = await hydrateSsrFixture(server, {
      hydrate: ({ container, stateRoot }) => hydrateShop(container, stateRoot),
      dispose: (hydrated) => {
        hydrated.mount.unmount();
        hydrated.uiOwner.dispose();
        hydrated.router.destroy();
        hydrated.storeManager.dispose();
      },
    });
    expect(fixture.hydrated.hydration).toMatchObject({ retained: true, recovered: false });
    expect(fixture.get('#product-title').textContent).toContain('Orbit Lamp');
  });

  it('preserves an existing open declarative shadow root through element upgrade', async () => {
    const prepared = await prepareForHydration(html`<p>Hello ${'Ada'}</p>`);
    const host = document.createElement('hydrated-greeting');
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = prepared.html;
    const paragraph = shadow.querySelector('p');
    document.body.append(host);

    class HydratedGreeting extends GluonElement {
      protected override render() { return html`<p>Hello ${'Ada'}</p>`; }
    }
    defineElement('hydrated-greeting', HydratedGreeting);
    const upgraded = host as HydratedGreeting;
    const result = await hydrateElement(upgraded);
    await upgraded.updateComplete;
    expect(result.retained).toBe(true);
    expect(upgraded.shadowRoot).toBe(shadow);
    expect(upgraded.shadowRoot?.querySelector('p')).toBe(paragraph);
    upgraded.remove();
  });

  it('hydrates a functional GluonElement through the same identity-preserving path', async () => {
    const prepared = await prepareForHydration(html`<button>${'Server quantity 2'}</button>`);
    const host = document.createElement('hydrated-functional-quantity');
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = prepared.html;
    const button = shadow.querySelector('button');
    document.body.append(host);

    const FunctionalQuantity = defineGluonElement({
      tagName: 'hydrated-functional-quantity',
      setup(context) {
        const quantity = context.state('quantity', 2);
        return {
          expose: { increment: () => { quantity.value += 1; } },
          render: () => html`<button>${`Server quantity ${quantity.value}`}</button>`,
        };
      },
    });
    const upgraded = host as InstanceType<typeof FunctionalQuantity>;
    const result = await hydrateElement(upgraded);
    await upgraded.updateComplete;
    expect(result.retained).toBe(true);
    expect(upgraded.shadowRoot).toBe(shadow);
    expect(upgraded.shadowRoot?.querySelector('button')).toBe(button);
    upgraded.increment();
    await nextTick();
    await upgraded.updateComplete;
    expect(button?.textContent).toBe('Server quantity 3');
    upgraded.remove();
  });

  it('adopts array, keyed, nested, empty, and trusted HTML child ranges', async () => {
    const value = html`<main>${[
      'A',
      html`<b>${'B'}</b>`,
      null,
    ]}${repeat([1, 2], (item) => item, (item) => html`<i>${item}</i>`)}${unsafeHTML('<u>C</u>')}</main>`;
    const prepared = await prepareForHydration(value);
    const root = document.createElement('div');
    root.innerHTML = prepared.html;
    const elements = [...root.querySelectorAll('b, i, u')];
    const result = await hydrateTemplate(value, root);
    expect(result.retained).toBe(true);
    expect([...root.querySelectorAll('b, i, u')]).toEqual(elements);
  });

  it('recovers deterministically when structurally matching HTML lacks required binding markers', async () => {
    expect(hydrate(html`<p>ignored</p>`, null, { expectedMarkup: '' })).toEqual({
      mismatches: [], retained: false, recovered: false,
    });
    expect(() => hydrate('invalid' as never, document.createElement('div'), { expectedMarkup: '' }))
      .toThrow('hydrate() expects');

    const child = html`<p>${'value'}</p>`;
    const childRoot = document.createElement('div');
    childRoot.innerHTML = '<p>value</p>';
    const childResult = hydrate(child, childRoot, { expectedMarkup: '<p>value</p>' });
    expect(childResult.mismatches[0]).toEqual(expect.objectContaining({ category: 'structure' }));

    const attribute = html`<p title=${'value'}></p>`;
    const attributeRoot = document.createElement('div');
    attributeRoot.innerHTML = '<p title="value"></p>';
    expect(() => hydrate(attribute, attributeRoot, {
      expectedMarkup: '<p title="value"></p>',
      recovery: 'throw',
    })).toThrow('Hydration aborted');
  });

  it('propagates browser response cancellation into progressive async sources', async () => {
    const controller = new AbortController();
    let aborted = false;
    const boundary = Suspense({
      source: ({ signal }) => new Promise<string>(() => {
        signal.addEventListener('abort', () => { aborted = true; }, { once: true });
      }),
      fallback: html`<p>pending</p>`,
      children: (value) => value,
    });
    const stream = renderProgressively(html`${boundary}`, { signal: controller.signal });
    await stream.next();
    controller.abort(new DOMException('cancelled', 'AbortError'));
    await expect(stream.next()).rejects.toMatchObject({ name: 'AbortError' });
    expect(aborted).toBe(true);
  });

  it('classifies node-count, node-type, comment, element, attribute, and circular-state differences', () => {
    const scenarios = [
      { expected: '<p></p>', actual: '<p></p><span></span>' },
      { expected: 'text', actual: '<!--text-->' },
      { expected: '<!--expected-->', actual: '<!--actual-->' },
      { expected: '<p></p>', actual: '<svg></svg>' },
      { expected: '<p title="expected"></p>', actual: '<p></p>' },
    ];
    for (const scenario of scenarios) {
      const root = document.createElement('div');
      root.innerHTML = scenario.actual;
      const result = hydrate(html`<p>client</p>`, root, {
        expectedMarkup: scenario.expected,
        suppress: true,
      });
      expect(result.recovered).toBe(true);
      expect(result.mismatches.every((mismatch) => mismatch.suppressed)).toBe(true);
    }

    const circular: { self?: unknown } = {};
    circular.self = circular;
    const root = document.createElement('div');
    root.innerHTML = '<p></p>';
    const state = hydrate(html`<p></p>`, root, {
      expectedMarkup: '<p></p>',
      state: { server: circular, client: { self: 'different' } },
    });
    expect(state.mismatches[0]?.category).toBe('state');
  });

  it('adopts validated SSR style carriers once and retains them on validation failure', async () => {
    const previous = [...document.adoptedStyleSheets];
    const sheet = css`body { --hydrated-color: blue; }`;
    const manifest = createStyleManifest([sheet]);
    const result = html`<p>${'styled'}</p>`;
    const prepared = await prepareForHydration(result);
    const styleHost = document.createElement('div');
    const styleRoot = styleHost.attachShadow({ mode: 'open' });
    const root = document.createElement('div');
    root.innerHTML = prepared.html;
    styleRoot.innerHTML = renderStyleCarriers(manifest);
    styleRoot.append(root);
    const hydrated = await hydrateTemplate(result, root, { styles: manifest, styleRoot });
    expect(hydrated.retained).toBe(true);
    expect(styleRoot.querySelector('style[data-gluon-style]')).toBeNull();
    expect(styleRoot.adoptedStyleSheets).toHaveLength(1);

    const invalidRoot = document.createElement('div');
    invalidRoot.innerHTML = prepared.html;
    styleRoot.innerHTML = renderStyleCarriers(manifest).replace(manifest.entries[0]!.digest, 'invalid');
    styleRoot.append(invalidRoot);
    await expect(hydrateTemplate(result, invalidRoot, { styles: manifest, styleRoot }))
      .rejects.toMatchObject({ code: 'GLUON_UNSUPPORTED_SSR_TRANSPORT' });
    expect(styleRoot.querySelector('style[data-gluon-style]')).not.toBeNull();
    document.adoptedStyleSheets = previous;
  });

  it('hands component carriers to their exact renderer-owned sheets and diagnoses mismatches', async () => {
    const value = html`<main>${Button({ label: 'Hydrated action' })}${Card({ title: 'Hydrated card' })}</main>`;
    const prepared = await prepareForHydration(value);
    const selection = createComponentStyleSelection(prepared.value);
    const manifest = createStyleManifest(selection);
    const host = document.createElement('section');
    const styleRoot = host.attachShadow({ mode: 'open' });
    const root = document.createElement('div');
    root.innerHTML = prepared.html;
    styleRoot.innerHTML = renderStyleCarriers(manifest);
    styleRoot.append(root);

    const result = await hydrateTemplate(value, root, { styles: manifest, styleRoot });
    expect(result.retained).toBe(true);
    expect(styleRoot.adoptedStyleSheets).toContain(buttonStyles);
    expect(styleRoot.adoptedStyleSheets).toContain(cardStyles);
    expect(styleRoot.querySelector('style[data-gluon-style]')).toBeNull();
    unmount(root);
    expect(styleRoot.adoptedStyleSheets).not.toContain(buttonStyles);
    expect(styleRoot.adoptedStyleSheets).not.toContain(cardStyles);

    const carrierTemplate = document.createElement('template');
    carrierTemplate.innerHTML = renderStyleCarriers(manifest);
    const carrierHtml = [...carrierTemplate.content.children].map((carrier) => carrier.outerHTML);
    const scenarios: Array<{
      mismatch: string;
      carriers: string;
      wrongTarget?: boolean;
    }> = [
      { mismatch: 'missing', carriers: carrierHtml[0]! },
      { mismatch: 'duplicate', carriers: `${carrierHtml[0]}${carrierHtml[0]}` },
      { mismatch: 'extra', carriers: `${carrierHtml.join('')}<style data-gluon-style="extra" data-gluon-digest="extra"></style>` },
      { mismatch: 'reordered', carriers: [...carrierHtml].reverse().join('') },
      { mismatch: 'mismatched', carriers: carrierHtml.join('').replace(manifest.entries[0]!.digest, 'invalid') },
      { mismatch: 'wrong-target', carriers: '', wrongTarget: true },
    ];
    for (const scenario of scenarios) {
      const scenarioHost = document.createElement('section');
      const scenarioStyleRoot = scenarioHost.attachShadow({ mode: 'open' });
      const scenarioRoot = document.createElement('div');
      scenarioRoot.innerHTML = prepared.html;
      scenarioStyleRoot.innerHTML = scenario.carriers;
      scenarioStyleRoot.append(scenarioRoot);
      document.body.append(scenarioHost);
      if (scenario.wrongTarget) {
        const misplaced = document.createElement('div');
        misplaced.innerHTML = carrierHtml.join('');
        document.body.append(misplaced);
      }
      await expect(hydrateTemplate(value, scenarioRoot, { styles: manifest, styleRoot: scenarioStyleRoot }))
        .rejects.toMatchObject({
          code: 'GLUON_COMPONENT_STYLE_HYDRATION_MISMATCH',
          mismatch: scenario.mismatch,
        });
      document.body.replaceChildren();
    }
  });

  it('hydrates usage-derived component carriers before application-owned carriers', async () => {
    const appSheet = css`:root { --hydration-app-token: ready; }`;
    const appSelection = createStyleSheetSelection([
      { id: 'hydration-app', scope: 'hydration-app', sheet: appSheet },
    ]);
    const app = createApp(() => Button({ label: 'Hydrated application action' }));
    const rootValue = renderGluonApplicationForServer(app);
    const prepared = await prepareForHydration(rootValue);
    const componentSelection = createComponentStyleSelection(prepared.value);
    const serverSelection = createStyleSheetSelection([
      ...componentSelection.entries,
      ...appSelection.entries,
    ]);
    const manifest = createStyleManifest(serverSelection);
    const root = document.createElement('div');
    root.innerHTML = prepared.html;
    document.head.insertAdjacentHTML('beforeend', renderStyleCarriers(manifest));
    document.body.append(root);

    const hydrated = await hydrateApplication(app, root, {
      styles: manifest,
      styleSelection: appSelection,
      styleRoot: document,
    });

    expect(hydrated.hydration).toEqual(expect.objectContaining({ retained: true, recovered: false }));
    expect(document.adoptedStyleSheets).toContain(buttonStyles);
    expect(document.adoptedStyleSheets).toContain(appSheet);
    expect(document.querySelector('style[data-gluon-style]')).toBeNull();
    hydrated.mount.unmount();
    expect(document.adoptedStyleSheets).not.toContain(buttonStyles);
    expect(document.adoptedStyleSheets).not.toContain(appSheet);
    root.remove();
  });
});
