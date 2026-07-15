import type { TemplateResult, TemplateValue } from './runtime.js';

declare const injectionValue: unique symbol;

export type InjectionKey<Value> = symbol & {
  readonly [injectionValue]?: Value;
};

export type AppErrorSource =
  | 'application'
  | 'render'
  | 'effect'
  | 'event'
  | 'async'
  | 'lifecycle'
  | 'plugin';

export interface AppErrorInfo {
  readonly app: GluonApp;
  readonly error: unknown;
  readonly source: AppErrorSource;
  readonly element?: Element;
}

export interface AppWarningInfo {
  readonly app: GluonApp;
  readonly message: string;
  readonly code?: string;
  readonly element?: Element;
}

export type AppErrorHandler = (info: AppErrorInfo) => void | PromiseLike<void>;
export type AppWarningHandler = (info: AppWarningInfo) => void;

export interface AppConfig {
  errorHandler?: AppErrorHandler;
  warnHandler?: AppWarningHandler;
  readonly globalProperties: Record<string, unknown>;
}

export type FunctionalComponent<Props = Readonly<Record<string, unknown>>> = (
  props: Readonly<Props>,
) => TemplateValue;

export type AppPluginCleanup = () => void | PromiseLike<void>;

export interface GluonPlugin<Options = void> {
  install(
    app: GluonApp,
    options: Options,
  ): void | AppPluginCleanup;
}

export type GluonPluginFunction<Options = void> = (
  app: GluonApp,
  options: Options,
) => void | AppPluginCleanup;

export type GluonAppPlugin<Options = void> =
  | GluonPlugin<Options>
  | GluonPluginFunction<Options>;

export interface AppRootRenderContext<Public> {
  readonly app: GluonApp<Public>;
  expose(value: Public): void;
  inject<Value>(key: InjectionKey<Value>): Value;
  inject<Value>(key: InjectionKey<Value>, fallback: Value): Value;
  component<Props>(name: string, props: Readonly<Props>): TemplateValue;
}

export type AppRoot<Public = unknown> =
  | TemplateResult
  | ((context: AppRootRenderContext<Public>) => TemplateResult);

export type AppContainer = Element | ShadowRoot;

export interface AppMount<Public = unknown> {
  readonly app: GluonApp<Public>;
  readonly container: AppContainer;
  readonly exposed: Readonly<Public> | undefined;
  unmount(): void;
}

export interface GluonApp<Public = unknown> {
  readonly config: AppConfig;
  readonly mounted: boolean;
  use<Options>(plugin: GluonAppPlugin<Options>, options: Options): this;
  use(plugin: GluonAppPlugin<void>): this;
  provide<Value>(key: InjectionKey<Value>, value: Value): this;
  component<Props>(name: string, component: FunctionalComponent<Props>): this;
  onMounted(callback: () => void | PromiseLike<void>): this;
  onUnmounted(callback: () => void | PromiseLike<void>): this;
  mount(container: AppContainer): AppMount<Public>;
  unmount(): void;
  run<Result>(callback: () => Result | PromiseLike<Result>): Result | Promise<Result | undefined> | undefined;
}

export interface ApplicationContext {
  readonly app: GluonApp;
  readonly config: AppConfig;
  readonly provides: Map<InjectionKey<unknown>, unknown>;
  readonly components: Map<string, FunctionalComponent<unknown>>;
}

export interface ApplicationRuntimeFrame {
  readonly context?: ApplicationContext;
  readonly element?: Element;
  readonly handleError: (error: unknown, source: AppErrorSource) => void;
}

const applicationRoots = new WeakMap<Node, ApplicationContext>();
const eventWrappers = new WeakMap<object, WeakMap<object, EventListener>>();
let activeFrame: ApplicationRuntimeFrame | undefined;

export function createInjectionKey<Value>(description?: string): InjectionKey<Value> {
  return Symbol(description) as InjectionKey<Value>;
}

export function registerApplicationRoot(root: Node, context: ApplicationContext): void {
  applicationRoots.set(root, context);
}

export function unregisterApplicationRoot(root: Node, context: ApplicationContext): void {
  if (applicationRoots.get(root) === context) applicationRoots.delete(root);
}

export function resolveApplicationContext(node: Node): ApplicationContext | undefined {
  let current: Node | null = node;
  while (current) {
    const context = applicationRoots.get(current);
    if (context) return context;
    if (current.parentNode) {
      current = current.parentNode;
    } else if (current instanceof ShadowRoot) {
      current = current.host;
    } else {
      current = null;
    }
  }
  return undefined;
}

export function runWithApplicationContext<Result>(
  context: ApplicationContext | undefined,
  element: Element | undefined,
  handleError: ApplicationRuntimeFrame['handleError'],
  callback: () => Result,
): Result {
  return runWithApplicationFrame({ context, element, handleError }, callback);
}

export function runWithApplicationFrame<Result>(
  frame: ApplicationRuntimeFrame,
  callback: () => Result,
): Result {
  const previous = activeFrame;
  activeFrame = frame;
  try {
    return callback();
  } finally {
    activeFrame = previous;
  }
}

export function getActiveApplicationContext(): ApplicationContext | undefined {
  return activeFrame?.context;
}

export function getActiveElement(): Element | undefined {
  return activeFrame?.element;
}

export function reportApplicationError(
  context: ApplicationContext | undefined,
  error: unknown,
  source: AppErrorSource,
  element?: Element,
): void {
  const handler = context?.config.errorHandler;
  if (!context || !handler) {
    reportUnhandledError(error);
    return;
  }

  const info = { app: context.app, error, source, ...(element ? { element } : {}) };
  try {
    const result = handler(info);
    if (isPromiseLike(result)) {
      void Promise.resolve(result).catch(reportUnhandledError);
    }
  } catch (handlerError) {
    reportUnhandledError(handlerError);
  }
}

export function reportApplicationWarning(
  context: ApplicationContext | undefined,
  message: string,
  code?: string,
  element?: Element,
): void {
  const handler = context?.config.warnHandler;
  if (context && handler) {
    try {
      handler({ app: context.app, message, ...(code ? { code } : {}), ...(element ? { element } : {}) });
      return;
    } catch (error) {
      reportApplicationError(context, error, 'application', element);
      return;
    }
  }

  try {
    globalThis.console?.warn?.(code ? `[${code}] ${message}` : message);
  } catch {
    // Warning reporting cannot change application execution.
  }
}

export function warn(message: string, code?: string): void {
  reportApplicationWarning(activeFrame?.context, message, code, activeFrame?.element);
}

export function guardEventListener(
  listener: EventListenerOrEventListenerObject,
): EventListenerOrEventListenerObject {
  const frame = activeFrame;
  if (!frame) return listener;
  const listenerKey = listener as object;
  const ownerKey = (frame.element ?? frame.context?.app) as object | undefined;
  if (!ownerKey) return listener;
  let owners = eventWrappers.get(listenerKey);
  if (!owners) {
    owners = new WeakMap();
    eventWrappers.set(listenerKey, owners);
  }
  const cached = owners.get(ownerKey);
  if (cached) return cached;

  const guarded = function guardedEventListener(this: EventTarget, event: Event): void {
    try {
      const result = runWithApplicationContext(
        frame.context,
        frame.element,
        frame.handleError,
        () => typeof listener === 'function'
          ? (listener as unknown as (this: EventTarget, event: Event) => unknown).call(this, event)
          : (listener as EventListenerObject).handleEvent(event),
      );
      if (isPromiseLike(result)) {
        void Promise.resolve(result).catch((error: unknown) => frame.handleError(error, 'async'));
      }
    } catch (error) {
      frame.handleError(error, 'event');
    }
  };
  owners.set(ownerKey, guarded);
  return guarded;
}

export function runActiveGuarded<Result>(
  callback: () => Result | PromiseLike<Result>,
  source: AppErrorSource = 'async',
): Result | Promise<Result | undefined> | undefined {
  const frame = activeFrame;
  try {
    const result = callback();
    if (!isPromiseLike(result)) return result;
    return Promise.resolve(result).catch((error: unknown) => {
      if (frame) frame.handleError(error, source);
      else reportUnhandledError(error);
      return undefined;
    });
  } catch (error) {
    if (frame) frame.handleError(error, source);
    else reportUnhandledError(error);
    return undefined;
  }
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === 'object' && value !== null) || typeof value === 'function'
  ) && typeof Reflect.get(value, 'then') === 'function';
}

function reportUnhandledError(error: unknown): void {
  try {
    const environment = globalThis as {
      reportError?: (reason: unknown) => void;
      console?: { error?: (...values: unknown[]) => void };
    };
    if (typeof environment.reportError === 'function') environment.reportError(error);
    else environment.console?.error?.(error);
  } catch {
    // The default error channel must remain contained.
  }
}
