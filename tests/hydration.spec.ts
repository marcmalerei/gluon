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
  markCompiledPrimitiveTextBinding,
  repeat,
  render,
  renderGluonApplicationForServer,
  Suspense,
  unsafeHTML,
  unmount,
} from '@gluonjs/core';
import { Button, Checkbox, Input, Progress, Radio, Select, StatusBadge, Switch, Textarea, ToggleButton, buttonStyles, checkboxStyles, inputStyles, progressStyles, radioStyles, selectStyles, statusBadgeStyles, switchStyles, textareaStyles, toggleButtonStyles } from '@gluonjs/atoms';
import { Accordion, ButtonGroup, Card, ChoiceGroup, ControlField, DialogSurface, Disclosure, EmptyState, InlineNotice, SegmentedControl, TableRegion, Tabs, accordionStyles, buttonGroupStyles, cardStyles, choiceGroupStyles, controlFieldStyles, createDialogSurfaceController, dialogSurfaceStyles, disclosureStyles, emptyStateStyles, inlineNoticeStyles, segmentedControlStyles, tableRegionStyles, tabsStyles } from '@gluonjs/molecules';
import { ProductBadge, productBadgeStyles } from '@gluonjs/example-component-library';
import { componentLibraryManifest } from '@gluonjs/example-component-library/manifest';
import { createComponentLibraryLoader } from '@gluonjs/quarks';
import { nextTick, ref } from '@gluonjs/reactivity';
import {
  hydrateApplication,
  hydrateElement,
  hydrateTemplate,
  HydrationMarkerTransportError,
} from '@gluonjs/ssr/hydration';
import { createStyleManifest, prepareForHydration, renderElement, renderProgressively, renderStyleCarriers, renderToString } from '@gluonjs/ssr';
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

  it('retains the server DOM produced by the component-library public Atom', async () => {
    const value = html`<section>${ProductBadge('In stock')}</section>`;
    const prepared = await prepareForHydration(value);
    const root = document.createElement('div');
    root.innerHTML = prepared.html;
    const badge = root.querySelector('.example-product-badge');

    const result = await hydrateTemplate(value, root);

    expect(result).toMatchObject({ retained: true, recovered: false });
    expect(root.querySelector('.example-product-badge')).toBe(badge);
  });

  it('validates the loader style handoff before retaining the component-library DOM', async () => {
    const resolver = { load: async () => ProductBadge };
    const serverLoader = createComponentLibraryLoader(componentLibraryManifest, resolver);
    await serverLoader.load('product-badge');
    const serverStyles = JSON.parse(JSON.stringify(serverLoader.styleSnapshot()));

    const value = html`<section>${ProductBadge('In stock')}</section>`;
    const prepared = await prepareForHydration(value);
    const root = document.createElement('div');
    root.innerHTML = prepared.html;
    const badge = root.querySelector('.example-product-badge');
    const documentSheetCount = document.adoptedStyleSheets.length;

    const clientLoader = createComponentLibraryLoader(componentLibraryManifest, resolver, {
      styleTarget: document,
      styles: { resolve: () => [productBadgeStyles] },
    });
    await clientLoader.load('product-badge');
    clientLoader.validateStyleSnapshot(serverStyles);
    const result = await hydrateTemplate(value, root);

    expect(result).toMatchObject({ retained: true, recovered: false });
    expect(root.querySelector('.example-product-badge')).toBe(badge);
    expect(document.adoptedStyleSheets).toHaveLength(documentSheetCount + 1);
    clientLoader.release('product-badge');
    expect(document.adoptedStyleSheets).toHaveLength(documentSheetCount);
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

  it('retains nested server elements while hydrating an application root', async () => {
    class ApplicationNestedElement extends GluonElement {
      protected override render() { return html`<p>${'application child'}</p>`; }
    }
    defineElement('hydration-application-nested', ApplicationNestedElement);
    const app = createApp(() => html`
      <main>${renderElement(ApplicationNestedElement)}</main>
    `);
    const serverMarkup = await renderToString(renderGluonApplicationForServer(app));
    const root = document.createElement('div');
    materializeDeclarativeShadowRoots(root, serverMarkup);
    document.body.append(root);
    const host = root.querySelector('hydration-application-nested') as ApplicationNestedElement;
    const paragraph = host.shadowRoot?.querySelector('p');

    const hydrated = await hydrateApplication(app, root);

    expect(hydrated.hydration).toEqual(expect.objectContaining({ retained: true, recovered: false }));
    expect(root.querySelector('hydration-application-nested')).toBe(host);
    expect(host.shadowRoot?.querySelector('p')).toBe(paragraph);
    expect(host.hasAttribute('data-gluon-hydration')).toBe(false);
    hydrated.mount.unmount();
    root.remove();

    const failedApp = createApp(() => html`<main>${renderElement(ApplicationNestedElement)}</main>`);
    const failedMarkup = await renderToString(renderGluonApplicationForServer(failedApp));
    const failedRoot = document.createElement('div');
    materializeDeclarativeShadowRoots(failedRoot, failedMarkup);
    failedRoot.querySelector('hydration-application-nested')?.removeAttribute('data-gluon-hydration');
    document.body.append(failedRoot);
    await expect(hydrateApplication(failedApp, failedRoot)).rejects.toMatchObject({ mismatch: 'missing' });
    expect(failedApp.mounted).toBe(false);
    failedRoot.remove();

    const clientRoot = document.createElement('div');
    render(html`${renderElement(ApplicationNestedElement, { properties: { id: 'client-host' } })}`, clientRoot);
    const clientHost = clientRoot.querySelector('hydration-application-nested');
    expect((clientHost as HTMLElement)?.id).toBe('client-host');
    unmount(clientRoot);
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

  it('retains standalone and adjacent server DSD roots using transported marker ranges', async () => {
    class TransportGreeting extends GluonElement {
      protected override render() {
        return html`<section><p>${'Hello Ada'}</p></section>`;
      }
    }
    class TransportStatus extends GluonElement {
      protected override render() {
        return html`<output>${'Ready'}</output>`;
      }
    }
    defineElement('hydration-transport-greeting', TransportGreeting);
    defineElement('hydration-transport-status', TransportStatus);

    const serialized = await renderToString(html`${renderElement(TransportGreeting)}${renderElement(TransportStatus)}`);
    const container = document.createElement('div');
    materializeServerElements(container, serialized);
    const sourceElements = [...container.children] as Array<TransportGreeting | TransportStatus>;
    for (const element of sourceElements) element.beginHydration();
    document.body.append(container);
    const greeting = container.querySelector('hydration-transport-greeting') as TransportGreeting;
    const status = container.querySelector('hydration-transport-status') as TransportStatus;
    const greetingNode = greeting.shadowRoot?.querySelector('p');
    const statusNode = status.shadowRoot?.querySelector('output');
    const greetingResult = await hydrateElement(greeting);
    const statusResult = await hydrateElement(status);
    expect(greetingResult).toMatchObject({ retained: true, recovered: false, mismatches: [] });
    expect(statusResult).toMatchObject({ retained: true, recovered: false, mismatches: [] });
    expect(greeting.shadowRoot?.querySelector('p')).toBe(greetingNode);
    expect(status.shadowRoot?.querySelector('output')).toBe(statusNode);
    expect(greeting.hasAttribute('data-gluon-hydration')).toBe(false);
    expect(status.hasAttribute('data-gluon-hydration')).toBe(false);
    greeting.remove();
    status.remove();
  });

  it('retains two nested ShadowRoot levels with independent transported ranges', async () => {
    class TransportNestedInner extends GluonElement {
      protected override render() { return html`<p>${'nested'}</p>`; }
    }
    class TransportNestedOuter extends GluonElement {
      protected override render() { return html`<article><hydration-transport-nested-inner></hydration-transport-nested-inner></article>`; }
    }
    defineElement('hydration-transport-nested-inner', TransportNestedInner);
    defineElement('hydration-transport-nested-outer', TransportNestedOuter);

    const serialized = await renderToString(renderElement(TransportNestedOuter));
    const nestedSerialized = await renderToString(renderElement(TransportNestedInner));
    const container = document.createElement('div');
    materializeServerElements(container, serialized);
    document.body.append(container);
    const outer = container.firstElementChild as TransportNestedOuter;
    const inner = outer.shadowRoot?.querySelector('hydration-transport-nested-inner') as TransportNestedInner;
    installServerElementShadow(inner, nestedSerialized);
    const article = outer.shadowRoot?.querySelector('article');
    const paragraph = inner.shadowRoot?.querySelector('p');

    const result = await hydrateElement(outer);
    expect(result).toMatchObject({ retained: true, recovered: false, mismatches: [] });
    expect(outer.shadowRoot?.querySelector('article')).toBe(article);
    expect(inner.shadowRoot?.querySelector('p')).toBe(paragraph);
    expect(outer.hasAttribute('data-gluon-hydration')).toBe(false);
    expect(inner.hasAttribute('data-gluon-hydration')).toBe(false);
    outer.remove();
  });

  it('fails closed and categorizes missing or tampered marker transport metadata', async () => {
    class TransportFailure extends GluonElement {
      protected override render() { return html`<p>${'stable'}</p>`; }
    }
    defineElement('hydration-transport-failure', TransportFailure);
    const serialized = await renderToString(renderElement(TransportFailure));

    const missingContainer = document.createElement('div');
    materializeServerElements(missingContainer, serialized);
    document.body.append(missingContainer);
    const missing = missingContainer.firstElementChild as TransportFailure;
    missing.removeAttribute('data-gluon-hydration');
    await expect(hydrateElement(missing, { requireMarkerTransport: true })).rejects.toMatchObject({
      mismatch: 'missing',
    });

    const tamperedContainer = document.createElement('div');
    materializeServerElements(tamperedContainer, serialized);
    document.body.append(tamperedContainer);
    const tampered = tamperedContainer.firstElementChild as TransportFailure;
    tampered.setAttribute('data-gluon-hydration', 'v1:0:99');
    await expect(hydrateElement(tampered, { requireMarkerTransport: true })).rejects.toMatchObject({
      mismatch: 'tampered',
    });

    const invalidContainer = document.createElement('div');
    materializeServerElements(invalidContainer, serialized);
    document.body.append(invalidContainer);
    const invalid = invalidContainer.firstElementChild as TransportFailure;
    const invalidParagraph = invalid.shadowRoot?.querySelector('p');
    invalid.setAttribute('data-gluon-hydration', 'v2:0:1');
    await expect(hydrateElement(invalid, { requireMarkerTransport: true })).rejects.toMatchObject({
      mismatch: 'invalid',
    });
    expect(invalid.shadowRoot?.querySelector('p')).toBe(invalidParagraph);
    expect(new HydrationMarkerTransportError('invalid', 'x')).toBeInstanceOf(Error);

    const mismatchContainer = document.createElement('div');
    materializeServerElements(mismatchContainer, serialized);
    document.body.append(mismatchContainer);
    const mismatchElement = mismatchContainer.firstElementChild as TransportFailure;
    const mismatchParagraph = mismatchElement.shadowRoot?.querySelector('p');
    const mismatchText = [...(mismatchParagraph?.childNodes ?? [])]
      .find((node) => node.nodeType === Node.TEXT_NODE);
    mismatchText!.textContent = 'changed';
    await expect(hydrateElement(mismatchElement, { recovery: 'throw' })).rejects.toMatchObject({
      mismatches: [expect.objectContaining({ category: 'text' })],
    });
    expect(mismatchElement.shadowRoot?.querySelector('p')).toBe(mismatchParagraph);
    missingContainer.remove();
    tamperedContainer.remove();
    invalidContainer.remove();
    mismatchContainer.remove();
  });

  it('retains an empty ShadowRoot transport and rejects duplicate scheduling', async () => {
    class EmptyTransportElement extends GluonElement {
      protected override render() { return html``; }
    }
    defineElement('hydration-transport-empty', EmptyTransportElement);
    const serialized = await renderToString(renderElement(EmptyTransportElement));
    const container = document.createElement('div');
    materializeServerElements(container, serialized);
    document.body.append(container);
    const element = container.firstElementChild as EmptyTransportElement;

    await expect(hydrateElement(element, { hydratedElements: new Set([element]) })).rejects.toThrow(
      'scheduled for hydration more than once',
    );
    const result = await hydrateElement(element);
    expect(result).toMatchObject({ retained: true, recovered: false, mismatches: [] });
    expect(element.hasAttribute('data-gluon-hydration')).toBe(false);
    container.remove();
  });

  it('retains hydrated DOM before compiler-marked property updates and cleanup', async () => {
    const prepared = await prepareForHydration(html`<p>${'Server label'}</p>`);
    const host = document.createElement('hydrated-compiled-label');
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = prepared.html;
    const paragraph = shadow.querySelector('p');
    document.body.append(host);

    class HydratedCompiledLabel extends GluonElement {
      static override readonly properties = {
        label: { type: String, default: 'Server label' },
      } as const;
      declare label: string;
      protected override render() {
        return markCompiledPrimitiveTextBinding(html`<p>${this.label}</p>`, 'label', 0);
      }
    }
    defineElement('hydrated-compiled-label', HydratedCompiledLabel);
    const upgraded = host as HydratedCompiledLabel;
    const result = await hydrateElement(upgraded);
    await upgraded.updateComplete;
    expect(result.retained).toBe(true);
    expect(upgraded.shadowRoot?.querySelector('p')).toBe(paragraph);

    upgraded.label = 'Client label';
    await upgraded.updateComplete;
    expect(upgraded.shadowRoot?.querySelector('p')).toBe(paragraph);
    expect(paragraph?.textContent).toBe('Client label');
    upgraded.remove();
    await nextTick();
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
    const value = html`<main>${Button({ label: 'Hydrated action' })}${ButtonGroup({ label: 'Hydrated actions', children: Button({ label: 'Nested action' }) })}${SegmentedControl({ label: 'Hydrated view', value: 'grid', options: [{ value: 'grid', label: 'Grid' }, { value: 'list', label: 'List' }] })}${Tabs({ label: 'Hydrated tabs', value: 'one', items: [{ id: 'hydrated-one', value: 'one', label: 'One', panel: 'First panel' }, { id: 'hydrated-two', value: 'two', label: 'Two', panel: 'Second panel' }] })}${DialogSurface({ id: 'hydrated-dialog', label: 'Hydrated dialog', controller: createDialogSurfaceController(), children: 'Dialog content' })}${Disclosure({ id: 'hydrated-disclosure', summary: 'Hydrated disclosure', defaultOpen: true, children: 'Disclosure content' })}${Accordion({ label: 'Hydrated accordion', value: 'one', items: [{ id: 'hydrated-accordion-one', value: 'one', summary: 'One', children: 'First disclosure' }] })}${InlineNotice({ tone: 'success', title: 'Hydrated notice', children: 'Hydrated feedback' })}${EmptyState({ heading: 'Hydrated empty state', children: 'No items.' })}${TableRegion({ id: 'hydrated-table', label: 'Hydrated table', children: html`<table><tbody><tr><td>Hydrated cell</td></tr></tbody></table>` })}${Select({
      value: 'cobalt',
      attributes: { 'aria-label': 'Hydrated finish' },
      children: html`<option value="black">Black</option><option value="cobalt">Cobalt</option>`,
    })}${Textarea({ value: 'Hydrated note', attributes: { 'aria-label': 'Hydrated note' } })}${Checkbox({ checked: true, attributes: { 'aria-label': 'Hydrated choice' } })}${Progress({ value: 2, max: 4, attributes: { 'aria-label': 'Hydrated progress' } })}${Radio({ checked: true, name: 'finish', attributes: { 'aria-label': 'Hydrated radio' } })}${StatusBadge({ tone: 'success', children: 'Hydrated status' })}${Switch({ checked: true, name: 'network', attributes: { 'aria-label': 'Hydrated switch' } })}${ToggleButton({ pressed: true, label: 'Hydrated toggle' })}${ChoiceGroup({ id: 'hydrated-choice', legend: 'Hydrated choice', children: Radio({ name: 'hydrated', attributes: { 'aria-label': 'Hydrated option' } }) })}${ControlField({ id: 'hydrated-field', label: 'Hydrated field', helper: 'Hydrated help', control: (relationships) => Input({ value: 'Hydrated', attributes: { id: relationships.controlId, aria: relationships.aria } }) })}${Card({ title: 'Hydrated card' })}</main>`;
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
    expect(styleRoot.adoptedStyleSheets).toContain(selectStyles);
    expect(styleRoot.adoptedStyleSheets).toContain(textareaStyles);
    expect(styleRoot.adoptedStyleSheets).toContain(checkboxStyles);
    expect(styleRoot.adoptedStyleSheets).toContain(inputStyles);
    expect(styleRoot.adoptedStyleSheets).toContain(progressStyles);
    expect(styleRoot.adoptedStyleSheets).toContain(radioStyles);
    expect(styleRoot.adoptedStyleSheets).toContain(statusBadgeStyles);
    expect(styleRoot.adoptedStyleSheets).toContain(switchStyles);
    expect(styleRoot.adoptedStyleSheets).toContain(toggleButtonStyles);
    expect(styleRoot.adoptedStyleSheets).toContain(cardStyles);
    expect(styleRoot.adoptedStyleSheets).toContain(buttonGroupStyles);
    expect(styleRoot.adoptedStyleSheets).toContain(segmentedControlStyles);
    expect(styleRoot.adoptedStyleSheets).toContain(tabsStyles);
    expect(styleRoot.adoptedStyleSheets).toContain(dialogSurfaceStyles);
    expect(styleRoot.adoptedStyleSheets).toContain(disclosureStyles);
    expect(styleRoot.adoptedStyleSheets).toContain(accordionStyles);
    expect(styleRoot.adoptedStyleSheets).toContain(inlineNoticeStyles);
    expect(styleRoot.adoptedStyleSheets).toContain(emptyStateStyles);
    expect(styleRoot.adoptedStyleSheets).toContain(tableRegionStyles);
    expect(styleRoot.adoptedStyleSheets).toContain(choiceGroupStyles);
    expect(styleRoot.adoptedStyleSheets).toContain(controlFieldStyles);
    expect(styleRoot.querySelector('style[data-gluon-style]')).toBeNull();
    unmount(root);
    expect(styleRoot.adoptedStyleSheets).not.toContain(buttonStyles);
    expect(styleRoot.adoptedStyleSheets).not.toContain(selectStyles);
    expect(styleRoot.adoptedStyleSheets).not.toContain(textareaStyles);
    expect(styleRoot.adoptedStyleSheets).not.toContain(checkboxStyles);
    expect(styleRoot.adoptedStyleSheets).not.toContain(inputStyles);
    expect(styleRoot.adoptedStyleSheets).not.toContain(progressStyles);
    expect(styleRoot.adoptedStyleSheets).not.toContain(radioStyles);
    expect(styleRoot.adoptedStyleSheets).not.toContain(statusBadgeStyles);
    expect(styleRoot.adoptedStyleSheets).not.toContain(switchStyles);
    expect(styleRoot.adoptedStyleSheets).not.toContain(toggleButtonStyles);
    expect(styleRoot.adoptedStyleSheets).not.toContain(cardStyles);
    expect(styleRoot.adoptedStyleSheets).not.toContain(choiceGroupStyles);
    expect(styleRoot.adoptedStyleSheets).not.toContain(controlFieldStyles);

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

function materializeServerElements(container: HTMLElement, markup: string): void {
  const source = document.createElement('template');
  source.innerHTML = markup;
  for (const sourceHost of [...source.content.children]) {
    const host = document.createElement(sourceHost.localName);
    for (const attribute of [...sourceHost.attributes]) {
      host.setAttribute(attribute.name, attribute.value);
    }
    const shadowTemplate = [...sourceHost.children]
      .find((child) => child.localName === 'template' && child.hasAttribute('shadowrootmode')) as HTMLTemplateElement | undefined;
    if (shadowTemplate && host.shadowRoot) {
      host.shadowRoot.replaceChildren(shadowTemplate.content.cloneNode(true));
      materializeNestedDeclarativeShadowRoots(host.shadowRoot);
    }
    for (const child of [...sourceHost.childNodes]) {
      if (child !== shadowTemplate) host.append(document.importNode(child, true));
    }
    container.append(host);
  }
}

function materializeDeclarativeShadowRoots(container: HTMLElement, markup: string): void {
  container.innerHTML = markup;
  materializeNestedDeclarativeShadowRoots(container);
}

function installServerElementShadow(host: GluonElement, markup: string): void {
  const source = document.createElement('template');
  source.innerHTML = markup;
  const sourceHost = source.content.firstElementChild;
  const shadowTemplate = sourceHost
    ? [...sourceHost.children].find((child) => child.localName === 'template' && child.hasAttribute('shadowrootmode')) as HTMLTemplateElement | undefined
    : undefined;
  if (!sourceHost || !shadowTemplate || !host.shadowRoot) throw new Error('Missing nested DSD test fixture.');
  const marker = sourceHost.getAttribute('data-gluon-hydration');
  if (marker) host.setAttribute('data-gluon-hydration', marker);
  host.shadowRoot.replaceChildren(shadowTemplate.content.cloneNode(true));
  materializeNestedDeclarativeShadowRoots(host.shadowRoot);
}

function materializeNestedDeclarativeShadowRoots(root: ParentNode): void {
  for (const template of [...root.querySelectorAll<HTMLTemplateElement>('template[shadowrootmode]')]) {
    const host = template.parentElement;
    if (!host) continue;
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    shadow.replaceChildren(template.content.cloneNode(true));
    template.remove();
    materializeNestedDeclarativeShadowRoots(shadow);
  }
}
