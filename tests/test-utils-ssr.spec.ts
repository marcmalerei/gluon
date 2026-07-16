import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SsrRequestResult } from '@gluonjs/ssr';
import {
  activeSsrFixtureNames,
  assertNoSsrFixtureLeaks,
  cleanupSsrFixtures,
  hydrateSsrFixture,
  renderSsrFixture,
} from '@gluonjs/test-utils/ssr';

const response: SsrRequestResult = Object.freeze({
  html: '<!--gluon:h:0--><main><h1>Orbit Lamp</h1></main><!--gluon:/h:0-->',
  head: '<style data-gluon-style="shop" data-gluon-digest="digest">main { color: black; }</style>',
  state: '{"router":{"path":"/products/orbit-lamp"}}',
  stateScript: '<script type="application/json" data-gluon-state>{"router":{"path":"/products/orbit-lamp"}}</script>',
  styles: { version: 1 as const, entries: [] },
  router: { location: '/products/orbit-lamp' },
  store: { version: 1 as const, stores: {} },
});

describe('SSR and hydration fixtures', () => {
  beforeEach(async () => {
    await cleanupSsrFixtures();
    document.head.querySelectorAll('[data-gluon-style]').forEach((node) => node.remove());
    document.body.replaceChildren();
  });

  it('retains the complete public SSR transport result', async () => {
    const render = vi.fn(async () => response);
    const fixture = await renderSsrFixture(render, { name: 'product-request' });

    expect(render).toHaveBeenCalledOnce();
    expect(fixture.name).toBe('product-request');
    expect(fixture.response).toBe(response);
    expect(fixture.contains('Orbit Lamp')).toBe(true);
    expect(fixture.head).toContain('data-gluon-style');
    expect(fixture.stateScript).toContain('data-gluon-state');
    expect(fixture.styles).toBe(response.styles);
    expect(fixture.router).toBe(response.router);
    expect(fixture.store).toBe(response.store);
  });

  it('does not retain state when the public SSR request rejects', async () => {
    await expect(renderSsrFixture(async () => { throw new Error('request failed'); }))
      .rejects.toThrow('request failed');
    expect(activeSsrFixtureNames()).toEqual([]);
  });

  it('installs server transport, exposes black-box queries, and cleans every owned node', async () => {
    const server = await renderSsrFixture(async () => response, { name: 'shop' });
    const dispose = vi.fn();
    const fixture = await hydrateSsrFixture(server, {
      hydrate: async ({ container, stateRoot }) => {
        expect(stateRoot.querySelector('[data-gluon-state]')).not.toBeNull();
        container.querySelector('main')?.setAttribute('data-hydrated', '');
        return { retained: true };
      },
      dispose,
    });

    expect(fixture.get('h1').textContent).toBe('Orbit Lamp');
    expect(fixture.query('main')?.hasAttribute('data-hydrated')).toBe(true);
    expect(fixture.text()).toContain('Orbit Lamp');
    expect(activeSsrFixtureNames()).toEqual(['shop-hydration']);
    expect(() => assertNoSsrFixtureLeaks()).toThrow('shop-hydration');

    await fixture.cleanup();
    expect(dispose).toHaveBeenCalledWith({ retained: true });
    expect(fixture.active).toBe(false);
    expect(document.querySelector('[data-gluon-test-hydration]')).toBeNull();
    expect(document.querySelector('[data-gluon-test-state]')).toBeNull();
    expect(document.head.querySelector('[data-gluon-style]')).toBeNull();
    expect(() => assertNoSsrFixtureLeaks()).not.toThrow();
  });

  it('rolls back installed transport when hydration fails', async () => {
    const server = await renderSsrFixture(async () => response);

    await expect(hydrateSsrFixture(server, {
      hydrate: async () => { throw new Error('hydration failed'); },
    })).rejects.toThrow('hydration failed');
    expect(activeSsrFixtureNames()).toEqual([]);
    expect(document.body.childNodes).toHaveLength(0);
    expect(document.head.querySelector('[data-gluon-style]')).toBeNull();
  });

  it('materializes ordinary, scoped, existing, and invalid declarative shadow templates', async () => {
    if (!customElements.get('gluon-existing-shadow-fixture')) {
      customElements.define('gluon-existing-shadow-fixture', class extends HTMLElement {
        constructor() {
          super();
          this.attachShadow({ mode: 'open' });
        }
      });
    }
    const dsdResponse: SsrRequestResult = {
      ...response,
      html: `
        <section id="ordinary"><template shadowrootmode="open"><p>Ordinary</p></template></section>
        <section id="scoped"><template shadowrootmode="open" shadowrootcustomelementregistry><p>Scoped</p></template></section>
        <gluon-existing-shadow-fixture><template shadowrootmode="open"><p>Existing</p></template></gluon-existing-shadow-fixture>
        <section id="invalid"><template shadowrootmode="invalid"><p>Invalid</p></template></section>
      `,
    };
    const fixture = await hydrateSsrFixture(
      await renderSsrFixture(async () => dsdResponse),
      { hydrate: async () => undefined },
    );
    expect(fixture.get<HTMLElement>('#ordinary').shadowRoot?.textContent).toContain('Ordinary');
    expect(fixture.get<HTMLElement>('#scoped').shadowRoot?.textContent).toContain('Scoped');
    expect(fixture.get<HTMLElement>('gluon-existing-shadow-fixture').shadowRoot?.textContent)
      .toContain('Existing');
    expect(fixture.get('#invalid').querySelector('template')).not.toBeNull();
  });

  it('cleans multiple fixtures in reverse order and aggregates disposal failures', async () => {
    const order: string[] = [];
    const first = await hydrateSsrFixture(await renderSsrFixture(async () => response, { name: 'first' }), {
      hydrate: async () => 'first',
      dispose: () => { order.push('first'); },
    });
    await hydrateSsrFixture(await renderSsrFixture(async () => response, { name: 'second' }), {
      hydrate: async () => 'second',
      dispose: () => { order.push('second'); throw new Error('second disposal'); },
    });

    await expect(cleanupSsrFixtures()).rejects.toThrow('second disposal');
    expect(order).toEqual(['second', 'first']);
    expect(first.active).toBe(false);
    expect(activeSsrFixtureNames()).toEqual([]);
  });
});
