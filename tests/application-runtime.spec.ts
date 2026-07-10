import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GluonElement,
  createApp,
  createInjectionKey,
  defineElement,
  directive,
  dynamicComponent,
  getPublicInstance,
  html,
  inject,
  runWithErrorHandling,
  warn,
  type AppErrorInfo,
  type AppRootRenderContext,
  type AppWarningInfo,
  type ComponentErrorInfo,
  type GluonApp,
  type PropertyDeclarations,
} from '../src/index.js';
import {
  nextTick,
  effect,
  onScopeDispose,
  reactive,
  watchEffect,
} from '@gluonjs/reactivity';

describe('application runtime', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('isolates plugins, providers, component registries, stores, config, and errors', async () => {
    const storeKey = createInjectionKey<{ name: string }>('store');
    const themeKey = createInjectionKey<string>('theme');
    const warningsA: AppWarningInfo[] = [];
    const warningsB: AppWarningInfo[] = [];
    const errorsA: AppErrorInfo[] = [];
    const errorsB: AppErrorInfo[] = [];
    const cleanups: string[] = [];
    const stores = new Map<string, { name: string }>();

    const plugin = (
      app: GluonApp,
      options: { readonly name: string; readonly theme: string },
    ) => {
      const store = reactive({ name: options.name });
      stores.set(options.name, store);
      app.provide(storeKey, store);
      app.provide(themeKey, options.theme);
      app.component<{ label: string }>('message', ({ label }) => html`
        <p>${label}:${inject(themeKey)}</p>
      `);
      return () => {
        cleanups.push(options.name);
      };
    };

    class ContextFixture extends GluonElement {
      protected override render() {
        return html`<span>${inject(themeKey)}</span>`;
      }
    }
    defineElement('gluon-app-context-fixture', ContextFixture);

    const root = (context: AppRootRenderContext<unknown>) => {
      const store = inject(storeKey);
      return html`
        <section>${context.component('message', { label: store.name })}</section>
        <gluon-app-context-fixture></gluon-app-context-fixture>
      `;
    };
    const appA = createApp(root);
    const appB = createApp(root);
    appA.config.errorHandler = (info) => { errorsA.push(info); };
    appB.config.errorHandler = (info) => { errorsB.push(info); };
    appA.config.warnHandler = (info) => { warningsA.push(info); };
    appB.config.warnHandler = (info) => { warningsB.push(info); };
    appA.config.globalProperties.locale = 'de';
    appB.config.globalProperties.locale = 'en';
    appA.use(plugin, { name: 'alpha', theme: 'light' });
    appA.use(plugin, { name: 'ignored', theme: 'ignored' });
    appB.use(plugin, { name: 'beta', theme: 'dark' });

    const rootA = document.createElement('div');
    const rootB = document.createElement('div');
    document.body.append(rootA, rootB);
    appA.mount(rootA);
    appB.mount(rootB);
    const contextA = rootA.querySelector('gluon-app-context-fixture') as ContextFixture;
    const contextB = rootB.querySelector('gluon-app-context-fixture') as ContextFixture;
    await Promise.all([contextA.updateComplete, contextB.updateComplete]);

    expect(rootA.textContent?.trim()).toBe('alpha:light');
    expect(rootB.textContent?.trim()).toBe('beta:dark');
    expect(appA.config.globalProperties.locale).toBe('de');
    expect(appB.config.globalProperties.locale).toBe('en');
    expect(contextA.shadowRoot?.textContent).toBe('light');
    expect(contextB.shadowRoot?.textContent).toBe('dark');
    expect(warningsA).toEqual([expect.objectContaining({ code: 'GLUON_PLUGIN_DUPLICATE' })]);
    expect(warningsB).toEqual([]);

    stores.get('alpha')!.name = 'alpha-updated';
    await nextTick();
    expect(rootA.textContent?.trim()).toBe('alpha-updated:light');
    expect(rootB.textContent?.trim()).toBe('beta:dark');

    const result = appA.run(() => { throw new Error('alpha failed'); });
    expect(result).toBeUndefined();
    expect(errorsA).toEqual([expect.objectContaining({ source: 'async' })]);
    expect(errorsB).toEqual([]);

    appA.unmount();
    expect(cleanups).toEqual(['alpha']);
    expect(rootA.childNodes).toHaveLength(0);
    expect(rootB.textContent?.trim()).toBe('beta:dark');
    appB.unmount();
    expect(cleanups).toEqual(['alpha', 'beta']);
    await nextTick();
  });

  it('releases root effects, bindings, refs, hooks, and plugin resources on unmount', async () => {
    const state = reactive({ count: 0 });
    const click = vi.fn();
    const ref: { value?: Element } = {};
    const order: string[] = [];
    let renders = 0;
    let scopeOwned = false;
    const plugin = () => {
      order.push('plugin:install');
      return () => {
        order.push('plugin:cleanup');
      };
    };
    const app = createApp<{ increment(): void }>((context) => {
      renders += 1;
      if (!scopeOwned) {
        scopeOwned = true;
        onScopeDispose(() => order.push('scope:dispose'));
      }
      context.expose({ increment: () => { state.count += 1; } });
      return html`<button ...=${{ ref, onClick: click }}>${state.count}</button>`;
    });
    app.use(plugin);
    app.onMounted(() => { order.push('app:mounted'); });
    app.onUnmounted(() => { order.push('app:unmounted'); });
    const root = document.createElement('div');
    document.body.append(root);

    const mount = app.mount(root);
    const button = ref.value as HTMLButtonElement;
    expect(mount.exposed).toBeDefined();
    mount.exposed?.increment();
    await nextTick();
    expect(button.textContent).toBe('1');
    expect(renders).toBe(2);
    button.click();
    expect(click).toHaveBeenCalledOnce();

    state.count = 2;
    mount.unmount();
    await nextTick();
    expect(renders).toBe(2);
    expect(ref.value).toBeUndefined();
    expect(root.childNodes).toHaveLength(0);
    button.click();
    expect(click).toHaveBeenCalledOnce();
    expect(order).toEqual([
      'plugin:install',
      'app:mounted',
      'scope:dispose',
      'app:unmounted',
      'plugin:cleanup',
    ]);
    expect(() => app.mount(root)).toThrow(/only be mounted once/i);
    app.unmount();
  });

  it('orders component connection, update, disconnection, and public exposure', async () => {
    const order: string[] = [];

    class LifecycleFixture extends GluonElement {
      static override readonly properties: PropertyDeclarations = {
        count: { type: Number, default: 0 },
      };

      declare count: number;

      constructor() {
        super();
        this.onConnected(() => { order.push('connected'); });
        this.onBeforeUpdate(() => { order.push('before-update'); });
        this.onUpdated(() => { order.push('updated'); });
        this.onDisconnected(() => { order.push('disconnected'); });
        this.expose({ increment: () => { this.count += 1; } });
      }

      protected override render() {
        return html`<span>${this.count}</span>`;
      }
    }

    defineElement('gluon-app-lifecycle-fixture', LifecycleFixture);
    const app = createApp(html`<gluon-app-lifecycle-fixture></gluon-app-lifecycle-fixture>`);
    const root = document.createElement('div');
    document.body.append(root);
    app.mount(root);
    const element = root.querySelector('gluon-app-lifecycle-fixture') as LifecycleFixture;
    await element.updateComplete;
    expect(order).toEqual(['connected', 'updated']);

    const exposed = getPublicInstance<{ increment(): void }>(element);
    exposed?.increment();
    await element.updateComplete;
    expect(element.shadowRoot?.textContent).toBe('1');
    expect(order).toEqual(['connected', 'updated', 'before-update', 'updated']);

    element.remove();
    expect(order.at(-1)).toBe('disconnected');
    root.append(element);
    await element.updateComplete;
    expect(element.shadowRoot?.textContent).toBe('1');
    expect(order.slice(-2)).toEqual(['connected', 'updated']);

    app.unmount();
    expect(order.at(-1)).toBe('disconnected');
  });

  it('routes render, effect, event, async, and lifecycle errors through boundaries', async () => {
    const captured: ComponentErrorInfo[] = [];
    const applicationErrors: AppErrorInfo[] = [];

    class ErrorChildFixture extends GluonElement {
      static override readonly properties: PropertyDeclarations = {
        revision: { type: Number, default: 0 },
      };

      declare revision: number;
      readonly state = reactive({ renderFailure: false, effectFailure: false });
      lifecycleFailure = false;
      private watcherInstalled = false;

      constructor() {
        super();
        this.onUpdated(() => {
          if (this.lifecycleFailure) throw new Error('lifecycle failed');
        });
        this.onDisconnected(() => {
          this.watcherInstalled = false;
        });
      }

      protected override update(): void {
        if (!this.watcherInstalled) {
          this.watcherInstalled = true;
          watchEffect(() => {
            if (this.state.effectFailure) throw new Error('effect failed');
          });
        }
        super.update();
      }

      protected override render() {
        if (this.state.renderFailure) throw new Error('render failed');
        return html`
          <button id="event" @click=${() => { throw new Error('event failed'); }}>Event</button>
          <button id="async" @click=${async () => { throw new Error('async failed'); }}>Async</button>
          <span>${this.revision}</span>
        `;
      }
    }

    class ErrorBoundaryFixture extends GluonElement {
      constructor() {
        super();
        this.onErrorCaptured((info) => {
          captured.push(info);
          return true;
        });
      }

      protected override render() {
        return html`<gluon-app-error-child></gluon-app-error-child>`;
      }
    }

    defineElement('gluon-app-error-child', ErrorChildFixture);
    defineElement('gluon-app-error-boundary', ErrorBoundaryFixture);
    const app = createApp(html`<gluon-app-error-boundary></gluon-app-error-boundary>`);
    app.config.errorHandler = (info) => { applicationErrors.push(info); };
    const root = document.createElement('div');
    document.body.append(root);
    app.mount(root);
    const boundary = root.querySelector('gluon-app-error-boundary') as ErrorBoundaryFixture;
    await boundary.updateComplete;
    const child = boundary.shadowRoot?.querySelector('gluon-app-error-child') as ErrorChildFixture;
    await child.updateComplete;

    (child.shadowRoot?.querySelector('#event') as HTMLButtonElement).click();
    (child.shadowRoot?.querySelector('#async') as HTMLButtonElement).click();
    await Promise.resolve();
    await Promise.resolve();

    child.state.effectFailure = true;
    await nextTick();

    child.lifecycleFailure = true;
    child.revision += 1;
    await child.updateComplete;

    child.lifecycleFailure = false;
    child.state.renderFailure = true;
    await expect(child.updateComplete).rejects.toThrow('render failed');

    expect(captured.map((info) => info.source)).toEqual([
      'event',
      'async',
      'effect',
      'lifecycle',
      'render',
    ]);
    expect(applicationErrors).toEqual([]);

    await app.run(async () => { throw new Error('application async failed'); });
    expect(applicationErrors).toEqual([expect.objectContaining({ source: 'async' })]);
    app.unmount();
  });

  it('routes application warnings and supports injection fallbacks', () => {
    const missing = createInjectionKey<string>('missing');
    const warnings: AppWarningInfo[] = [];
    const app = createApp(() => html`
      <p>${inject(missing, 'fallback')}${dynamicComponent('missing', {})}</p>
    `);
    app.config.warnHandler = (info) => { warnings.push(info); };
    const root = document.createElement('div');
    document.body.append(root);
    app.mount(root);

    expect(root.textContent?.trim()).toBe('fallback');
    expect(warnings).toEqual([expect.objectContaining({ code: 'GLUON_COMPONENT_MISSING' })]);
    expect(() => app.provide(missing, 'late')).toThrow(/after the application has mounted/i);
    app.unmount();
  });

  it('accepts persistent ShadowRoots and rejects drainable DocumentFragments', async () => {
    let fragmentRenders = 0;
    const fragmentApp = createApp(() => {
      fragmentRenders += 1;
      return html`<p>fragment</p>`;
    });
    const fragment = document.createDocumentFragment();
    expect(() => fragmentApp.mount(fragment as never)).toThrow(/persistent Element or ShadowRoot/i);
    expect(fragmentApp.mounted).toBe(false);
    expect(fragmentRenders).toBe(0);
    expect(fragment.childNodes).toHaveLength(0);

    const valueKey = createInjectionKey<string>('shadow-value');
    class ShadowContextFixture extends GluonElement {
      protected override render() {
        return html`<span>${inject(valueKey)}</span>`;
      }
    }
    defineElement('gluon-shadow-context-fixture', ShadowContextFixture);
    const host = document.createElement('div');
    const shadowRoot = host.attachShadow({ mode: 'open' });
    document.body.append(host);
    const shadowApp = createApp(html`<gluon-shadow-context-fixture></gluon-shadow-context-fixture>`);
    shadowApp.provide(valueKey, 'owned');
    shadowApp.mount(shadowRoot);
    const fixture = shadowRoot.querySelector('gluon-shadow-context-fixture') as ShadowContextFixture;
    await fixture.updateComplete;
    expect(fixture.shadowRoot?.textContent).toBe('owned');
    shadowApp.unmount();
    expect(shadowRoot.childNodes).toHaveLength(0);
  });

  it('enforces application state and reports root and plugin failures', () => {
    const errors: AppErrorInfo[] = [];
    const missing = createInjectionKey<string>('required');
    const app = createApp(() => html`<p>${inject(missing)}</p>`);
    app.config.errorHandler = (info) => { errors.push(info); };

    expect(app.mounted).toBe(false);
    expect(() => app.unmount()).toThrow(/before it is mounted/i);
    expect(() => app.component('  ', () => html``)).toThrow(/cannot be empty/i);
    app.use({
      install() {
        throw new Error('plugin install failed');
      },
    });

    const root = document.createElement('div');
    document.body.append(root);
    const mount = app.mount(root);
    expect(app.mounted).toBe(true);
    expect(mount.exposed).toBeUndefined();
    expect(errors.map(({ source }) => source)).toEqual(['plugin', 'render']);
    expect(errors[1]?.error).toEqual(expect.objectContaining({ message: expect.stringMatching(/required/) }));

    const competingApp = createApp(html`<p>competing</p>`);
    expect(() => competingApp.mount(root)).toThrow(/already owns/i);
    expect(() => app.onMounted(() => undefined)).toThrow(/after the application has mounted/i);

    app.unmount();
    expect(app.mounted).toBe(false);

    const invalidErrors: AppErrorInfo[] = [];
    const invalidApp = createApp(() => null as never);
    invalidApp.config.errorHandler = (info) => { invalidErrors.push(info); };
    const invalidRoot = document.createElement('div');
    document.body.append(invalidRoot);
    invalidApp.mount(invalidRoot);
    expect(invalidErrors).toEqual([
      expect.objectContaining({ source: 'render', error: expect.any(TypeError) }),
    ]);
    invalidApp.unmount();
  });

  it('contains synchronous and asynchronous hook and cleanup failures', async () => {
    const errors: AppErrorInfo[] = [];
    const stopped = vi.fn();
    const failingDirective = directive<[]>({
      mount(part) {
        part.setValue('ready');
      },
      update() {},
      cleanup() {
        throw new Error('directive cleanup failed');
      },
    });
    const app = createApp<number>((context) => {
      context.expose(7);
      effect(() => undefined, {
        onStop() {
          stopped();
          throw new Error('effect cleanup failed');
        },
      });
      onScopeDispose(() => { throw new Error('scope cleanup failed'); });
      return html`<p>${failingDirective()}</p>`;
    });
    app.config.errorHandler = (info) => { errors.push(info); };
    app.use({
      install() {
        return async () => { throw new Error('plugin cleanup failed'); };
      },
    });
    app.onMounted(() => { throw new Error('mounted failed'); });
    app.onMounted(async () => { throw new Error('async mounted failed'); });
    app.onUnmounted(() => { throw new Error('unmounted failed'); });
    app.onUnmounted(async () => { throw new Error('async unmounted failed'); });

    const root = document.createElement('div');
    document.body.append(root);
    const mount = app.mount(root);
    expect(mount.exposed).toBe(7);
    await Promise.resolve();
    await Promise.resolve();

    app.unmount();
    await Promise.resolve();
    await Promise.resolve();

    expect(stopped).toHaveBeenCalledOnce();
    expect(errors.map(({ source }) => source)).toEqual([
      'lifecycle',
      'lifecycle',
      'lifecycle',
      'lifecycle',
      'lifecycle',
      'lifecycle',
      'lifecycle',
      'plugin',
    ]);
    expect(errors.map(({ error }) => (error as Error).message)).toEqual([
      'mounted failed',
      'async mounted failed',
      'effect cleanup failed',
      'scope cleanup failed',
      'directive cleanup failed',
      'unmounted failed',
      'async unmounted failed',
      'plugin cleanup failed',
    ]);
  });

  it('guards root event listeners and contains warning-handler failures', async () => {
    const state = reactive({ revision: 0 });
    const eventContext = createInjectionKey<string>('event-context');
    const errors: AppErrorInfo[] = [];
    let eventThis: EventTarget | undefined;
    let injectedFromEvent: string | undefined;
    const directListener = function (this: EventTarget) {
      eventThis = this;
      injectedFromEvent = inject(eventContext);
    };
    const objectListener: EventListenerObject = {
      handleEvent() {
        throw new Error('object event failed');
      },
    };
    const app = createApp(() => {
      warn('root warning', 'ROOT_WARNING');
      return html`
        <button id="direct" @click=${directListener}>${state.revision}</button>
        <button id="object" @click=${objectListener}>object</button>
        ${dynamicComponent(({ label }: { label: string }) => html`<p>${label}</p>`, { label: 'direct' })}
      `;
    });
    app.config.errorHandler = (info) => { errors.push(info); };
    app.config.warnHandler = () => { throw new Error('warning handler failed'); };
    app.provide(eventContext, 'owned');
    const root = document.createElement('div');
    document.body.append(root);
    app.mount(root);

    const direct = root.querySelector('#direct') as HTMLButtonElement;
    direct.click();
    expect(eventThis).toBe(direct);
    expect(injectedFromEvent).toBe('owned');
    (root.querySelector('#object') as HTMLButtonElement).click();

    state.revision += 1;
    await nextTick();
    direct.click();
    expect(root.textContent).toContain('direct');

    const guardedResult = app.run(() => runWithErrorHandling(() => {
      throw new Error('guarded failed');
    }, 'application'));
    expect(guardedResult).toBeUndefined();
    expect(errors.map(({ source }) => source)).toEqual([
      'application',
      'event',
      'application',
      'application',
    ]);
    app.unmount();
  });

  it('retains boundary ownership for async event failures after unmount', async () => {
    const captured: ComponentErrorInfo[] = [];
    let rejectEvent!: (error: unknown) => void;
    const pendingEvent = new Promise<void>((_resolve, reject) => {
      rejectEvent = reject;
    });

    class DeferredErrorChild extends GluonElement {
      protected override render() {
        return html`<button @click=${() => pendingEvent}>deferred</button>`;
      }
    }
    class DeferredErrorBoundary extends GluonElement {
      constructor() {
        super();
        this.onErrorCaptured((info) => {
          captured.push(info);
          return true;
        });
      }

      protected override render() {
        return html`<gluon-app-deferred-error-child></gluon-app-deferred-error-child>`;
      }
    }

    defineElement('gluon-app-deferred-error-child', DeferredErrorChild);
    defineElement('gluon-app-deferred-error-boundary', DeferredErrorBoundary);
    const app = createApp(html`<gluon-app-deferred-error-boundary></gluon-app-deferred-error-boundary>`);
    const root = document.createElement('div');
    document.body.append(root);
    app.mount(root);
    const boundary = root.querySelector('gluon-app-deferred-error-boundary') as DeferredErrorBoundary;
    await boundary.updateComplete;
    const child = boundary.shadowRoot?.querySelector('gluon-app-deferred-error-child') as DeferredErrorChild;
    await child.updateComplete;

    (child.shadowRoot?.querySelector('button') as HTMLButtonElement).click();
    app.unmount();
    rejectEvent(new Error('deferred event failed'));
    await Promise.resolve();
    await Promise.resolve();

    expect(captured).toEqual([
      expect.objectContaining({ source: 'async', element: child }),
    ]);
  });

  it('contains unowned failures and failures in application error handlers', async () => {
    const reportError = vi.fn();
    const warnFallback = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('reportError', reportError);
    try {
      warn('plain warning');
      warn('coded warning', 'WARNING_CODE');
      expect(warnFallback).toHaveBeenNthCalledWith(1, 'plain warning');
      expect(warnFallback).toHaveBeenNthCalledWith(2, '[WARNING_CODE] coded warning');

      expect(runWithErrorHandling(() => { throw new Error('unowned sync'); })).toBeUndefined();
      await runWithErrorHandling(async () => { throw new Error('unowned async'); });

      const defaultApp = createApp(html`<p>default</p>`);
      defaultApp.use(() => { throw new Error('plugin without handler'); });

      const failingHandlerApp = createApp(html`<p>handler</p>`);
      failingHandlerApp.config.errorHandler = () => { throw new Error('sync handler failed'); };
      failingHandlerApp.run(() => { throw new Error('owned sync'); });
      failingHandlerApp.config.errorHandler = async () => { throw new Error('async handler failed'); };
      await failingHandlerApp.run(async () => { throw new Error('owned async'); });
      await Promise.resolve();
      await Promise.resolve();

      expect(reportError.mock.calls.map(([error]) => (error as Error).message)).toEqual([
        'unowned sync',
        'unowned async',
        'plugin without handler',
        'sync handler failed',
        'async handler failed',
      ]);
    } finally {
      warnFallback.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});
