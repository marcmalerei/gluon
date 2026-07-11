import { describe, expect, it, vi } from 'vitest';
import {
  GluonElement,
  KeepAlive,
  Suspense,
  Teleport,
  Transition,
  createApp,
  createInjectionKey,
  css,
  defineElement,
  directive,
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
  renderElement,
  renderRequest,
  renderToChunks,
  renderToString,
  serializeSsrState,
} from '@gluonjs/ssr';
import { renderToReadableStream } from '@gluonjs/ssr/streaming';
import { renderShopRequest } from '../examples/shop/src/server.js';

describe('@gluonjs/ssr DOM-independent serialization', () => {
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
    expect(rendered).toContain('title="A &amp; &quot;B&quot;"');
    expect(rendered).toContain('value="field"');
    expect(rendered).not.toContain('hidden=');
    expect(rendered).not.toContain('@click');
    expect(rendered).toContain('class="card active"');
    expect(rendered).toContain('style="background-color:red;opacity:0.5"');
    expect(rendered).toContain('data-item-id="4"');
    expect(rendered).toContain('aria-label="Card"');
    expect(rendered).toContain('disabled');
    expect(rendered).toContain('&lt;unsafe&gt;');
    expect(rendered).toContain('<b>1</b><b>2</b>');
    expect(rendered).toContain('<em>trusted</em>');
    expect(rendered).toContain('<svg viewBox="0 0 1 1"><path d="M0 0"></path></svg>');
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
    expect(await renderToString(html`${unsafeURL('https://example.test/?a=1&b=2')}`))
      .toBe('https://example.test/?a=1&amp;b=2');
    expect(await renderToString(html`${event(() => undefined)}`)).toBe('');
    expect(await renderToString(html`<p title="${'quoted'}"></p>`)).toBe('<p title="quoted"></p>');
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
    expect(rendered).toContain('class="4"');
    expect(rendered).toContain('style="color:blue"');
    expect(rendered).not.toContain('empty=');
    expect(rendered).not.toContain('payload=');
    expect(rendered).toContain('true2https://example.test/path');
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
    expect(await renderToString(value)).toContain(
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
    expect(rendered).toBe(
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
});

describe('@gluonjs/ssr request ownership and state', () => {
  it('renders a deep GLUON GOODS product URL through public server APIs', async () => {
    const response = await renderShopRequest('/products/orbit-lamp');
    expect(response.html).toContain('<h1 id="product-title">Orbit Lamp</h1>');
    expect(response.html).toContain('In stock · dispatches in 2–3 days');
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
    expect(first.html.trim()).toBe('<main>alpha:alpha:alpha</main>');
    expect(second.html.trim()).toBe('<main>beta:beta:beta</main>');
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
    expect(chunks.join('')).toBe('<main>A<b>B</b></main>');

    const response = new Response(renderToReadableStream(value));
    expect(await response.text()).toBe('<main>A<b>B</b></main>');
  });

  it('cancels a readable stream without evaluating remaining chunks', async () => {
    const stream = renderToReadableStream(html`<p>${'value'}</p>`);
    const reader = stream.getReader();
    expect((await reader.read()).done).toBe(false);
    await reader.cancel();
  });
});
