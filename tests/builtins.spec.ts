import { describe, expect, it, vi } from 'vitest';
import {
  AsyncTimeoutError,
  GluonElement,
  KeepAlive,
  Suspense,
  Teleport,
  Transition,
  TransitionGroup,
  createApp,
  createInjectionKey,
  defineAsyncComponent,
  defineElement,
  html,
  getBuiltinServerContract,
  inject,
  isTemplateResult,
  render,
  unmount,
  type Key,
} from '../src/index.js';
import { nextTick, reactive } from '@gluonjs/reactivity';
import {
  RouterView,
  createMemoryHistory,
  createRouter,
  createRouterPlugin,
} from '@gluonjs/router';

describe('async UI built-ins', () => {
  it('renders explicit loading, resolved, nested, and aborted states deterministically', async () => {
    const container = document.createElement('div');
    let resolveOuter!: (value: string) => void;
    let resolveInner!: (value: string) => void;
    const outer = new Promise<string>((resolve) => { resolveOuter = resolve; });
    const inner = new Promise<string>((resolve) => { resolveInner = resolve; });
    let aborted = false;
    const aborting = ({ signal }: { signal: AbortSignal }) => new Promise<string>(() => {
      signal.addEventListener('abort', () => { aborted = true; });
    });

    render(html`${Suspense({
      source: outer,
      fallback: html`<p>Outer loading</p>`,
      children: (value) => html`<section>${value}${Suspense({
        source: inner,
        fallback: html`<span>Inner loading</span>`,
        children: (nested) => html`<strong>${nested}</strong>`,
      })}</section>`,
    })}`, container);
    expect(container.textContent).toBe('Outer loading');
    resolveOuter('Outer ready');
    await settleAsync();
    expect(container.textContent).toBe('Outer readyInner loading');
    resolveInner('Inner ready');
    await settleAsync();
    expect(container.textContent).toBe('Outer readyInner ready');

    render(html`${Suspense({
      source: aborting,
      fallback: 'Waiting',
      children: (value) => value,
    })}`, container);
    unmount(container);
    expect(aborted).toBe(true);
  });

  it('supports synchronous failure, asynchronous retry, delay, and timeout error states', async () => {
    const container = document.createElement('div');
    let attempt = 0;
    const source = async () => {
      attempt += 1;
      if (attempt === 1) throw new Error('inventory unavailable');
      return 'Available';
    };
    render(html`${Suspense({
      source,
      fallback: html`<p>Checking</p>`,
      children: (value) => html`<p>${value}</p>`,
      error: (error, retry) => html`<button @click=${retry}>${(error as Error).message}</button>`,
    })}`, container);
    await settleAsync();
    expect(container.querySelector('button')?.textContent).toBe('inventory unavailable');
    container.querySelector('button')!.click();
    await settleAsync();
    expect(container.textContent).toBe('Available');

    render(html`${Suspense({
      source: () => new Promise(() => undefined),
      fallback: 'Delayed fallback',
      children: (value) => String(value),
      delay: 30,
      timeout: 5,
      error: (error) => html`<p>${error instanceof AsyncTimeoutError ? error.timeout : 'wrong'}</p>`,
    })}`, container);
    expect(container.textContent).toBe('');
    await new Promise((resolve) => setTimeout(resolve, 15));
    expect(container.textContent).toBe('5');
  });

  it('retains keyed logical work across parent renders and adopts current callbacks', async () => {
    const container = document.createElement('div');
    let resolve!: (value: string) => void;
    let calls = 0;
    let aborted = 0;
    const source = ({ signal }: { signal: AbortSignal }) => {
      calls += 1;
      signal.addEventListener('abort', () => { aborted += 1; });
      return new Promise<string>((done) => { resolve = done; });
    };
    let prefix = 'First';
    const view = () => html`${Suspense({
      source,
      sourceKey: 'inventory:orbit',
      fallback: `${prefix} fallback`,
      children: (value) => `${prefix} ${value}`,
    })}`;
    render(view(), container);
    prefix = 'Latest';
    render(view(), container);
    expect(calls).toBe(1);
    expect(aborted).toBe(0);
    resolve('ready');
    await settleAsync();
    expect(container.textContent).toBe('Latest ready');
    unmount(container);
    expect(aborted).toBe(0);
  });

  it('defines preloadable components for router and server render contracts', async () => {
    const loader = vi.fn(async () => ({
      default: ({ label }: Readonly<{ label: string }>) => html`<h1>${label}</h1>`,
    }));
    const AsyncPage = defineAsyncComponent({
      loader,
      loading: () => html`<p>Loading route</p>`,
      error: (error, retry) => html`<button @click=${retry}>${String(error)}</button>`,
      timeout: 100,
    });
    expect(AsyncPage.resolved).toBe(false);
    await Promise.all([AsyncPage.preload(), AsyncPage.preload()]);
    expect(loader).toHaveBeenCalledOnce();
    expect(AsyncPage.resolved).toBe(true);
    expect(isTemplateResult(AsyncPage({ label: 'Server ready' }))).toBe(true);

    const router = createRouter({
      history: createMemoryHistory(['/async']),
      routes: [{ path: '/async', component: () => AsyncPage({ label: 'Async route' }) }],
    });
    await router.isReady();
    const root = document.createElement('div');
    const app = createApp(() => html`<main>${RouterView()}</main>`);
    app.use(createRouterPlugin(router));
    app.mount(root);
    expect(root.textContent).toBe('Async route');
    app.unmount();

    AsyncPage.reset();
    expect(AsyncPage.resolved).toBe(false);
    const delayed = document.createElement('div');
    render(html`${AsyncPage({ label: 'Reloaded' })}`, delayed);
    expect(delayed.textContent).toBe('Loading route');
    await settleAsync();
    expect(delayed.textContent).toBe('Reloaded');

    let recoveryAttempt = 0;
    const RecoveringPage = defineAsyncComponent<Record<string, never>>({
      loader: async () => {
        recoveryAttempt += 1;
        if (recoveryAttempt === 1) throw new Error('component chunk failed');
        return () => html`<p>Recovered component</p>`;
      },
      loading: () => 'Loading component',
      error: (_error, retry) => html`<button @click=${retry}>Retry component</button>`,
    });
    const recoveryRoot = document.createElement('div');
    render(html`${RecoveringPage({})}`, recoveryRoot);
    await settleAsync();
    expect(recoveryRoot.querySelector('button')?.textContent).toBe('Retry component');
    recoveryRoot.querySelector('button')!.click();
    await settleAsync();
    expect(recoveryRoot.textContent).toBe('Recovered component');
  });

  it('rejects invalid timing and loader contracts', async () => {
    expect(() => Suspense({
      source: Promise.resolve('ok'),
      fallback: '',
      children: (value) => value,
      delay: -1,
    })).toThrow('finite non-negative');
    expect(() => defineAsyncComponent({
      loader: async () => (() => html``),
      loading: () => '',
      timeout: Number.POSITIVE_INFINITY,
    })).toThrow('finite non-negative');

    const invalid = defineAsyncComponent({
      loader: async () => ({ default: 'invalid' as never }),
      loading: () => 'Loading',
    });
    await expect(invalid.preload()).rejects.toThrow('functional component');

    type EmptyProps = Readonly<Record<string, never>>;
    let release!: (component: (props: EmptyProps) => ReturnType<typeof html>) => void;
    const resetWhilePending = defineAsyncComponent<Record<string, never>>({
      loader: () => new Promise<(props: EmptyProps) => ReturnType<typeof html>>((resolve) => {
        release = resolve;
      }),
      loading: () => 'Loading',
    });
    const pending = resetWhilePending.preload();
    resetWhilePending.reset();
    release(() => html`<p>Too late</p>`);
    await expect(pending).rejects.toThrow('reset before its loader completed');
  });

  it('exposes DOM-free server contracts for every built-in', async () => {
    const suspense = Suspense({
      source: Promise.resolve('server'),
      fallback: 'fallback',
      children: (value) => html`<p>${value}</p>`,
    });
    const suspenseContract = getBuiltinServerContract(suspense);
    expect(suspenseContract?.kind).toBe('suspense');
    if (suspenseContract?.kind === 'suspense') {
      expect(isTemplateResult(await suspenseContract.resolve())).toBe(true);
    }

    const failed = Suspense({
      source: Promise.reject(new Error('server failure')),
      fallback: 'server fallback',
      children: String,
    });
    const failedContract = getBuiltinServerContract(failed);
    if (failedContract?.kind === 'suspense') {
      expect(await failedContract.resolve()).toBe('server fallback');
    }

    const values = [
      Teleport({ to: '#overlay', children: 'teleported' }),
      KeepAlive({ cacheKey: 'route', children: 'cached' }),
      Transition({ children: 'transitioned' }),
      TransitionGroup({ items: ['a'], key: String, children: String }),
    ];
    expect(values.map((value) => getBuiltinServerContract(value)?.kind)).toEqual([
      'teleport',
      'keep-alive',
      'transition',
      'transition-group',
    ]);
    expect(getBuiltinServerContract('ordinary')).toBeUndefined();
  });
});

describe('Teleport and KeepAlive', () => {
  it('retains application context in a teleport and cleans the target on unmount', () => {
    const target = document.createElement('aside');
    target.id = 'overlay-root';
    document.body.append(target);
    const key = createInjectionKey<string>('teleport-value');
    let observed = '';
    const app = createApp(() => html`${Teleport({
      to: '#overlay-root',
      children: html`<button @click=${() => { observed = inject(key); }}>Read context</button>`,
    })}`);
    app.provide(key, 'owned');
    const root = document.createElement('div');
    document.body.append(root);
    app.mount(root);
    target.querySelector('button')!.click();
    expect(observed).toBe('owned');
    expect(root.textContent).toBe('');
    expect(target.querySelector('gluon-teleport')).not.toBeNull();
    app.unmount();
    expect(target.children).toHaveLength(0);
    target.remove();
    root.remove();
  });

  it('moves and disables teleports and reports missing targets', () => {
    const root = document.createElement('div');
    const first = document.createElement('div');
    const second = document.createElement('div');
    document.body.append(first, second);
    render(html`${Teleport({ to: first, children: html`<p>Moved</p>` })}`, root);
    expect(first.textContent).toBe('Moved');
    render(html`${Teleport({ to: second, children: html`<p>Moved again</p>` })}`, root);
    expect(first.textContent).toBe('');
    expect(second.textContent).toBe('Moved again');
    render(html`${Teleport({ to: second, disabled: true, children: html`<p>Local</p>` })}`, root);
    expect(root.textContent).toBe('Local');
    expect(second.textContent).toBe('');
    expect(() => render(html`${Teleport({ to: '#absent', children: 'No target' })}`, root))
      .toThrow('was not found');
    unmount(root);
    first.remove();
    second.remove();
  });

  it('preserves cached component state and releases least-recently-used entries', async () => {
    class StatefulElement extends GluonElement {
      protected override render() {
        return html`<input value="initial">`;
      }
    }
    if (!customElements.get('gluon-keep-alive-fixture')) {
      defineElement('gluon-keep-alive-fixture', StatefulElement);
    }
    const state = reactive({ key: 'one', max: 2 });
    const activated: Key[] = [];
    const deactivated: Key[] = [];
    const evicted: Key[] = [];
    const root = document.createElement('div');
    document.body.append(root);
    const app = createApp(() => html`${KeepAlive({
      cacheKey: state.key,
      max: state.max,
      children: html`<gluon-keep-alive-fixture></gluon-keep-alive-fixture>`,
      onActivated: (key) => activated.push(key),
      onDeactivated: (key) => deactivated.push(key),
      onEvicted: (key) => evicted.push(key),
    })}`);
    app.mount(root);
    await nextTick();
    const first = root.querySelector('gluon-keep-alive-fixture')!;
    const firstInput = first.shadowRoot!.querySelector('input')!;
    firstInput.value = 'retained';

    state.key = 'two';
    await nextTick();
    const second = root.querySelector('gluon-keep-alive-fixture')!;
    expect(second).not.toBe(first);
    state.key = 'one';
    await nextTick();
    expect(root.querySelector('gluon-keep-alive-fixture')).toBe(first);
    expect(root.querySelector('input')?.value ?? first.shadowRoot!.querySelector('input')!.value).toBe('retained');
    expect(activated).toEqual(['one', 'two', 'one']);
    expect(deactivated).toEqual(['one', 'two']);

    state.max = 1;
    state.key = 'three';
    await nextTick();
    expect(evicted).toContain('one');
    expect(evicted).toContain('two');
    app.unmount();
    expect(evicted).toContain('three');
    root.remove();
    expect(() => KeepAlive({ cacheKey: 'bad', max: 0, children: '' })).not.toThrow();
    expect(() => render(html`${KeepAlive({ cacheKey: 'bad', max: 0, children: '' })}`, root))
      .toThrow('positive integer');
  });
});

describe('Transition and TransitionGroup', () => {
  it('cancels replaced animations and applies the latest transition content', async () => {
    const root = document.createElement('div');
    const cancel = vi.spyOn(Animation.prototype, 'cancel');
    let value = 'One';
    const view = () => html`${Transition({
      children: html`<p>${value}</p>`,
      duration: 2,
    })}`;
    render(view(), root);
    value = 'Two';
    render(view(), root);
    value = 'Three';
    render(view(), root);
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(root.textContent).toBe('Three');
    expect(cancel).toHaveBeenCalled();
    cancel.mockRestore();
    unmount(root);
  });

  it('bypasses animations for reduced motion and validates durations', () => {
    const root = document.createElement('div');
    const animate = vi.spyOn(Element.prototype, 'animate');
    render(html`${Transition({
      children: html`<p>Still</p>`,
      reducedMotion: true,
    })}`, root);
    expect(root.textContent).toBe('Still');
    expect(animate).not.toHaveBeenCalled();
    expect(() => render(html`${Transition({ children: '', duration: -1 })}`, root))
      .toThrow('finite non-negative');
    animate.mockRestore();
  });

  it('retains keyed identity through reorder and removes entries with reduced motion', () => {
    const root = document.createElement('div');
    const view = (items: readonly number[]) => html`${TransitionGroup({
      items,
      key: (item) => item,
      reducedMotion: true,
      children: (item) => html`<p data-key=${String(item)}>${item}</p>`,
    })}`;
    render(view([1, 2]), root);
    const first = root.querySelector('[data-key="1"]');
    render(view([2, 1]), root);
    expect(root.querySelector('[data-key="1"]')).toBe(first);
    expect([...root.querySelectorAll('p')].map((node) => node.textContent)).toEqual(['2', '1']);
    render(view([2]), root);
    expect(root.querySelector('[data-key="1"]')).toBeNull();
    expect(() => TransitionGroup({ items: [1, 1], key: (item) => item, children: String }))
      .toThrow('unique');
  });

  it('animates group insertion, movement, and leaving snapshots', async () => {
    const root = document.createElement('div');
    document.body.append(root);
    const view = (items: readonly string[]) => html`${TransitionGroup({
      items,
      key: (item) => item,
      duration: 2,
      children: (item) => html`<div data-item=${item}>${item}</div>`,
    })}`;
    render(view(['a', 'b']), root);
    render(view(['b', 'c']), root);
    expect(root.textContent).toBe('bc');
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(document.body.textContent).not.toContain('a');
    unmount(root);
    root.remove();
  });
});

async function settleAsync(): Promise<void> {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}
