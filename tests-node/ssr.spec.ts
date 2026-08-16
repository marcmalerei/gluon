import { describe, expect, it, vi } from 'vitest';
import { Window } from 'happy-dom';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  GluonElement,
  KeepAlive,
  LayoutTransition,
  Suspense,
  Teleport,
  Transition,
  createApp,
  createGluonElementRegistry,
  createInjectionKey,
  createVirtualizer,
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
  trustedHTML,
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
  type SsrRequestResult,
} from '@gluonjs/ssr';
import {
  applyProgressivePatch,
  applyProgressivePatchTemplate,
  ProgressivePatchError,
  renderProgressiveReadableStream,
  renderToReadableStream,
} from '@gluonjs/ssr/streaming';
import { generateStaticSite } from '@gluonjs/ssr/static';
import { gluonEleventyPlugin, renderEleventyPage } from '@gluonjs/ssr/eleventy';
import { renderShopRequest } from '../examples/shop/src/server.js';
import { renderSsrFixture } from '../packages/test-utils/src/ssr.js';
import { ClassQuantityControl } from '../benchmarks/dx/stateful-form-control/gluon-class.js';
import { FunctionalQuantityControl } from '../benchmarks/dx/stateful-form-control/gluon-functional.js';
import { renderReactQuantityShadow } from '../benchmarks/dx/stateful-form-control/react.js';
import { product } from '../benchmarks/dx/stateful-form-control/shared.js';
import { renderVueQuantityShadow } from '../benchmarks/dx/stateful-form-control/vue.js';
import { AspectRatio, Avatar, Button, ScrollArea, Separator } from '@gluonjs/atoms';
import { Accordion, Card, DialogSurface, Disclosure, ResponsiveDisclosure, EmptyState, InlineNotice, SearchField, SearchResults, TableRegion, createDialogSurfaceController } from '@gluonjs/molecules';
import { ConfirmationDialog, WorkflowTimeline } from '@gluonjs/organisms';
import { ProductBadge, ProductPicker } from '@gluonjs/example-component-library';
import { HoverCard, q, Tooltip } from '@gluonjs/quarks';

describe('@gluonjs/ssr DOM-independent serialization', () => {
  it('serializes anchored-overlay semantics without evaluating browser globals', async () => {
    const rendered = withoutHydrationMarkers(await renderToString(html`${Tooltip({
      id: 'server-tip', trigger: (attributes) => q.button({ ...attributes, children: 'Shipping help' }), content: 'Ships tomorrow.',
    })}${HoverCard({
      id: 'server-card', label: 'Maker details', trigger: (attributes) => q.button({ ...attributes, children: 'Maker' }), content: q.a({ href: '/makers/ada', children: 'Ada' }),
    })}`));
    expect(rendered).toContain('id="server-tip-trigger"');
    expect(rendered).toContain('aria-describedby="server-tip-content"');
    expect(rendered).toContain('role="tooltip"');
    expect(rendered).not.toMatch(/server-tip-content[^>]*tabindex/);
    expect(rendered).toContain('aria-controls="server-card-content"');
    expect(rendered).toContain('aria-expanded="false"');
    expect(rendered).toContain('aria-haspopup="dialog"');
    expect(rendered).toContain('role="dialog"');
  });
  it('serializes foundation Atom native semantics and caller-owned states', async () => {
    const rendered = withoutHydrationMarkers(await renderToString(html`
      ${AspectRatio({ ratio: 1.5, attributes: { id: 'server-ratio' }, children: 'Media' })}
      ${Avatar({ src: '/ada.webp', alt: 'Ada Lovelace', status: 'loaded' })}
      ${Avatar({ src: '/lin.webp', alt: 'Lin Chen', fallback: 'LC', status: 'loading' })}
      ${ScrollArea({ label: 'Release notes', orientation: 'both', children: 'Notes' })}
      ${Separator({})}
      ${Separator({ orientation: 'vertical' })}
      ${Separator({ decorative: true })}
    `));

    expect(rendered).toContain('id="server-ratio"');
    expect(rendered).toContain('--gluon-aspect-ratio:1.5');
    expect(rendered).toContain('<img');
    expect(rendered).toContain('alt="Ada Lovelace"');
    expect(rendered).toContain('role="img"');
    expect(rendered).toContain('aria-label="Lin Chen"');
    expect(rendered).toContain('aria-busy="true"');
    expect(rendered).toContain('<section');
    expect(rendered).toContain('aria-label="Release notes"');
    expect(rendered).toContain('tabIndex="0"');
    expect(rendered).toContain('aria-orientation="vertical"');
    expect(rendered).toContain('role="presentation"');
    expect(rendered).toContain('aria-hidden="true"');
  });

  it('serializes WorkflowTimeline without DOM or request state', async () => {
    const first = await renderToString(WorkflowTimeline({
      id: 'ssr-workflow',
      state: 'complete',
      steps: [{ id: 'done', label: 'Done', status: 'completed', evidence: 'Receipt 42' }],
    }));
    const second = await renderToString(WorkflowTimeline({
      id: 'ssr-workflow',
      state: 'complete',
      steps: [{ id: 'done', label: 'Done', status: 'completed', evidence: 'Receipt 42' }],
    }));
    expect(first).toBe(second);
    expect(first).toContain('<ol');
    expect(first).toContain('Receipt 42');
    expect(first).toContain('data-gluon-h-');
  });

  it('serializes native ConfirmationDialog relationships without browser lifecycle calls', async () => {
    const rendered = withoutHydrationMarkers(await renderToString(ConfirmationDialog({
      id: 'server-confirmation',
      title: 'Archive order?',
      description: 'The caller owns the mutation.',
      safeAction: Button({ label: 'Cancel' }),
      primaryAction: Button({ label: 'Archive' }),
      open: true,
      destructive: true,
    })));
    expect(rendered).toContain('<dialog');
    expect(rendered).toContain('open');
    expect(rendered).toContain('aria-labelledby="server-confirmation-title"');
    expect(rendered).toContain('aria-describedby="server-confirmation-description"');
    expect(rendered).toContain('data-destructive');
  });

  it('serializes request-free search compositions with native semantics', async () => {
    const rendered = withoutHydrationMarkers(await renderToString([
      SearchField({ id: 'server-search', label: 'Search', query: 'cobalt', submitLabel: 'Find' }),
      SearchResults({ id: 'server-results', heading: 'Results', groups: [{ id: 'products', heading: 'Products', count: 1, children: html`<li>Cobalt</li>` }] }),
    ]));
    expect(rendered).toContain('role="search"');
    expect(rendered).toContain('type="search"');
    expect(rendered).toContain('Products');
    expect(rendered).toContain('<ul');
  });

  it('serializes the DialogSurface ARIA structure without invoking browser focus APIs', async () => {
    const rendered = withoutHydrationMarkers(await renderToString(DialogSurface({
      id: 'server-dialog',
      labelledBy: 'server-dialog-title',
      title: 'Server dialog',
      description: 'Rendered without a DOM.',
      controller: createDialogSurfaceController(),
      closeAction: Button({ label: 'Close' }),
      children: 'Server content',
      footer: 'Server actions',
    })));
    expect(rendered).toContain('gluon-dialog-surface-overlay');
    expect(rendered).toContain('role="dialog"');
    expect(rendered).toContain('aria-labelledby="server-dialog-title"');
    expect(rendered).toContain('aria-describedby="server-dialog-description"');
    expect(rendered).toContain('Server actions');
  });

  it('serializes native Disclosure open and unavailable relationships', async () => {
    const rendered = withoutHydrationMarkers(await renderToString(Disclosure({
      id: 'server-disclosure',
      summary: 'Repair history',
      defaultOpen: true,
      unavailable: true,
      unavailableReason: 'Available after the first repair.',
      children: 'No repairs yet.',
    })));
    expect(rendered).toContain('<details');
    expect(rendered).toContain('open');
    expect(rendered).toContain('<summary');
    expect(rendered).toContain('aria-disabled="true"');
    expect(rendered).toContain('aria-describedby="server-disclosure-unavailable"');
  });

  it('serializes one responsive Disclosure tree with explicit compact initial semantics', async () => {
    const closed = withoutHydrationMarkers(await renderToString(ResponsiveDisclosure({
      id: 'server-responsive-closed',
      summary: 'Catalog filters',
      compactBreakpoint: '(max-width: 48rem)',
      compactInitialOpen: false,
      children: 'One filter content tree.',
    })));
    const opened = withoutHydrationMarkers(await renderToString(ResponsiveDisclosure({
      id: 'server-responsive-open',
      summary: 'Catalog filters',
      compactBreakpoint: '(max-width: 48rem)',
      compactInitialOpen: true,
      children: 'One filter content tree.',
    })));
    expect(closed).toContain('<details');
    expect(closed).not.toMatch(/<details[^>]*\sopen(?:=|\s|>)/);
    expect(closed).toContain('aria-expanded="false"');
    expect(opened).toMatch(/<details[^>]*\sopen(?:=|\s|>)/);
    expect(opened).toContain('aria-expanded="true"');
    expect(opened.match(/One filter content tree\./g)).toHaveLength(1);
  });

  it('serializes Accordion group, heading, and controlled native disclosures', async () => {
    const rendered = withoutHydrationMarkers(await renderToString(Accordion({
      label: 'Delivery service details',
      value: 'tracking',
      items: [
        { id: 'server-tracking', value: 'tracking', summary: 'Tracking', children: 'Sent after dispatch.' },
        { id: 'server-remote', value: 'remote', summary: 'Remote areas', unavailable: true, unavailableReason: 'Not available.', children: 'Unavailable.' },
      ],
    })));
    expect(rendered).toContain('role="group"');
    expect(rendered).toContain('aria-label="Delivery service details"');
    expect(rendered).toContain('role="heading"');
    expect(rendered).toContain('aria-level="3"');
    expect(rendered).toContain('id="server-tracking"');
    expect(rendered).toContain('open');
    expect(rendered).toContain('server-remote-unavailable');
  });

  it('serializes InlineNotice live content separately from caller-owned actions', async () => {
    const rendered = withoutHydrationMarkers(await renderToString(InlineNotice({
      tone: 'danger',
      title: 'Payment failed',
      children: 'Try another payment method.',
      action: Button({ label: 'Try again' }),
    })));
    expect(rendered).toContain('gluon-inline-notice');
    expect(rendered).toContain('data-tone="danger"');
    expect(rendered).toContain('role="alert"');
    expect(rendered).toContain('aria-live="assertive"');
    expect(rendered).toContain('Payment failed');
    expect(rendered).toContain('gluon-inline-notice-actions');
  });

  it('serializes EmptyState as static content with semantic heading and recovery', async () => {
    const rendered = withoutHydrationMarkers(await renderToString(EmptyState({
      heading: 'No matching objects',
      headingLevel: 3,
      children: 'Clear the filters.',
      presentation: 'compact',
      action: Button({ label: 'Clear filters' }),
    })));
    expect(rendered).toContain('gluon-empty-state');
    expect(rendered).toContain('data-presentation="compact"');
    expect(rendered).toContain('role="heading"');
    expect(rendered).toContain('aria-level="3"');
    expect(rendered).not.toContain('aria-live');
    expect(rendered).toContain('Clear filters');
  });

  it('serializes TableRegion relationships and caller-owned native table semantics', async () => {
    const rendered = withoutHydrationMarkers(await renderToString(TableRegion({
      id: 'server-orders',
      label: 'Recent orders',
      summary: 'One recent order.',
      scrollHint: 'Scroll horizontally to review every column.',
      children: html`<table><caption>Recent orders</caption><thead><tr><th scope="col">Order</th></tr></thead><tbody><tr><th scope="row">A-101</th></tr></tbody></table>`,
    })));
    expect(rendered).toContain('role="region"');
    expect(rendered).toContain('aria-label="Recent orders"');
    expect(rendered).toContain('aria-describedby="server-orders-summary"');
    expect(rendered).toContain('id="server-orders-scroll-hint"');
    expect(rendered).toContain('<table>');
    expect(rendered).toContain('<caption>Recent orders</caption>');
    expect(rendered).not.toContain('role="grid"');
  });

  it('renders request-isolated Eleventy pages and disposes success and failure ownership', async () => {
    const disposed: string[] = [];
    const assets = { entry: '/assets/app.js', imports: ['/assets/vendor.js'] };
    const options = {
      assets: async () => assets,
      nonce: (data: { readonly nonce: string }) => data.nonce,
      csp: "default-src 'self'",
      hydrationEntry: '/assets/hydrate.js',
      createRequest: ({ url, signal }: { readonly url: string; readonly signal: AbortSignal }) => ({
        render: async () => {
          await Promise.resolve();
          if (url === '/failure') throw new Error('render failed');
          return renderShopRequest(url, { assets, nonce: 'request-nonce' });
        },
        dispose: () => disposed.push(`${url}:${signal.aborted}`),
      }),
    };
    const [home, product] = await Promise.all([
      renderEleventyPage(options, '/', 'index.gluon', { nonce: 'home' }),
      renderEleventyPage(options, '/products/orbit-lamp', 'product.gluon', { nonce: 'product' }),
    ]);
    expect(home).toContain('Objects that work the way you do.');
    expect(product).toContain('Orbit Lamp');
    expect(product).toContain('data-gluon-style=');
    expect(product).toContain('Content-Security-Policy');
    expect(product).toContain('src="/assets/hydrate.js"');
    expect(disposed).toEqual(expect.arrayContaining(['/:false', '/products/orbit-lamp:false']));
    await expect(renderEleventyPage(options, '/failure', 'failure.gluon', { nonce: 'failure' }))
      .rejects.toThrow('render failed');
    expect(disposed).toContain('/failure:true');

    const external = new AbortController();
    let requestReady!: () => void;
    const ready = new Promise<void>((resolve) => { requestReady = resolve; });
    const aborted = renderEleventyPage({
      assets,
      signal: external.signal,
      createRequest: ({ signal }) => ({
        render: () => new Promise<SsrRequestResult>((_resolve, reject) => {
          requestReady();
          signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        }),
        dispose: () => disposed.push(`external:${signal.aborted}`),
      }),
    }, '/', 'abort.gluon', {});
    await ready;
    external.abort(new Error('build aborted'));
    await expect(aborted).rejects.toThrow('build aborted');
    expect(disposed).toContain('external:true');
  });

  it('registers the Eleventy extension, route mapping, fallbacks, and validation boundaries', async () => {
    let extension: import('@gluonjs/ssr/eleventy').EleventyExtension | undefined;
    const formats: string[] = [];
    const globals = new Map<string, unknown>();
    gluonEleventyPlugin({
      addTemplateFormats: (format) => formats.push(format),
      addExtension: (_format, definition) => { extension = definition; },
      addGlobalData: (name, value) => globals.set(name, value),
    }, {
      inputExtension: '.gluon',
      assets: { entry: '/app.js' },
      dynamicFallbacks: ['/products/:slug'],
      route: (_content, _path, data) => ({ url: String(data.route), dynamic: data.dynamic === true }),
      createRequest: () => ({ render: () => renderShopRequest('/') }),
      document: ({ result, url }) => `<main data-route="${url}">${result.html}</main>`,
    });
    expect(formats).toEqual(['gluon']);
    expect(globals.get('gluonDynamicFallbacks')).toEqual(['/products/:slug']);
    const render = await extension!.compile('ignored', 'page.gluon');
    expect(await render({ route: '/' })).toContain('data-route="/"');
    await expect(render({ route: '/products/one', dynamic: true })).rejects.toThrow('deployment fallback');
    expect(() => gluonEleventyPlugin({ addTemplateFormats() {}, addExtension() {} }, {
      inputExtension: '../bad', assets: { entry: '/app.js' }, createRequest: () => ({ render: () => renderShopRequest('/') }),
    })).toThrow('Invalid Eleventy input extension');
    await expect(renderEleventyPage({
      assets: { entry: 'https://outside.test/app.js' }, createRequest: () => ({ render: () => renderShopRequest('/') }),
    }, '/', 'bad.gluon', {})).rejects.toThrow('root-relative');

    const snapshotResult = {
      html: '<main>Snapshot</main>', state: '{}',
      stateScript: '<script type="application/json" data-gluon-state>{}</script>',
      head: '<style data-gluon-style="app">main{display:block}</style>',
      styles: { version: 1, entries: [] }, router: { location: '/' }, store: { version: 1, stores: {} },
    } as unknown as SsrRequestResult;
    expect(await renderEleventyPage({
      assets: { entry: '/assets/app.js' }, nonce: 'nonce', csp: "default-src 'self'",
      hydrationEntry: '/assets/hydrate.js', createRequest: () => ({ render: () => snapshotResult }),
    }, '/', 'snapshot.gluon', {})).toBe(
      '<!doctype html><html lang="en"><head><meta charset="UTF-8">'
      + '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'">'
      + '<style data-gluon-style="app">main{display:block}</style></head>'
      + '<body><div id="app"><main>Snapshot</main></div>'
      + '<script type="application/json" data-gluon-state>{}</script>'
      + '<script type="module" src="/assets/hydrate.js"></script></body></html>',
    );
  });

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

  it('renders a deterministic useful virtualizer window without browser globals', async () => {
    const items = Array.from({ length: 20 }, (_, index) => ({ id: `item-${index}`, label: `Item ${index}` }));
    const virtualizer = createVirtualizer({
      items,
      key: (item) => item.id,
      renderItem: (item) => html`<a href=${`/items/${item.id}`}>${item.label}</a>`,
      estimateSize: 40,
      ssrCount: 6,
      ariaLabel: 'Inventory',
    });

    const rendered = withoutHydrationMarkers(await renderToString(virtualizer.view()));

    expect(rendered).toContain('aria-label="Inventory"');
    expect(rendered).toContain('Item 0');
    expect(rendered).toContain('Item 5');
    expect(rendered).not.toContain('Item 6');
    expect(rendered).toContain('height:800px');
    virtualizer.stop();
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
    expect(withoutHydrationMarkers(await renderToString(html`<section>${trustedHTML('<i>owned</i>')}</section>`)))
      .toBe('<section><i>owned</i></section>');
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
    expect(await renderToString(html`<iframe srcdoc=${trustedHTML('<p>policy owned</p>')}></iframe>`))
      .toContain('srcdoc="&lt;p&gt;policy owned&lt;/p&gt;"');
    await expect(renderToString(html`<p title=${unsafeHTML('<b>bad</b>')}></p>`))
      .rejects.toThrow('unsafeHTML() can only be used');
    await expect(renderToString(html`<p title=${trustedHTML('<b>bad</b>')}></p>`))
      .rejects.toThrow('trustedHTML() can only be used');

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
      ${LayoutTransition({ layoutId: 'server-layout', children: html`<section>layout</section>` })}
    `;
    expect(withoutHydrationMarkers(await renderToString(value))).toContain(
      '<p>ready</p>\n      <aside>teleported</aside>\n      <article>cached</article>\n      <div>stable</div>\n      <section>layout</section>',
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

  it('transports deterministic local marker ranges for nested and adjacent DSD roots', async () => {
    class MarkerInner extends GluonElement {
      protected override render() { return html`<p>${'inner'}</p>`; }
    }
    class MarkerOuter extends GluonElement {
      protected override render() {
        return html`<section>${renderElement(MarkerInner)}</section>`;
      }
    }
    defineElement('ssr-marker-inner', MarkerInner);
    defineElement('ssr-marker-outer', MarkerOuter);

    const value = html`${renderElement(MarkerOuter)}${renderElement(MarkerInner)}`;
    const [first, second] = await Promise.all([renderToString(value), renderToString(value)]);
    expect(first).toBe(second);
    expect(first).toContain('data-gluon-hydration="v1:3:6"');
    expect(first).toContain('data-gluon-hydration="v1:6:7"');
    expect(first).toContain('data-gluon-hydration="v1:10:11"');
    expect(first.indexOf('data-gluon-hydration="v1:3:6"'))
      .toBeLessThan(first.indexOf('data-gluon-hydration="v1:6:7"'));
    const chunks: string[] = [];
    for await (const chunk of renderToChunks(value)) chunks.push(chunk);
    expect(chunks.join('')).toBe(first);
    const progressive = [];
    for await (const chunk of renderProgressively(value)) progressive.push(chunk);
    expect(progressive).toHaveLength(1);
    expect(progressive[0]!.html).toBe(first);
  });

  it('server-renders the packed component-library public exports', async () => {
    const atom = withoutHydrationMarkers(await renderToString(ProductBadge('In stock')));
    expect(atom).toBe('<span class="gluon quark example-product-badge">In stock</span>');

    const element = withoutHydrationMarkers(await renderToString(renderElement(
      ProductPicker as import('@gluonjs/core').GluonElementClass,
      { properties: { value: 2 } },
    )));
    expect(element).toContain('<example-product-picker value="2">');
    expect(element).toContain('<template shadowrootmode="open">');
    expect(element).toContain('aria-label="Increase quantity"');
    expect(element).toContain('<output aria-live="polite">2</output>');
  });

  it('serializes scoped class and functional definitions for declarative registry hydration', async () => {
    const registry = createGluonElementRegistry();
    class ScopedServerStatus extends GluonElement {
      static override readonly shadowRootRegistry = registry;
      protected override render() { return html`<p>Scoped class status</p>`; }
    }
    defineElement('server-scoped-status', ScopedServerStatus, { registry });
    const FunctionalScopedStatus = defineGluonElement({
      tagName: 'server-functional-scoped-status',
      setup() {
        return { render: () => html`<p>Scoped functional status</p>` };
      },
    }, { registry, shadowRootRegistry: registry });

    const classHtml = withoutHydrationMarkers(await renderToString(renderElement(
      ScopedServerStatus,
      { registry },
    )));
    const functionalHtml = withoutHydrationMarkers(await renderToString(renderElement(
      FunctionalScopedStatus,
      { registry },
    )));
    expect(classHtml).toBe(
      '<server-scoped-status><template shadowrootmode="open" shadowrootcustomelementregistry>'
      + '<p>Scoped class status</p></template></server-scoped-status>',
    );
    expect(functionalHtml).toBe(
      '<server-functional-scoped-status><template shadowrootmode="open" shadowrootcustomelementregistry>'
      + '<p>Scoped functional status</p></template></server-functional-scoped-status>',
    );
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
  it('passes the exact request signal and rejects before load or app creation when pre-aborted', async () => {
    const controller = new AbortController();
    const reason = new Error('pre-aborted');
    controller.abort(reason);
    const load = vi.fn();
    const createAppSpy = vi.fn();
    await expect(renderRequest({
      url: '/',
      signal: controller.signal,
      load,
      createApp: createAppSpy,
    })).rejects.toBe(reason);
    expect(load).not.toHaveBeenCalled();
    expect(createAppSpy).not.toHaveBeenCalled();
  });

  it('aborts a request during load without starting the application', async () => {
    const controller = new AbortController();
    const reason = new Error('load-aborted');
    let started!: () => void;
    const loadStarted = new Promise<void>((resolve) => { started = resolve; });
    const load = vi.fn(({ signal }: { readonly signal: AbortSignal }) => {
      expect(signal).toBe(controller.signal);
      started();
      return new Promise<never>(() => {});
    });
    const createAppSpy = vi.fn();
    const pending = renderRequest({
      url: '/',
      signal: controller.signal,
      load,
      createApp: createAppSpy,
    });
    await loadStarted;
    controller.abort(reason);
    await expect(pending).rejects.toBe(reason);
    expect(createAppSpy).not.toHaveBeenCalled();
  });

  it('aborts async request rendering and runs application cleanup exactly once', async () => {
    const controller = new AbortController();
    const reason = new Error('boundary-aborted');
    let started!: () => void;
    const boundaryStarted = new Promise<void>((resolve) => { started = resolve; });
    const cleanup = vi.fn();
    let contextSignal!: AbortSignal;
    const pending = renderRequest({
      url: '/',
      signal: controller.signal,
      createApp: (context) => {
        contextSignal = context.signal;
        const app = createApp(() => html`${Suspense({
          source: ({ signal }) => {
            started();
            return new Promise<string>(() => {
              signal.addEventListener('abort', () => undefined, { once: true });
            });
          },
          fallback: html`<p>loading</p>`,
          children: (value) => html`<p>${value}</p>`,
        })}`);
        app.use(() => cleanup);
        return app;
      },
    });
    await boundaryStarted;
    expect(contextSignal).toBe(controller.signal);
    controller.abort(reason);
    await expect(pending).rejects.toBe(reason);
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('renders a deep GLUON GOODS product URL through public server APIs', async () => {
    const fixture = await renderSsrFixture(
      () => renderShopRequest('/products/orbit-lamp'),
      { name: 'shop-product-request' },
    );
    const visible = withoutHydrationMarkers(fixture.html);
    expect(visible).toContain('<h1 id="product-title">Orbit Lamp</h1>');
    expect(fixture.contains('Orbit Lamp')).toBe(true);
    expect(visible).toContain('gluon-status-badge is-success">In stock</span>');
    expect(visible).toContain('<span>Dispatches in 2–3 days</span>');
    expect(visible).toContain('shadowrootcustomelementregistry');
    expect(visible).toContain('<gluon-product-add-action');
    expect(visible).toMatch(
      /<button type="button" class="add-to-bag">\s*Add to bag — €189\s*<\/button>/,
    );
    expect(fixture.html).toContain('href="/products/stack-tray"');
    expect(fixture.router.location).toBe('/products/orbit-lamp');
    expect(fixture.store.stores.shop).toEqual(expect.objectContaining({ bag: [] }));
    expect(fixture.stateScript.startsWith('<script type="application/json" data-gluon-state>')).toBe(true);
    expect(fixture.styles.entries.map((entry) => entry.id)).toEqual([
      'gluon-ui-layer-order',
      'gluon-ui-foundation',
      'gluon-ui-tokens',
      'gluon-ui-theme',
      'gluon-atom-status-badge',
      'shop-editorial-link',
      'gluon-molecule-tabs',
      'gluon-molecule-toolbar',
      'gluon-goods-ui-tokens',
      'gluon-goods',
    ]);
  });

  it('isolates concurrent application, Router, Store, data, and reactive scope state', async () => {
    const definition = defineStore('request-counter', () => ({ value: '' }), {
      actions: (store) => ({ set(value: string) { store.value = value; } }),
    });
    const requestKey = createInjectionKey<string>('request');
    const mounted = vi.fn();
    const unmounted = vi.fn();
    const cleanups: string[] = [];

    const createRequest = (id: string, delay: number) => renderSsrFixture(() => renderRequest({
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
    }), { name: `request-${id}` });

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
    expect(() => serializeSsrState({ value: () => undefined })).toThrow('function');
    expect(() => serializeSsrState({ value: Symbol('blocked') })).toThrow('symbol');
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

  it('applies progressive patches to a DOM, installs styles, and handles nested boundaries', () => {
    const window = new Window();
    const document = window.document;
    const root = document.createElement('main');
    root.innerHTML = '<!--gluon:async:1--><span>Loading</span><!--gluon:/async:1-->';
    const styleRoot = document.createElement('div').attachShadow({ mode: 'open' });
    const styles = {
      version: 1 as const,
      entries: [{ id: 'progressive-card', scope: 'shop', cssText: '.card { color: red; }', digest: 'digest-1', order: 0 }],
    };

    const outer = applyProgressivePatch(root, {
      kind: 'boundary',
      id: 1,
      html: '<!--gluon:async:2--><span>Nested loading</span><!--gluon:/async:2-->',
      styles,
    }, { styleRoot });
    expect(outer).toEqual({ id: 1, insertedNodes: 3, installedStyleIds: ['progressive-card'] });
    expect(root.textContent).toBe('Nested loading');
    expect(styleRoot.querySelector('style[data-gluon-style="progressive-card"]')?.dataset.gluonStyleScope).toBe('shop');

    const inner = applyProgressivePatch(root, {
      kind: 'boundary',
      id: 2,
      html: '<strong class="card">Ready</strong>',
      styles,
    }, { styleRoot });
    expect(inner.installedStyleIds).toEqual([]);
    expect(root.querySelector('strong.card')?.textContent).toBe('Ready');
    expect(styleRoot.querySelectorAll('style[data-gluon-style="progressive-card"]')).toHaveLength(1);

    const templateRoot = document.createElement('main');
    templateRoot.innerHTML = '<!--gluon:async:7--><span>Loading</span><!--gluon:/async:7-->';
    const template = document.createElement('template');
    template.dataset.gluonAsyncPatch = '7';
    template.innerHTML = '<em>Template replacement</em>';
    expect(applyProgressivePatchTemplate(templateRoot, template).insertedNodes).toBe(1);
    expect(templateRoot.textContent).toBe('Template replacement');

    const policyRoot = document.createElement('main');
    policyRoot.innerHTML = '<!--gluon:async:8--><!--gluon:/async:8-->';
    const policyResult = applyProgressivePatch(policyRoot, {
      kind: 'boundary', id: 8, html: '<mark>Policy patch</mark>', styles: { version: 1, entries: [] },
    }, { trustedTypes: { policyName: 'ssr-test', policy: { name: 'ssr-test', createHTML: (value) => value } } });
    expect(policyResult.insertedNodes).toBe(1);
    expect(policyRoot.textContent).toBe('Policy patch');
  });

  it('rejects invalid, malformed, aborted, and conflicting progressive patches without mutation', () => {
    const window = new Window();
    const document = window.document;
    const root = document.createElement('main');
    root.innerHTML = '<!--gluon:async:3--><span>Loading</span><!--gluon:/async:3-->';
    const controller = new AbortController();
    controller.abort(new Error('navigation changed'));

    expect(() => applyProgressivePatch(root, {
      kind: 'boundary', id: 3, html: '<strong>Ready</strong>', styles: { version: 1, entries: [] },
    }, { signal: controller.signal })).toThrowError(new ProgressivePatchError('GLUON_SSR_PROGRESSIVE_ABORTED', 'navigation changed'));
    expect(root.textContent).toBe('Loading');

    expect(() => applyProgressivePatch(root, {
      kind: 'boundary', id: -1, html: '<strong>Never</strong>', styles: { version: 1, entries: [] },
    })).toThrowError(ProgressivePatchError);
    const invalidTemplate = document.createElement('template');
    expect(() => applyProgressivePatchTemplate(root, invalidTemplate)).toThrowError(ProgressivePatchError);

    expect(() => applyProgressivePatch(root, {
      kind: 'boundary', id: 99, html: '<strong>Never</strong>', styles: { version: 1, entries: [] },
    })).toThrowError(/missing or malformed/);

    const duplicate = document.createElement('main');
    duplicate.innerHTML = '<!--gluon:async:4--><!--gluon:async:4--><!--gluon:/async:4-->';
    expect(() => applyProgressivePatch(duplicate, {
      kind: 'boundary', id: 4, html: '<strong>Never</strong>', styles: { version: 1, entries: [] },
    })).toThrowError(/duplicate start markers/);

    const styleRoot = document.createElement('div');
    const style = document.createElement('style');
    style.dataset.gluonStyle = 'conflict';
    style.dataset.gluonDigest = 'old';
    style.textContent = '.old {}';
    styleRoot.append(style);
    expect(() => applyProgressivePatch(root, {
      kind: 'boundary', id: 3, html: '<strong>Never</strong>',
      styles: { version: 1, entries: [{ id: 'conflict', cssText: '.new {}', digest: 'new', order: 0 }] },
    }, { styleRoot })).toThrowError(/does not match its manifest/);
    expect(root.textContent).toBe('Loading');

    const detachedRoot = { nodeType: 1, ownerDocument: null } as unknown as ParentNode;
    expect(() => applyProgressivePatch(detachedRoot, {
      kind: 'boundary', id: 1, html: '', styles: { version: 1, entries: [] },
    })).toThrowError(/must belong to a document/);

    const policyRoot = document.createElement('main');
    policyRoot.innerHTML = '<!--gluon:async:10--><!--gluon:/async:10-->';
    expect(() => applyProgressivePatch(policyRoot, {
      kind: 'boundary', id: 10, html: '<b>never</b>', styles: { version: 1, entries: [] },
    }, { trustedTypes: { policyName: 'missing' } as never })).toThrowError(/requires matching policyName/i);
    expect(() => applyProgressivePatch(policyRoot, {
      kind: 'boundary', id: 10, html: '<b>never</b>', styles: { version: 1, entries: [] },
    }, { trustedTypes: { policyName: 'throws', policy: { createHTML: () => { throw new Error('no'); } } } }))
      .toThrowError(/threw while parsing/i);
    expect(policyRoot.textContent).toBe('');
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
    expect(response.styles.entries).toHaveLength(10);
    expect(response.styles.entries.map((entry) => entry.id)).toEqual([
      'gluon-ui-layer-order',
      'gluon-ui-foundation',
      'gluon-ui-tokens',
      'gluon-ui-theme',
      'gluon-atom-status-badge',
      'shop-editorial-link',
      'gluon-molecule-tabs',
      'gluon-molecule-toolbar',
      'gluon-goods-ui-tokens',
      'gluon-goods',
    ]);
    expect(response.styles.entries.map((entry) => entry.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(response.styles.entries[4]?.cssText).toContain('.gluon-status-badge');
    expect(response.styles.entries[5]?.cssText).toContain('.shop-editorial-link');
    expect(response.styles.entries[6]?.cssText).toContain('.gluon-tabs');
    expect(response.styles.entries[7]?.cssText).toContain('.gluon-toolbar');
    expect(response.styles.entries[8]?.cssText).toContain('--gluon-color-action: #c8ff00');
    expect(response.styles.entries[9]?.cssText).toContain('.checkout-page');
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
    .replace(/ data-gluon-h-\d+=""/g, '')
    .replace(/ data-gluon-hydration="v\d+:\d+:\d+"/g, '');
}
