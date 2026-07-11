import { afterEach, describe, expect, test, vi } from 'vitest';
import { GluonElement, defineElement, html } from '../src/index.js';
import { nextTick, ref } from '@gluonjs/reactivity';
import {
  GLUON_DEVTOOLS_GLOBAL,
  createDevtoolsBridge,
  gluonDevtoolsPlugin,
  mountGluonDevtools,
} from '../packages/devtools/src/index.js';

const cleanups: Array<() => void> = [];
afterEach(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); });

describe('Gluon Devtools browser bridge', () => {
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
    routerHook?.({ fullPath: '/next' }, { fullPath: '/first' });
    routerHook?.({ path: '/failed' }, { path: '/next' }, new Error('blocked'));
    storeHook?.({ id: 1, type: 'action' });
    bridge.recordScheduler('first', { phase: 'pre' });
    bridge.recordEvent('first', { name: 'save' });
    bridge.recordError('first', new Error('broken'));
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
    const snapshot = bridge.snapshot();
    expect(snapshot.applications[0]?.components[0]).toMatchObject({
      name: 'devtools-debug-counter', properties: { count: 2 }, stylesheets: 0,
    });
    const renders = snapshot.timeline.filter((entry) => entry.kind === 'render');
    expect(renders.length).toBeGreaterThanOrEqual(1);
    expect(renders.at(-1)?.payload).toMatchObject({ component: 'devtools-debug-counter' });
    const causes = renders.flatMap((render) => (render.payload as any).causes);
    expect(causes).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'property', name: 'count' }),
      expect.objectContaining({ type: 'reactive' }),
    ]));
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
    plugin.config({}, { command: 'serve' });
    expect(plugin.load(id)).toContain('enabled: true');
  });
});
