import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GluonElement,
  compose,
  createInjectionKey,
  defineElement,
  html,
  inject,
  type GluonPlugin,
} from '@gluonjs/core';
import { RouterLink, RouterView } from '@gluonjs/router';
import { defineStore } from '@gluonjs/store';
import {
  activeFixtureNames,
  assertNoFixtureLeaks,
  cleanupFixtures,
  createRouterFixture,
  createStoreFixture,
  flushUpdates,
  installAutoCleanup,
  mountComponent,
  mountElement,
  renderFixture,
  settle,
  testPlugin,
  testProvider,
} from '../packages/test-utils/src/index.js';

afterEach(async () => {
  await cleanupFixtures();
  document.body.replaceChildren();
});

describe('@gluonjs/test-utils component fixtures', () => {
  it('mounts a composed template body through the same public component fixture', () => {
    const Panel = (props: Readonly<{ title: string; children: import('@gluonjs/core').TemplateValue }>) => html`
      <section><h2>${props.title}</h2>${props.children}</section>
    `;
    const fixture = renderFixture(() => html`${compose(Panel, { title: 'Checkout' })`<p>Delivery</p>`}`);
    expect(fixture.get('h2').textContent).toBe('Checkout');
    expect(fixture.get('p').textContent).toBe('Delivery');
  });

  it('mounts typed functional props and updates through the public scheduler', async () => {
    const onSave = vi.fn();
    const fixture = mountComponent(
      ({ label, count, save }: Readonly<{
        label: string;
        count: number;
        save: (count: number) => void;
      }>) => html`
        <button @click=${() => save(count)}>${label} ${count}</button>
      `,
      { props: { label: 'Count', count: 1, save: onSave }, name: 'counter' },
    );
    expect(fixture.text().trim()).toBe('Count 1');
    fixture.get<HTMLButtonElement>('button').click();
    expect(onSave).toHaveBeenCalledWith(1);
    await fixture.setProps({ count: 2 });
    expect(fixture.get<HTMLButtonElement>('button').textContent).toBe('Count 2');
    expect(fixture.query('.missing')).toBeNull();
    expect(() => fixture.get('.missing')).toThrow('did not contain selector');
    fixture.cleanup();
    expect(fixture.active).toBe(false);
    expect(fixture.container.isConnected).toBe(false);
    fixture.cleanup();
  });

  it('installs providers, optioned plugins, setup hooks, and plugin cleanup', () => {
    const messageKey = createInjectionKey<string>('message');
    const cleanup = vi.fn();
    const plugin: GluonPlugin<{ prefix: string }> = {
      install(app, options) {
        app.provide(messageKey, `${options.prefix} plugin`);
        return cleanup;
      },
    };
    const setup = vi.fn();
    const fixture = mountComponent(
      () => html`<p>${inject(messageKey)}</p>`,
      {
        props: {},
        providers: [testProvider(messageKey, 'provider')],
        plugins: [testPlugin(plugin, { prefix: 'from' })],
        setup,
      },
    );
    expect(fixture.text()).toBe('from plugin');
    expect(setup).toHaveBeenCalledOnce();
    fixture.cleanup();
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('renders raw template fixtures into supplied containers', () => {
    const container = document.createElement('section');
    document.body.append(container);
    const fixture = renderFixture(() => html`<h1>Template fixture</h1>`, { container });
    expect(fixture.container).toBe(container);
    expect(fixture.get('h1').textContent).toBe('Template fixture');
    fixture.cleanup();
    expect(container.isConnected).toBe(true);
    expect(container.childNodes).toHaveLength(0);
  });
});

describe('@gluonjs/test-utils Custom Element fixtures', () => {
  it('supports properties, attributes, slots, events, and listener cleanup', async () => {
    class TestPanel extends GluonElement {
      declare title: string;
      static override readonly properties = { title: String };

      protected override render() {
        return html`
          <h2>${this.title}</h2>
          <slot name="summary"></slot>
          <slot></slot>
          <button @click=${() => this.dispatchEvent(new CustomEvent('confirm', {
            detail: { title: this.title },
          }))}>Confirm</button>
        `;
      }
    }
    if (!customElements.get('gluon-test-panel')) defineElement('gluon-test-panel', TestPanel);
    const onConfirm = vi.fn();
    const summary = document.createElement('strong');
    summary.textContent = 'Summary';
    const fixture = mountElement<TestPanel>('gluon-test-panel', {
      properties: { title: 'Review' },
      attributes: { 'data-state': 'ready', 'aria-busy': true, hidden: false, inert: null },
      slots: {
        summary,
        note: 'Named text',
        default: ['Body ', document.createElement('em')],
      },
      events: { confirm: onConfirm },
    });
    await flushUpdates();
    expect(fixture.element.shadowRoot?.querySelector('h2')?.textContent).toBe('Review');
    expect(fixture.element.getAttribute('data-state')).toBe('ready');
    expect(summary.slot).toBe('summary');
    expect(fixture.element.querySelector('[slot="note"]')?.textContent).toBe('Named text');
    fixture.element.shadowRoot!.querySelector<HTMLButtonElement>('button')!.click();
    expect(fixture.emitted('confirm')).toHaveLength(1);
    expect(fixture.emitted()).toHaveLength(1);
    expect(onConfirm).toHaveBeenCalledOnce();
    const retained = fixture.element;
    fixture.cleanup();
    retained.dispatchEvent(new CustomEvent('confirm'));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(() => fixture.own(() => undefined, 'late')).toThrow('cleaned fixture');
  });

  it('rejects native tags and cleans a failed mount container', () => {
    expect(() => mountElement('button')).toThrow('must contain a hyphen');
    const empty = mountElement('gluon-unknown-fixture');
    expect(empty.element.localName).toBe('gluon-unknown-fixture');
    empty.cleanup();
    const container = document.createElement('div');
    const owner = renderFixture(() => html`<p>Owner</p>`, { container, name: 'owner' });
    expect(() => renderFixture(() => html`<p>Conflict</p>`, { container, name: 'conflict' }))
      .toThrow('already owns');
    expect(activeFixtureNames()).toEqual(['owner']);
    owner.cleanup();

    const rawApp = document.createElement('div');
    const externalOwner = renderFixture(() => html`<p>External owner</p>`, { container: rawApp });
    rawApp.removeAttribute('data-gluon-test-fixture');
    expect(() => renderFixture(() => html`<p>Conflict</p>`, { container: rawApp }))
      .toThrow('already owns');
    expect(rawApp.hasAttribute('data-gluon-test-fixture')).toBe(false);
    externalOwner.cleanup();
  });
});

describe('@gluonjs/test-utils ownership and automatic cleanup', () => {
  it('reports active fixture ownership and clears names after cleanup', () => {
    const first = renderFixture(() => html`<p>One</p>`, { name: 'first fixture' });
    renderFixture(() => html`<p>Two</p>`, { name: 'second fixture' });
    expect(activeFixtureNames()).toEqual(['first fixture', 'second fixture']);
    expect(() => assertNoFixtureLeaks()).toThrow('first fixture, second fixture');
    first.cleanup();
    expect(activeFixtureNames()).toEqual(['second fixture']);
  });

  it('installs ordinary auto cleanup and optional pre-cleanup leak detection', async () => {
    let hook!: () => void | Promise<void>;
    installAutoCleanup((callback) => { hook = callback; });
    renderFixture(() => html`<p>Auto</p>`);
    await hook();
    assertNoFixtureLeaks();

    installAutoCleanup((callback) => { hook = callback; }, { assertBeforeCleanup: true });
    renderFixture(() => html`<p>Leaked</p>`, { name: 'detected leak' });
    await expect(hook()).rejects.toThrow('detected leak');
    assertNoFixtureLeaks();
  });

  it('aggregates synchronous and asynchronous owned cleanup failures', async () => {
    const syncFixture = renderFixture(() => html`<p>Sync</p>`);
    syncFixture.own(() => { throw new Error('listener cleanup failed'); }, 'listener');
    expect(() => syncFixture.cleanup()).toThrow('listener: listener cleanup failed');

    const asyncThroughSync = renderFixture(() => html`<p>Async through sync</p>`);
    asyncThroughSync.own(async () => undefined, 'async listener');
    expect(() => asyncThroughSync.cleanup()).toThrow('requires cleanupFixtures');

    const asyncFixture = renderFixture(() => html`<p>Async</p>`);
    asyncFixture.own(async () => { throw new Error('effect cleanup failed'); }, 'effect');
    await expect(cleanupFixtures()).rejects.toThrow('effect: effect cleanup failed');
  });

  it('reports application cleanup and residual DOM failures for both cleanup paths', async () => {
    const direct = renderFixture(() => html`<p>Direct</p>`, { name: 'direct cleanup' });
    const directUnmount = direct.app.unmount.bind(direct.app);
    direct.app.unmount = () => {
      directUnmount();
      direct.container.append(document.createElement('span'));
      throw 'direct stop failed';
    };
    expect(() => direct.cleanup()).toThrow('application: direct stop failed');

    const aggregate = renderFixture(() => html`<p>Aggregate</p>`, { name: 'aggregate cleanup' });
    const aggregateUnmount = aggregate.app.unmount.bind(aggregate.app);
    aggregate.app.unmount = () => {
      aggregateUnmount();
      aggregate.container.append(document.createElement('span'));
      throw new Error('aggregate stop failed');
    };
    await expect(cleanupFixtures()).rejects.toThrow('aggregate cleanup application: aggregate stop failed');
  });
});

describe('@gluonjs/test-utils Router, Store, and scheduler fixtures', () => {
  it('creates isolated routers and mounts RouterLink and RouterView publicly', async () => {
    const first = createRouterFixture({
      initial: '/one',
      routes: [
        { path: '/one', component: () => html`<h1>One</h1>` },
        { path: '/two', component: () => html`<h1>Two</h1>` },
      ],
    });
    const second = createRouterFixture({
      initial: ['/two'],
      routes: [
        { path: '/one', component: () => html`<h1>One</h1>` },
        { path: '/two', component: () => html`<h1>Two</h1>` },
      ],
    });
    const defaultInitial = createRouterFixture({ routes: [{ path: '/', component: () => html`Default` }] });
    await Promise.all([first.ready, second.ready, defaultInitial.ready]);
    expect(defaultInitial.router.currentRoute.value.path).toBe('/');
    const fixture = renderFixture(() => html`
      ${RouterLink({ to: '/two', children: 'Next' })}
      ${RouterView()}
    `, { plugins: [first.plugin] });
    expect(fixture.text()).toContain('One');
    fixture.get<HTMLAnchorElement>('a').click();
    await settle({ cycles: 2 });
    expect(fixture.text()).toContain('Two');
    expect(first.router.currentRoute.value.path).toBe('/two');
    expect(second.router.currentRoute.value.path).toBe('/two');
    await first.router.push('/one');
    expect(second.router.currentRoute.value.path).toBe('/two');
  });

  it('creates isolated Store managers with initial state and app-owned disposal', () => {
    const definition = defineStore({ id: 'test-counter', state: () => ({ count: 0 }) });
    const first = createStoreFixture({ initialState: { 'test-counter': { count: 4 } } });
    const second = createStoreFixture();
    expect(first.manager.use(definition).count).toBe(4);
    expect(second.manager.use(definition).count).toBe(0);
    const fixture = renderFixture(() => html`<p>Store owner</p>`, { plugins: [first.plugin] });
    fixture.cleanup();
    expect(() => first.manager.use(definition)).toThrow('disposed');
    expect(second.manager.use(definition).count).toBe(0);
    second.manager.dispose();
  });

  it('flushes callback results and configurable microtask/timer cycles', async () => {
    const calls: string[] = [];
    const result = await flushUpdates(() => {
      queueMicrotask(() => calls.push('microtask'));
      return 42;
    });
    expect(result).toBe(42);
    expect(calls).toEqual(['microtask']);
    await settle({ cycles: 2, timers: true });
    await expect(settle({ cycles: 0 })).rejects.toThrow('positive integer');
  });
});
