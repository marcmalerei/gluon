import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  GluonElement,
  compose,
  defineElement,
  defineGluonElement,
  html,
  render,
  type TemplateValue,
} from '../src/index.js';
import { nextTick, ref } from '@gluonjs/reactivity';
import {
  GLUON_DEVTOOLS_GLOBAL,
  createDevtoolsArtifactContract,
  createDevtoolsBridge,
  gluonDevtoolsPlugin,
  mountGluonDevtools,
} from '../packages/devtools/src/index.js';

const cleanups: Array<() => void> = [];
afterEach(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); });

describe('Gluon Devtools browser bridge', () => {
  test('observes the same component tree for direct and composed functional output', async () => {
    class ComposeLeaf extends GluonElement {
      protected override render() { return html`<span>Leaf</span>`; }
    }
    if (!customElements.get('devtools-compose-leaf')) defineElement('devtools-compose-leaf', ComposeLeaf);
    const Panel = (props: { readonly children: TemplateValue }) => html`<section>${props.children}</section>`;
    const direct = document.createElement('div');
    const composed = document.createElement('div');
    document.body.append(direct, composed);
    cleanups.push(() => { direct.remove(); composed.remove(); });
    render(html`${Panel({ children: html`<devtools-compose-leaf></devtools-compose-leaf>` })}`, direct);
    render(html`${compose(Panel, {})`<devtools-compose-leaf></devtools-compose-leaf>`}`, composed);
    await nextTick();
    const bridge = createDevtoolsBridge({ enabled: true });
    cleanups.push(() => bridge.dispose());
    bridge.registerApplication({ id: 'direct', app: { mounted: true }, root: direct });
    bridge.registerApplication({ id: 'composed', app: { mounted: true }, root: composed });
    const trees = bridge.snapshot().applications.map((application) => application.components.map((component) => component.name));
    expect(trees).toEqual([['devtools-compose-leaf'], ['devtools-compose-leaf']]);
  });

  test('is inert by default and never exposes a production global', () => {
    const globalObject: Record<string, unknown> = {};
    const bridge = createDevtoolsBridge({ exposeGlobal: true, globalObject });
    expect(bridge.enabled).toBe(false);
    expect(globalObject).not.toHaveProperty(GLUON_DEVTOOLS_GLOBAL);
    expect(bridge.registerApplication({ id: 'off', app: { mounted: true }, root: document.body })).toBeTypeOf('function');
    expect(bridge.recordScheduler('off', {})).toBeUndefined();
    expect(() => mountGluonDevtools(bridge)).toThrow('GLUON_DEVTOOLS_DISABLED');
    bridge.dispose();
  });

  test('keeps applications independent and orders Router, Store, scheduler, event, and error records', () => {
    const globalObject: Record<string, unknown> = {};
    const bridge = createDevtoolsBridge({ enabled: true, exposeGlobal: true, globalObject });
    cleanups.push(() => bridge.dispose());
    const first = document.createElement('main');
    const second = document.createElement('main');
    document.body.append(first, second);
    cleanups.push(() => { first.remove(); second.remove(); });
    let routerHook: ((to: any, from: any, failure?: unknown) => void) | undefined;
    let storeHook: ((transaction: unknown) => void) | undefined;
    const removeRouter = vi.fn();
    const removeStore = vi.fn();
    const unregisterFirst = bridge.registerApplication({
      id: 'first', app: { mounted: true }, root: first,
      router: { currentRoute: { value: { fullPath: '/first' } }, afterEach(hook) { routerHook = hook; return removeRouter; } },
      store: { subscribe(hook) { storeHook = hook; return removeStore; }, dehydrate: () => ({ count: 1 }) },
      context: () => ({ locale: 'en' }),
    });
    bridge.registerApplication({ id: 'second', app: { mounted: false }, root: second, state: () => ({ ready: true }) });
    routerHook?.({ fullPath: '/next', sourceLocation: { kind: 'router', file: '/private/routes/catalog.ts', line: 7 } }, { fullPath: '/first' });
    routerHook?.({ path: '/failed' }, { path: '/next' }, { message: 'blocked', location: { kind: 'error', file: '/private/router/failure.ts' } });
    storeHook?.({ id: 1, type: 'action', sourceLocation: { kind: 'store', file: '/private/store/bag.ts', line: 19, column: 4 }, nested: { location: { file: '/private/store/nested.ts' } } });
    bridge.recordScheduler('first', { phase: 'pre' });
    bridge.recordEvent('first', { name: 'save' });
    bridge.recordError('first', { error: { message: 'broken', location: { kind: 'error', file: '/private/errors/nested.ts' } }, sourceLocation: { kind: 'error', file: '/private/errors/handler.ts', line: 4 } });
    bridge.selectApplication('second');
    const snapshot = bridge.snapshot();
    expect(globalObject[GLUON_DEVTOOLS_GLOBAL]).toBe(bridge);
    expect(snapshot.applications).toEqual([
      expect.objectContaining({ id: 'first', selected: false, route: '/first', state: { count: 1 }, context: { locale: 'en' } }),
      expect.objectContaining({ id: 'second', selected: true, mounted: false, state: { ready: true } }),
    ]);
    expect(snapshot.timeline.map((entry) => entry.kind)).toEqual([
      'application', 'application', 'router', 'router', 'store', 'scheduler', 'event', 'error', 'application',
    ]);
    expect(snapshot.timeline.filter((entry) => entry.kind === 'router')[0]?.payload).toMatchObject({
      sourceLocation: { file: 'catalog.ts', line: 7, redacted: true },
    });
    expect(snapshot.timeline.filter((entry) => entry.kind === 'store')[0]?.payload).toMatchObject({
      sourceLocation: { file: 'bag.ts', line: 19, column: 4, redacted: true },
    });
    expect(snapshot.timeline.filter((entry) => entry.kind === 'error')[0]?.payload).toMatchObject({
      sourceLocation: { file: 'handler.ts', line: 4, redacted: true },
    });
    expect(JSON.stringify(snapshot)).not.toContain('/private/');
    storeHook?.(null);
    bridge.recordError('first', 'plain error');
    unregisterFirst();
    unregisterFirst();
    expect(removeRouter).toHaveBeenCalledOnce();
    expect(removeStore).toHaveBeenCalledOnce();
    bridge.dispose();
    expect(globalObject).not.toHaveProperty(GLUON_DEVTOOLS_GLOBAL);
  });

  test('captures component render causes and exposes component/style snapshots', async () => {
    const signal = ref(0);
    class DebugCounter extends GluonElement {
      static override readonly properties = { count: Number };
      static readonly sourceLocation = {
        kind: 'component' as const,
        file: '/private/worktrees/gluon/examples/shop/src/product-configurator.ts',
        line: 42,
        column: 7,
      };
      declare count: number;
      protected override render() { return html`<button>${this.count}:${signal.value}</button>`; }
    }
    if (!customElements.get('devtools-debug-counter')) defineElement('devtools-debug-counter', DebugCounter);
    const bridge = createDevtoolsBridge({ enabled: true });
    cleanups.push(() => bridge.dispose());
    const root = document.createElement('div');
    document.body.append(root);
    cleanups.push(() => root.remove());
    bridge.registerApplication({ id: 'render-app', app: { mounted: true }, root });
    const element = document.createElement('devtools-debug-counter') as DebugCounter;
    element.count = 1;
    root.append(element);
    await nextTick();
    element.count = 2;
    await nextTick();
    signal.value = 1;
    await nextTick();
    const FunctionalCounter = defineGluonElement({
      tagName: 'devtools-functional-counter',
      properties: { count: { type: Number, default: 0 } },
      setup: (context) => ({ render: () => html`<output>${context.props.count}</output>` }),
    });
    const functional = document.createElement('devtools-functional-counter') as InstanceType<typeof FunctionalCounter>;
    functional.count = 3;
    root.append(functional);
    await nextTick();
    const snapshot = bridge.snapshot();
    expect(snapshot.applications[0]?.components[0]).toMatchObject({
      name: 'devtools-debug-counter', properties: { count: 2 }, stylesheets: 0,
      sourceLocation: { kind: 'component', file: 'product-configurator.ts', line: 42, column: 7, redacted: true },
    });
    expect(snapshot.applications[0]?.components.find(({ name }) => name === 'devtools-functional-counter')).toMatchObject({
      name: 'devtools-functional-counter', properties: { count: 3 }, stylesheets: 0,
    });
    const renders = snapshot.timeline.filter((entry) => entry.kind === 'render');
    expect(renders.length).toBeGreaterThanOrEqual(1);
    expect(renders.some((render) => (render.payload as any).component === 'devtools-functional-counter')).toBe(true);
    const debugRenders = renders.filter((render) => (render.payload as any).component === 'devtools-debug-counter');
    const causes = debugRenders.flatMap((render) => (render.payload as any).causes);
    expect(causes).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'property', name: 'count' }),
      expect.objectContaining({ type: 'reactive' }),
    ]));
    expect(debugRenders.some((render) => (render.payload as any).sourceLocation?.file === 'product-configurator.ts')).toBe(true);
  });

  test('mounts a selectable browser-hosted inspector with a constructed sheet', () => {
    const bridge = createDevtoolsBridge({ enabled: true });
    cleanups.push(() => bridge.dispose());
    const root = document.createElement('div');
    bridge.registerApplication({ id: 'one', name: 'One', app: { mounted: true }, root });
    bridge.registerApplication({ id: 'two', name: 'Two', app: { mounted: true }, root });
    const mounted = mountGluonDevtools(bridge);
    cleanups.push(() => mounted.unmount());
    expect(mounted.element.shadowRoot?.adoptedStyleSheets).toHaveLength(1);
    const buttons = mounted.element.shadowRoot!.querySelectorAll('button');
    expect([...buttons].map((button) => button.textContent)).toEqual(['One', 'Two']);
    (buttons[1] as HTMLButtonElement).click();
    expect(bridge.snapshot().selectedApplicationId).toBe('two');
  });

  test('delegates redacted component, render, Router, Store, and error navigation to the application', async () => {
    class SourceTarget extends GluonElement {
      static readonly sourceLocation = { kind: 'component' as const, file: '/private/components/source-target.ts', line: 8 };
      protected override render() { return html`<p>Target</p>`; }
    }
    if (!customElements.get('devtools-source-target')) defineElement('devtools-source-target', SourceTarget);
    const bridge = createDevtoolsBridge({ enabled: true });
    cleanups.push(() => bridge.dispose());
    const root = document.createElement('div');
    document.body.append(root);
    cleanups.push(() => root.remove());
    let routerHook: ((to: any, from: any, failure?: unknown) => void) | undefined;
    let storeHook: ((transaction: unknown) => void) | undefined;
    bridge.registerApplication({
      id: 'sources', app: { mounted: true }, root,
      router: { currentRoute: { value: { path: '/' } }, afterEach(hook) { routerHook = hook; return () => undefined; } },
      store: { subscribe(hook) { storeHook = hook; return () => undefined; }, dehydrate: () => ({}) },
    });
    root.append(document.createElement('devtools-source-target'));
    await nextTick();
    routerHook?.({ path: '/next', sourceLocation: { kind: 'error', file: '/private/routes/source.ts', line: 2 } }, { path: '/' });
    storeHook?.({ action: 'save', location: { kind: 'error', file: '/private/stores/source.ts', line: 3 } });
    bridge.recordError('sources', { message: 'broken', location: { kind: 'store', file: '/private/errors/source.ts', line: 4 } });
    const navigateToSource = vi.fn();
    const mounted = mountGluonDevtools(bridge, document.body, { navigateToSource });
    cleanups.push(() => mounted.unmount());
    const sourceButtons = [...mounted.element.shadowRoot!.querySelectorAll<HTMLButtonElement>('button[data-source-kind]')];
    expect(new Set(sourceButtons.map((button) => button.dataset.sourceKind))).toEqual(new Set(['component', 'render', 'router', 'store', 'error']));
    for (const button of sourceButtons) button.click();
    expect(navigateToSource).toHaveBeenCalled();
    for (const [location] of navigateToSource.mock.calls) {
      expect(location.file).not.toContain('/');
      expect(location.redacted).toBe(true);
      expect(Object.isFrozen(location)).toBe(true);
    }
    expect(mounted.element.shadowRoot!.textContent).not.toContain('/private/');
    const labelsOnly = mountGluonDevtools(bridge);
    cleanups.push(() => labelsOnly.unmount());
    expect(labelsOnly.element.shadowRoot!.querySelectorAll('button[data-source-kind]')).toHaveLength(0);
    expect(labelsOnly.element.shadowRoot!.querySelector('.sources code')?.textContent).toContain('source-target.ts');
  });

  test('exposes the protocol handshake through the browser bridge', () => {
    const bridge = createDevtoolsBridge({ enabled: true });
    cleanups.push(() => bridge.dispose());
    expect(bridge.handshake()).toMatchObject({ protocol: 1, capabilities: expect.arrayContaining(['timeline', 'component-snapshots']) });
  });

  test('renders an initially empty inspector and exposes development-only Vite configuration', () => {
    const bridge = createDevtoolsBridge({ enabled: true });
    cleanups.push(() => bridge.dispose());
    const target = document.createElement('div');
    const mounted = mountGluonDevtools(bridge, target);
    expect(mounted.element.shadowRoot?.querySelectorAll('section')).toHaveLength(0);
    mounted.unmount();

    const plugin = gluonDevtoolsPlugin({ virtualId: 'virtual:custom-devtools' }) as any;
    plugin.config({}, { command: 'build' });
    expect(plugin.resolveId('other')).toBeNull();
    const id = plugin.resolveId('virtual:custom-devtools');
    expect(plugin.load('other')).toBeNull();
    expect(plugin.load(id)).toContain('enabled: false');
    expect(plugin.load(id)).toContain('devtoolsArtifactContract');
    expect(createDevtoolsArtifactContract('virtual:custom-devtools')).toMatchObject({
      format: 'esm-package', manifest: './browser-inspector.manifest.json', virtualId: 'virtual:custom-devtools',
    });
    plugin.config({}, { command: 'serve' });
    expect(plugin.load(id)).toContain('enabled: true');
  });
});
