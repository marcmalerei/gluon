import {
  effect,
  effectScope,
  queueJob,
  type EffectScope,
  type ReactiveEffectRunner,
  type ReactivityErrorContext,
} from '@gluonjs/reactivity';
import {
  createInjectionKey,
  getActiveApplicationContext,
  getActiveElement,
  registerApplicationRoot,
  reportApplicationError,
  reportApplicationWarning,
  runActiveGuarded,
  runWithApplicationContext,
  unregisterApplicationRoot,
  warn,
  type AppConfig,
  type AppContainer,
  type AppErrorSource,
  type AppMount,
  type AppPluginCleanup,
  type AppRoot,
  type AppRootRenderContext,
  type ApplicationContext,
  type FunctionalComponent,
  type GluonApp,
  type GluonAppPlugin,
  type InjectionKey,
} from './application-context.js';
import {
  isTemplateResult,
  nothing,
  render,
  unmount as unmountRender,
  type TemplateResult,
  type TemplateValue,
} from './runtime.js';

const mountedContainers = new WeakMap<Node, GluonAppImpl<unknown>>();
const mountedApplications = new Set<GluonAppImpl<unknown>>();
let applicationSequence = 1_000_000;

/** Requests a render pass for every mounted application after a compatible HMR update. */
export function refreshGluonApplications(): void {
  for (const application of mountedApplications) application.requestHotUpdate();
}

export {
  createInjectionKey,
  runActiveGuarded as runWithErrorHandling,
  warn,
  type AppConfig,
  type AppContainer,
  type AppErrorHandler,
  type AppErrorInfo,
  type AppErrorSource,
  type AppMount,
  type AppPluginCleanup,
  type AppRoot,
  type AppRootRenderContext,
  type AppWarningHandler,
  type AppWarningInfo,
  type FunctionalComponent,
  type GluonApp,
  type GluonAppPlugin,
  type GluonPlugin,
  type GluonPluginFunction,
  type InjectionKey,
} from './application-context.js';

export function inject<Value>(key: InjectionKey<Value>): Value;
export function inject<Value>(key: InjectionKey<Value>, fallback: Value): Value;
export function inject<Value>(key: InjectionKey<Value>, fallback?: Value): Value {
  const context = getActiveApplicationContext();
  if (context?.provides.has(key as InjectionKey<unknown>)) {
    return context.provides.get(key as InjectionKey<unknown>) as Value;
  }
  if (arguments.length >= 2) return fallback as Value;
  throw new Error(`Missing Gluon application injection for ${String(key.description ?? key)}.`);
}

export function dynamicComponent<Props>(
  component: string | FunctionalComponent<Props>,
  props: Readonly<Props>,
): TemplateValue {
  const context = getActiveApplicationContext();
  const resolved = typeof component === 'string'
    ? context?.components.get(component) as FunctionalComponent<Props> | undefined
    : component;
  if (!resolved) {
    reportApplicationWarning(
      context,
      `Application component "${String(component)}" is not registered.`,
      'GLUON_COMPONENT_MISSING',
      getActiveElement(),
    );
    return nothing;
  }
  return resolved(props);
}

export function createApp<Public = unknown>(root: AppRoot<Public>): GluonApp<Public> {
  return new GluonAppImpl(root);
}

class GluonAppImpl<Public> implements GluonApp<Public> {
  readonly config: AppConfig = { globalProperties: {} };
  readonly context: ApplicationContext;
  private readonly root: AppRoot<Public>;
  private readonly plugins = new Set<GluonAppPlugin<unknown>>();
  private readonly pluginCleanups: AppPluginCleanup[] = [];
  private readonly mountedHooks: Array<() => void | PromiseLike<void>> = [];
  private readonly unmountedHooks: Array<() => void | PromiseLike<void>> = [];
  private readonly updateId = applicationSequence;
  private state: 'created' | 'mounted' | 'unmounted' = 'created';
  private container?: AppContainer;
  private scope?: EffectScope;
  private runner?: ReactiveEffectRunner<void | undefined>;
  private publicExposure?: Readonly<Public>;
  private rootCommitted = false;

  constructor(root: AppRoot<Public>) {
    applicationSequence += 1;
    this.root = root;
    this.context = {
      app: this as GluonApp,
      config: this.config,
      provides: new Map(),
      components: new Map(),
    };
  }

  get mounted(): boolean {
    return this.state === 'mounted';
  }

  use<Options>(plugin: GluonAppPlugin<Options>, options: Options): this;
  use(plugin: GluonAppPlugin<void>): this;
  use<Options>(plugin: GluonAppPlugin<Options>, options?: Options): this {
    this.assertConfigurable('install plugins');
    const untypedPlugin = plugin as GluonAppPlugin<unknown>;
    if (this.plugins.has(untypedPlugin)) {
      reportApplicationWarning(this.context, 'The application plugin is already installed.', 'GLUON_PLUGIN_DUPLICATE');
      return this;
    }
    this.plugins.add(untypedPlugin);
    try {
      const cleanup = typeof plugin === 'function'
        ? plugin(this, options as Options)
        : plugin.install(this, options as Options);
      if (typeof cleanup === 'function') this.pluginCleanups.push(cleanup);
    } catch (error) {
      reportApplicationError(this.context, error, 'plugin');
    }
    return this;
  }

  provide<Value>(key: InjectionKey<Value>, value: Value): this {
    this.assertConfigurable('provide application values');
    this.context.provides.set(key as InjectionKey<unknown>, value);
    return this;
  }

  component<Props>(name: string, component: FunctionalComponent<Props>): this {
    this.assertConfigurable('register application components');
    if (!name.trim()) throw new TypeError('Application component names cannot be empty.');
    this.context.components.set(name, component as FunctionalComponent<unknown>);
    return this;
  }

  onMounted(callback: () => void | PromiseLike<void>): this {
    this.assertConfigurable('register mount hooks');
    this.mountedHooks.push(callback);
    return this;
  }

  onUnmounted(callback: () => void | PromiseLike<void>): this {
    this.assertConfigurable('register unmount hooks');
    this.unmountedHooks.push(callback);
    return this;
  }

  mount(container: AppContainer): AppMount<Public> {
    if (this.state !== 'created') throw new Error('A Gluon application can only be mounted once.');
    if (!(container instanceof Element || container instanceof ShadowRoot)) {
      throw new TypeError('A Gluon application mount requires a persistent Element or ShadowRoot.');
    }
    if (mountedContainers.has(container)) throw new Error('The mount container already owns a Gluon application.');
    this.state = 'mounted';
    this.container = container;
    mountedContainers.set(container, this as GluonAppImpl<unknown>);
    registerApplicationRoot(container, this.context);

    const scope = effectScope({
      detached: true,
      onError: (errorContext) => this.reportReactiveError(errorContext),
    });
    const runner = scope.run(() => effect(
      () => scope.run(() => this.renderRoot()),
      {
        flush: 'update',
        id: this.updateId,
        lazy: true,
        onError: (errorContext) => this.reportReactiveError(errorContext),
      },
    ))!;
    this.scope = scope;
    this.runner = runner;
    mountedApplications.add(this as GluonAppImpl<unknown>);
    runner();

    const app = this;
    return {
      app,
      container,
      get exposed() {
        return app.publicExposure;
      },
      unmount() {
        app.unmount();
      },
    };
  }

  unmount(): void {
    if (this.state === 'unmounted') return;
    if (this.state !== 'mounted' || !this.container) {
      throw new Error('Cannot unmount a Gluon application before it is mounted.');
    }
    const container = this.container;
    this.state = 'unmounted';
    try {
      this.scope?.stop();
    } catch (error) {
      reportApplicationError(this.context, error, 'lifecycle');
    }
    this.scope = undefined;
    this.runner = undefined;
    try {
      try {
        unmountRender(container);
      } catch (error) {
        reportApplicationError(this.context, error, 'lifecycle');
      }
      this.invokeHooks(this.unmountedHooks, 'lifecycle');
      for (let index = this.pluginCleanups.length - 1; index >= 0; index -= 1) {
        this.invokeCallback(this.pluginCleanups[index]!, 'plugin');
      }
    } finally {
      unregisterApplicationRoot(container, this.context);
      mountedContainers.delete(container);
      mountedApplications.delete(this as GluonAppImpl<unknown>);
      this.container = undefined;
      this.publicExposure = undefined;
      this.context.provides.clear();
      this.context.components.clear();
      this.pluginCleanups.length = 0;
    }
  }

  requestHotUpdate(): void {
    if (this.state !== 'mounted' || !this.runner) return;
    queueJob(this.runner, { phase: 'update', id: this.updateId });
  }

  run<Result>(
    callback: () => Result | PromiseLike<Result>,
  ): Result | Promise<Result | undefined> | undefined {
    return runWithApplicationContext(
      this.context,
      undefined,
      (error, source) => reportApplicationError(this.context, error, source),
      () => runActiveGuarded(callback, 'async'),
    );
  }

  private renderRoot(): void {
    const container = this.container;
    if (!container || this.state !== 'mounted') return;
    runWithApplicationContext(
      this.context,
      undefined,
      (error, source) => reportApplicationError(this.context, error, source),
      () => {
        const result = typeof this.root === 'function'
          ? this.root(this.createRootRenderContext())
          : this.root;
        if (!isTemplateResult(result)) {
          throw new TypeError('A Gluon application root must return a TemplateResult.');
        }
        render(result, container);
        if (!this.rootCommitted) {
          this.rootCommitted = true;
          this.invokeHooks(this.mountedHooks, 'lifecycle');
        }
      },
    );
  }

  private createRootRenderContext(): AppRootRenderContext<Public> {
    return {
      app: this,
      expose: (value) => {
        this.publicExposure = freezeExposure(value);
      },
      inject,
      component: (name, props) => dynamicComponent(name, props),
    };
  }

  private invokeHooks(
    hooks: ReadonlyArray<() => void | PromiseLike<void>>,
    source: AppErrorSource,
  ): void {
    for (const hook of hooks) this.invokeCallback(hook, source);
  }

  private invokeCallback(
    callback: () => void | PromiseLike<void>,
    source: AppErrorSource,
  ): void {
    try {
      const result = runWithApplicationContext(
        this.context,
        undefined,
        (error, callbackSource) => reportApplicationError(
          this.context,
          error,
          callbackSource,
        ),
        callback,
      );
      if (isPromiseLike(result)) {
        void Promise.resolve(result).catch((error: unknown) => {
          reportApplicationError(this.context, error, source);
        });
      }
    } catch (error) {
      reportApplicationError(this.context, error, source);
    }
  }

  private reportReactiveError(errorContext: ReactivityErrorContext): void {
    const source: AppErrorSource = errorContext.source === this.runner
      ? 'render'
      : errorContext.phase === 'cleanup'
        ? 'lifecycle'
        : 'effect';
    reportApplicationError(this.context, errorContext.error, source);
  }

  private assertConfigurable(action: string): void {
    if (this.state !== 'created') {
      throw new Error(`Cannot ${action} after the application has mounted.`);
    }
  }
}

function freezeExposure<Public>(value: Public): Readonly<Public> {
  if ((typeof value === 'object' && value !== null) || typeof value === 'function') {
    return Object.freeze(value);
  }
  return value;
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === 'object' && value !== null) || typeof value === 'function'
  ) && typeof Reflect.get(value, 'then') === 'function';
}
