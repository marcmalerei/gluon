import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  GluonElement,
  KeepAlive,
  Suspense,
  Teleport,
  Transition,
  createApp,
  createInjectionKey,
  compose,
  css,
  defineElement,
  defineGluonElement,
  directive,
  elementProperty,
  event,
  html,
  inject,
  repeat,
  svg,
  unsafeHTML,
  unsafeURL,
} from '@gluonjs/core';
import { defineStore } from '@gluonjs/store';
import {
  SsrRenderError,
  prepareForHydration,
  createStyleManifest,
  renderResourceHints,
  renderStyleCarriers,
  renderElement,
  renderRequest,
  renderProgressively,
  renderToChunks,
  renderToString,
  serializeSsrState,
} from '@gluonjs/ssr';
import { renderProgressiveReadableStream, renderToReadableStream } from '@gluonjs/ssr/streaming';
import { generateStaticSite } from '@gluonjs/ssr/static';
import { renderShopRequest } from '../examples/shop/src/server.js';
import { ClassQuantityControl } from '../benchmarks/dx/stateful-form-control/gluon-class.js';
import { FunctionalQuantityControl } from '../benchmarks/dx/stateful-form-control/gluon-functional.js';
import { renderReactQuantityShadow } from '../benchmarks/dx/stateful-form-control/react.js';
import { product } from '../benchmarks/dx/stateful-form-control/shared.js';
import { renderVueQuantityShadow } from '../benchmarks/dx/stateful-form-control/vue.js';
import { Button } from '@gluonjs/atoms';
import { Card } from '@gluonjs/molecules';

describe('@gluonjs/ssr DOM-independent serialization', () => {
  it('serializes composed functional templates through the unchanged public template contract', async () => {
    const Panel = (props: { readonly title: string; readonly children: import('@gluonjs/core').TemplateValue }) => html`
      <section><h2>${props.title}</h2>${props.children}</section>
    `;
    const result = compose(Panel, { title: 'Checkout' })`<p>Delivery</p>`;
    const rendered = withoutHydrationMarkers(await renderToString(result));
    expect(rendered).toContain('<section><h2>Checkout</h2><p>Delivery</p></section>');
    const ordered: string[] = [];
    for await (const chunk of renderToChunks(result)) ordered.push(chunk);
    expect(withoutHydrationMarkers(ordered.join(''))).toBe(rendered);
    const progressive = [];
    for await (const chunk of renderProgressively(result)) progressive.push(chunk);
    expect(withoutHydrationMarkers(progressive[0]!.html)).toBe(rendered);
  });

  it('loads the public Core and renderer without browser DOM globals', () => {
    expect(globalThis).not.toHaveProperty('document');
    expect(globalThis).not.toHaveProperty('HTMLElement');
    expect(globalThis).not.toHaveProperty('CSSStyleSheet');
    expect(css`:host { display: block; }`).toBeTypeOf('object');
  });

  it('serializes public templates, attributes, spreads, repeats, SVG, and explicit unsafe HTML', async () => {
    const click = vi.fn();
    const value = html`
      <section title=${'A & "B"'} ?hidden=${false} .value=${'field'} @click=${event(click)}
        ...=${{
          class: ['card', { active: true, hidden: false }],
          style: { backgroundColor: 'red', opacity: 0.5 },
          data: { itemId: 4 },
          aria: { label: 'Card' },
          '?disabled': true,
          ref: () => undefined,
        }}>
        ${'<unsafe>'}
        ${repeat([1, 2], (item) => item, (item) => html`<b>${item}</b>`)}
        ${unsafeHTML('<em>trusted</em>')}
        ${svg`<svg viewBox=${'0 0 1 1'}><path d=${'M0 0'}></path></svg>`}
      </section>
    `;
    const rendered = await renderToString(value);
    const visible = withoutHydrationMarkers(rendered);
    expect(visible).toContain('title="A &amp; &quot;B&quot;"');
    expect(visible).toContain('value="field"');
    expect(visible).not.toContain('hidden=');
    expect(visible).not.toContain('@click');
    expect(visible).toContain('class="card active"');
    expect(visible).toContain('style="background-color:red;opacity:0.5"');
    expect(visible).toContain('data-item-id="4"');
    expect(visible).toContain('aria-label="Card"');
    expect(visible).toContain('disabled');
    expect(visible).toContain('&lt;unsafe&gt;');
    expect(visible).toContain('<b>1</b><b>2</b>');
    expect(visible).toContain('<em>trusted</em>');
    expect(visible).toContain('<svg viewBox="0 0 1 1"><path d="M0 0"></path></svg>');
    expect(rendered).toContain('<!--gluon:h:');
    expect(click).not.toHaveBeenCalled();
  });

  it('enforces URL, srcdoc, directive, and unsupported-value boundaries', async () => {
    await expect(renderToString(html`<a href=${' javascript:alert(1)'}>Bad</a>`))
      .rejects.toThrow('Blocked unsafe URL protocol');
    expect(await renderToString(html`<a href=${unsafeURL('javascript:trusted()')}>Reviewed</a>`))
      .toContain('href="javascript:trusted()"');
    expect(await renderToString(html`<iframe srcdoc=${unsafeHTML('<p>trusted</p>')}></iframe>`))
      .toContain('srcdoc="&lt;p&gt;trusted&lt;/p&gt;"');
    await expect(renderToString(html`<p title=${unsafeHTML('<b>bad</b>')}></p>`))
      .rejects.toThrow('unsafeHTML() can only be used');

    const browserOnly = directive(() => () => undefined);
    await expect(renderToString(html`${browserOnly()}`)).rejects.toEqual(expect.objectContaining({
      code: 'GLUON_SSR_UNSUPPORTED_DIRECTIVE',
    }));
    await expect(renderToString({ private: true } as never)).rejects.toBeInstanceOf(SsrRenderError);
    await expect(renderToString(html`<p broken ${'value'}></p>`)).rejects.toEqual(expect.objectContaining({
      code: 'GLUON_SSR_INVALID_VALUE',
    }));
    expect(withoutHydrationMarkers(await renderToString(html`${unsafeURL('https://example.test/?a=1&b=2')}`)))
      .toBe('https://example.test/?a=1&amp;b=2');
    expect(withoutHydrationMarkers(await renderToString(html`${event(() => undefined)}`))).toBe('');
    expect(withoutHydrationMarkers(await renderToString(html`<p title="${'quoted'}"></p>`))).toBe('<p title="quoted"></p>');
    await expect(renderToString(html`<p ...=${{ 'bad name': 'value' }}></p>`))
      .rejects.toThrow('Unsafe SSR attribute name');
    await expect(renderToString(html`<img srcset=${'safe.png 1x, data:text/html,bad 2x'}>`))
      .rejects.toThrow('Blocked unsafe URL protocol');
    await expect(renderToString(html`<a ping=${'https://safe.test data:text/plain,bad'}></a>`))
      .rejects.toThrow('Blocked unsafe URL protocol');
  });

  it('normalizes scalar class/style spread values and empty children', async () => {
    const rendered = await renderToString(html`
      <p ...=${{ class: 4, style: 'color:blue', empty: null, '.payload': { hidden: true } }}>
        ${[null, false, undefined, true, 2n, new URL('https://example.test/path')]}
      </p>
    `);
    const visible = withoutHydrationMarkers(rendered);
    expect(visible).toContain('class="4"');
    expect(visible).toContain('style="color:blue"');
    expect(visible).not.toContain('empty=');
    expect(visible).not.toContain('payload=');
    expect(visible).toContain('true2https://example.test/path');
  });

  it('resolves async and layout built-in server contracts without browser effects', async () => {
    const value = html`
      ${Suspense({
        source: Promise.resolve('ready'),
        fallback: html`<p>loading</p>`,
        children: (result) => html`<p>${result}</p>`,
      })}
      ${Teleport({ target: '#overlay', children: html`<aside>teleported</aside>` })}
      ${KeepAlive({ cacheKey: 'page', children: html`<article>cached</article>` })}
      ${Transition({ transitionKey: 'visible', children: html`<div>stable</div>` })}
    `;
    expect(withoutHydrationMarkers(await renderToString(value))).toContain(
      '<p>ready</p>\n      <aside>teleported</aside>\n      <article>cached</article>\n      <div>stable</div>',
    );
  });

  it('renders registered GluonElement classes as open declarative shadow DOM without lifecycle', async () => {
    const connected = vi.fn();
    const updated = vi.fn();
    class ServerGreeting extends GluonElement {
      static override readonly properties = {
        name: { type: String, default: 'Guest' },
      };
      declare name: string;
      constructor() {
        super();
        this.onConnected(connected);
        this.onUpdated(updated);
      }
      protected override render() {
        return html`<p>Hello ${this.name}</p><slot></slot>`;
      }
    }
    defineElement('server-greeting', ServerGreeting);
    const rendered = await renderToString(renderElement(ServerGreeting, {
      properties: { name: 'Ada', details: { private: true } },
      children: html`<span>Light DOM</span>`,
    }));
    expect(withoutHydrationMarkers(rendered)).toBe(
      '<server-greeting name="Ada" details="[object Object]">'
      + '<template shadowrootmode="open"><p>Hello Ada</p><slot></slot></template>'
      + '<span>Light DOM</span></server-greeting>',
    );
    expect(connected).not.toHaveBeenCalled();
    expect(updated).not.toHaveBeenCalled();
    expect(() => defineElement('unregistered-other', ServerGreeting)).toThrow('already registered');
    class Unregistered extends GluonElement {
      protected override render() { return html`No tag`; }
    }
    expect(() => renderElement(Unregistered)).toThrow('must be registered');
  });

  it('renders functional GluonElement definitions with request-owned setup cleanup', async () => {
    const connected = vi.fn();
    const cleanup = vi.fn();
    const FunctionalGreeting = defineGluonElement({
      tagName: 'server-functional-greeting',
      properties: {
        person: elementProperty<{ name: string }>({ type: Object, required: true }),
      },
      setup(context) {
        const punctuation = context.state('punctuation', '!');
        const greeting = context.computed(() => `Hello ${context.props.person.name}${punctuation.value}`);
        context.onConnected(connected);
        context.onCleanup(cleanup);
        return { render: () => html`<p>${greeting.value}</p><slot></slot>` };
      },
    });
    const rendered = await renderToString(renderElement(FunctionalGreeting, {
      properties: { person: { name: 'Ada' } },
      children: html`<span>Light DOM</span>`,
    }));
    expect(withoutHydrationMarkers(rendered)).toBe(
      '<server-functional-greeting person="[object Object]">'
      + '<template shadowrootmode="open"><p>Hello Ada!</p><slot></slot></template>'
      + '<span>Light DOM</span></server-functional-greeting>',
    );
    expect(connected).not.toHaveBeenCalled();
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('retains equivalent stateful form-control server output for Gluon, Vue, and React', async () => {
    const children = html`Orbit Lamp<span slot="help">Choose one to five.</span>`;
    for (const definition of [ClassQuantityControl, FunctionalQuantityControl]) {
      const rendered = withoutHydrationMarkers(await renderToString(renderElement(definition, {
        properties: { product, value: 2, required: true },
        children,
      })));
      expect(rendered).toContain('<template shadowrootmode="open">');
      expect(rendered).toContain('<output aria-live="polite">2</output>');
      expect(rendered).toContain('<strong>Total €498.00</strong>');
      expect(rendered).toContain('<slot name="help">Choose a quantity.</slot>');
      expect(rendered).toContain('<span slot="help">Choose one to five.</span>');
    }

    const vue = await renderVueQuantityShadow(product, 2);
    const react = renderReactQuantityShadow(product, 2);
    for (const output of [vue, react]) {
      const rendered = output.replaceAll('<!-- -->', '');
      expect(rendered).toContain('<output aria-live="polite">2</output>');
      expect(rendered).toContain('<strong>Total €498.00</strong>');
      expect(rendered).toContain('<slot name="help">Choose a quantity.</slot>');
    }
  });

  it('streams and statically generates the retained functional quantity-control path', async () => {
    const functionalControl = () => renderElement(FunctionalQuantityControl, {
      properties: { product, value: 2, required: true },
      children: html`Orbit Lamp<span slot="help">Choose one to five.</span>`,
    });
    const streamed = withoutHydrationMarkers(await new Response(renderToReadableStream(functionalControl())).text());
    expect(streamed).toContain('<dx-functional-quantity');
    expect(streamed).toContain('<output aria-live="polite">2</output>');
    expect(streamed).toContain('<strong>Total €498.00</strong>');

    const output = await mkdtemp(join(tmpdir(), 'gluon-functional-control-static-'));
    try {
      const assets = { entry: '/assets/app.js' };
      const generated = await generateStaticSite({
        routes: ['/quantity'],
        outputDirectory: output,
        assets,
        render: (url) => renderRequest({
          url,
          assets,
          createApp: () => createApp(() => html`${functionalControl()}`),
        }),
      });
      expect(generated.pages).toHaveLength(1);
      const staticHtml = withoutHydrationMarkers(await readFile(join(output, 'quantity/index.html'), 'utf8'));
      expect(staticHtml).toContain('<dx-functional-quantity');
      expect(staticHtml).toContain('<output aria-live="polite">2</output>');
      expect(staticHtml).toContain('<strong>Total €498.00</strong>');
    } finally {
      await rm(output, { recursive: true, force: true });
    }
  });
});

describe('@gluonjs/ssr request ownership and state', () => {
  it('renders a deep GLUON GOODS product URL through public server APIs', async () => {
    const response = await renderShopRequest('/products/orbit-lamp');
    const visible = withoutHydrationMarkers(response.html);
    expect(visible).toContain('<h1 id="product-title">Orbit Lamp</h1>');
    expect(visible).toContain('In stock · dispatches in 2–3 days');
    expect(response.html).toContain('href="/products/stack-tray"');
    expect(response.router.location).toBe('/products/orbit-lamp');
    expect(response.store.stores.shop).toEqual(expect.objectContaining({ bag: [] }));
    expect(response.stateScript.startsWith('<script type="application/json" data-gluon-state>')).toBe(true);
  });

  it('isolates concurrent application, Router, Store, data, and reactive scope state', async () => {
    const definition = defineStore('request-counter', () => ({ value: '' }), {
      actions: (store) => ({ set(value: string) { store.value = value; } }),
    });
    const requestKey = createInjectionKey<string>('request');
    const mounted = vi.fn();
    const unmounted = vi.fn();
    const cleanups: string[] = [];

    const createRequest = (id: string, delay: number) => renderRequest({
      url: `/reports/${id}`,
      routes: [{ path: '/reports/:id', name: 'report' }],
      async load({ store }) {
        const counter = definition.use(store);
        await new Promise((resolve) => setTimeout(resolve, delay));
        counter.set(id);
        return { id, counter };
      },
      createApp({ data, router }) {
        const app = createApp(() => html`
          <main>${inject(requestKey)}:${data.counter.value}:${router.currentRoute.value.params.id}</main>
        `);
        app.provide(requestKey, id);
        app.use(() => () => { cleanups.push(id); });
        app.onMounted(mounted);
        app.onUnmounted(unmounted);
        return app;
      },
      state: { requestId: id },
    });

    const [first, second] = await Promise.all([
      createRequest('alpha', 10),
      createRequest('beta', 1),
    ]);
    expect(withoutHydrationMarkers(first.html).trim()).toBe('<main>alpha:alpha:alpha</main>');
    expect(withoutHydrationMarkers(second.html).trim()).toBe('<main>beta:beta:beta</main>');
    expect(first.store.stores['request-counter']).toEqual({ value: 'alpha' });
    expect(second.store.stores['request-counter']).toEqual({ value: 'beta' });
    expect(first.router.location).toBe('/reports/alpha');
    expect(second.router.location).toBe('/reports/beta');
    expect(JSON.parse(first.state)).toEqual(expect.objectContaining({ requestId: 'alpha' }));
    expect(cleanups.sort()).toEqual(['alpha', 'beta']);
    expect(mounted).not.toHaveBeenCalled();
    expect(unmounted).not.toHaveBeenCalled();
  });

  it('disposes request resources after rendering failures', async () => {
    const cleanup = vi.fn();
    await expect(renderRequest({
      url: '/',
      createApp: () => {
        const app = createApp(() => html`${directive(() => () => undefined)()}`);
        app.use(() => cleanup);
        return app;
      },
    })).rejects.toBeInstanceOf(SsrRenderError);
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('serializes state safely and rejects unsafe graphs and values', () => {
    const serialized = serializeSsrState({
      html: '</script><script>alert(1)</script>&',
      separators: '\u2028\u2029',
      values: [null, true, 4],
    });
    expect(serialized).not.toContain('<');
    expect(serialized).not.toContain('&');
    expect(serialized).toContain('\\u003c/script\\u003e');
    expect(serialized).toContain('\\u2028\\u2029');
    expect(() => serializeSsrState({ value: Number.NaN })).toThrow('non-finite');
    expect(() => serializeSsrState({ value: 1n })).toThrow('bigint');
    expect(() => serializeSsrState(undefined)).toThrow('JSON representation');
    expect(() => serializeSsrState(new Date())).toThrow('plain objects');
    const circular: { self?: unknown } = {};
    circular.self = circular;
    expect(() => serializeSsrState(circular)).toThrow('circular');
    const unsafe = Object.create(null) as Record<string, unknown>;
    unsafe.__proto__ = 'blocked';
    expect(() => serializeSsrState(unsafe)).toThrow('Unsafe SSR state key');
  });
});

describe('@gluonjs/ssr stream-oriented interfaces', () => {
  it('emits ordered chunks and an equivalent byte stream', async () => {
    const value = html`<main>${['A', html`<b>B</b>`]}</main>`;
    const chunks: string[] = [];
    for await (const chunk of renderToChunks(value)) chunks.push(chunk);
    expect(withoutHydrationMarkers(chunks.join(''))).toBe('<main>A<b>B</b></main>');

    const response = new Response(renderToReadableStream(value));
    expect(withoutHydrationMarkers(await response.text())).toBe('<main>A<b>B</b></main>');
  });

  it('cancels a readable stream without evaluating remaining chunks', async () => {
    const stream = renderToReadableStream(html`<p>${'value'}</p>`);
    const reader = stream.getReader();
    expect((await reader.read()).done).toBe(false);
    await reader.cancel();
  });

  it('streams nested async fallbacks and resolutions and aborts pending work', async () => {
    const nested = Suspense({
      source: Promise.resolve('outer'),
      fallback: html`<p>outer loading</p>`,
      children: (outer) => html`<section>${outer}${Suspense({
        source: Promise.resolve('inner'),
        fallback: html`<p>inner loading</p>`,
        children: (inner) => html`<strong>${inner}</strong>`,
      })}</section>`,
    });
    const chunks = [];
    for await (const chunk of renderProgressively(html`<main>${nested}</main>`)) chunks.push(chunk);
    expect(chunks.map((chunk) => chunk.kind)).toEqual(['shell', 'boundary', 'boundary']);
    expect(withoutHydrationMarkers(chunks[0]!.html)).toContain('outer loading');
    expect(withoutHydrationMarkers(chunks[1]!.html)).toContain('outer');
    expect(withoutHydrationMarkers(chunks[1]!.html)).toContain('inner loading');
    expect(withoutHydrationMarkers(chunks[2]!.html)).toContain('<strong>inner</strong>');

    const controller = new AbortController();
    let sourceAborted = false;
    const pending = Suspense({
      source: ({ signal }) => new Promise<string>(() => {
        signal.addEventListener('abort', () => { sourceAborted = true; }, { once: true });
      }),
      fallback: html`<p>pending</p>`,
      children: (value) => value,
    });
    const stream = renderProgressively(html`${pending}`, { signal: controller.signal });
    expect((await stream.next()).value?.kind).toBe('shell');
    controller.abort(new DOMException('Response aborted', 'AbortError'));
    await expect(stream.next()).rejects.toMatchObject({ name: 'AbortError' });
    expect(sourceAborted).toBe(true);
  });

  it('prepares resolved hydration trees and encodes progressive boundary templates', async () => {
    const value = html`<main>${[
      repeat([1], (item) => item, (item) => html`<b>${item}</b>`),
      Suspense({
        source: Promise.resolve('ready'),
        fallback: html`<i>pending</i>`,
        children: (result) => html`<strong>${result}</strong>`,
      }),
      KeepAlive({ cacheKey: 'prepared', children: html`<u>kept</u>` }),
    ]}</main>`;
    const prepared = await prepareForHydration(value);
    expect(withoutHydrationMarkers(prepared.html)).toBe('<main><b>1</b><strong>ready</strong><u>kept</u></main>');

    const streamed = renderProgressiveReadableStream(html`${Suspense({
      source: Promise.resolve('done'),
      fallback: html`<p>loading</p>`,
      children: (result) => html`<p>${result}</p>`,
    })}`);
    const transport = await new Response(streamed).text();
    expect(transport).toContain('loading');
    expect(transport).toContain('data-gluon-async-patch="0"');
    expect(transport).toContain('done');
  });
});

describe('@gluonjs/ssr static output and style transport', () => {
  it('derives request and progressive component styles from rendered usage', async () => {
    const response = await renderRequest({
      url: '/styled',
      createApp: () => createApp(() => html`${Button({ label: 'Continue' })}${Card({ title: 'Summary' })}`),
    });
    expect(response.styles.entries.map((entry) => entry.id)).toEqual([
      'gluon-atom-button',
      'gluon-molecule-card',
    ]);

    const value = html`${Suspense({
      source: Promise.resolve('Ready'),
      fallback: Button({ label: 'Loading' }),
      children: (title) => Card({ title }),
    })}`;
    const chunks = [];
    for await (const chunk of renderProgressively(value)) chunks.push(chunk);
    expect(chunks[0]!.styles.entries.map((entry) => entry.id)).toEqual(['gluon-atom-button']);
    expect(chunks[1]!.styles.entries.map((entry) => entry.id)).toEqual(['gluon-molecule-card']);

    const transport = await new Response(renderProgressiveReadableStream(value)).text();
    expect(transport.indexOf('data-gluon-style="gluon-atom-button"'))
      .toBeLessThan(transport.indexOf('Loading'));
    expect(transport.indexOf('data-gluon-style="gluon-molecule-card"'))
      .toBeLessThan(transport.indexOf('data-gluon-async-patch="0"'));
  });

  it('preserves stable selection ids and scopes without changing content diagnostics', () => {
    const sheet = css`:root { --named: 1; }`;
    const manifest = createStyleManifest({
      version: 1,
      entries: [{ id: 'named-sheet', scope: 'test-scope', sheet }],
    });
    expect(manifest.entries[0]).toEqual(expect.objectContaining({
      id: 'named-sheet',
      scope: 'test-scope',
      order: 0,
    }));
    expect(renderStyleCarriers(manifest)).toContain('data-gluon-style-scope="test-scope"');
  });

  it('emits safe ordered style carriers, assets, hints, and mixed static/dynamic output', async () => {
    const assets = {
      entry: '/assets/app.js',
      imports: ['/assets/vendor.js'],
      styles: ['/assets/app.css'],
      assets: ['/assets/orbit.webp'],
    };
    const response = await renderShopRequest('/products/orbit-lamp', { assets, nonce: 'request-nonce' });
    expect(response.styles.entries).toHaveLength(5);
    expect(response.styles.entries.map((entry) => entry.id)).toEqual([
      'gluon-ui-layer-order',
      'gluon-ui-foundation',
      'gluon-ui-tokens',
      'gluon-ui-theme',
      'gluon-goods',
    ]);
    expect(response.styles.entries.map((entry) => entry.order)).toEqual([0, 1, 2, 3, 4]);
    expect(response.styles.entries[4]?.cssText).toContain('.checkout-page');
    expect(response.styles.entries.some((entry) => entry.id === 'gluon-atoms-components')).toBe(false);
    expect(response.head).toContain('data-gluon-style="gluon-ui-layer-order"');
    expect(response.head).toContain('nonce="request-nonce"');
    expect(response.head).toContain('rel="modulepreload" href="/assets/vendor.js"');
    expect(response.head).toContain('rel="stylesheet" href="/assets/app.css"');
    expect(response.head).toContain('src="/assets/app.js"');

    const manifest = createStyleManifest([css`p::after { content: "</style><script>bad</script>"; }`]);
    expect(renderStyleCarriers(manifest)).not.toContain('</style><script>');
    expect(renderResourceHints(undefined)).toBe('');

    const output = await mkdtemp(join(tmpdir(), 'gluon-static-'));
    try {
      const generated = await generateStaticSite({
        routes: ['/', '/products/orbit-lamp'],
        dynamicRoutes: ['/products/:slug'],
        outputDirectory: output,
        assets,
        render: (url) => renderShopRequest(url, { assets }),
      });
      expect(generated.pages.map((page) => page.url)).toEqual(['/', '/products/orbit-lamp']);
      expect(generated.dynamicRoutes).toEqual(['/products/:slug']);
      const product = await readFile(join(output, 'products/orbit-lamp/index.html'), 'utf8');
      expect(product).toContain('Orbit Lamp');
      expect(product).toContain('data-gluon-style');
      const deployment = JSON.parse(await readFile(generated.manifestFile, 'utf8'));
      expect(deployment.pages[1].file).toBe('products/orbit-lamp/index.html');
      expect(deployment.assets.entry).toBe('/assets/app.js');
    } finally {
      await rm(output, { recursive: true, force: true });
    }
  });
});

function withoutHydrationMarkers(value: string): string {
  return value
    .replace(/<!--gluon:\/?(?:h|i|k):\d+-->/g, '')
    .replace(/ data-gluon-h-\d+=""/g, '');
}
