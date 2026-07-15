import {
  getCompiledPrimitiveTextBinding,
  releaseRenderStyles,
  render,
  suspendRender,
  updateCompiledPrimitiveTextBinding,
  type CompiledPrimitiveTextBinding,
  type RefTarget,
  type TemplateResult,
  type TemplateValue,
} from './runtime.js';
import { adoptStyles } from './styles/index.js';
import {
  effect,
  effectScope,
  invalidateJob,
  queueJob,
  type EffectDebuggerEvent,
  type EffectScope,
  type ReactivityErrorContext,
  type ReactiveEffectRunner,
} from '@gluonjs/reactivity';
import {
  reportApplicationError,
  reportApplicationWarning,
  resolveApplicationContext,
  runWithApplicationContext,
  type AppErrorSource,
  type ApplicationContext,
} from './application-context.js';
import {
  getOwnDecoratedProperties,
  hasOwnDecoratedProperty,
  synchronizeLegacyDecoratorProperties,
} from './decorator-metadata.js';
import {
  createRegistryShadowRoot,
  defineRegistryElement,
  getNodeCustomElementRegistry,
  getRegistryDefinition,
  type GluonElementDefinitionRegistry,
  type GluonElementRegistry,
} from './element-registry.js';

declare const __GLUON_DEV__: boolean;

const compiledDevelopment = typeof __GLUON_DEV__ === 'undefined'
  ? undefined
  : __GLUON_DEV__;

function isDevelopmentEnabled(): boolean {
  return compiledDevelopment ?? (
    globalThis as { process?: { env?: { NODE_ENV?: string } } }
  ).process?.env?.NODE_ENV !== 'production';
}

const HTMLElementBase = (
  globalThis as { HTMLElement?: typeof HTMLElement }
).HTMLElement ?? class {} as unknown as typeof HTMLElement;

export type GluonRenderCause =
  | { readonly type: 'connection' }
  | { readonly type: 'request' }
  | {
    readonly type: 'property';
    readonly name: string;
    readonly value: unknown;
    readonly oldValue: unknown;
  }
  | { readonly type: 'reactive'; readonly dependency: EffectDebuggerEvent };

export interface GluonRenderDebugEvent {
  readonly element: GluonElement<any>;
  readonly causes: readonly GluonRenderCause[];
  readonly dependencies: readonly EffectDebuggerEvent[];
  readonly startedAt: number;
  readonly endedAt: number;
  readonly duration: number;
  readonly failed: boolean;
  readonly error?: unknown;
}

export type GluonRenderDebugHook = (event: GluonRenderDebugEvent) => void;

export type ComponentLifecycleCallback = () => void | PromiseLike<void>;

export interface ComponentErrorInfo {
  readonly error: unknown;
  readonly source: AppErrorSource;
  readonly element: GluonElement<any>;
}

export type ComponentErrorBoundary = (info: ComponentErrorInfo) => boolean | void;

export interface EventDeclaration<Detail = unknown> {
  /** Whether the event travels through ancestor elements. Defaults to `true`. */
  readonly bubbles?: boolean;
  /** Whether the event crosses a Shadow DOM boundary. Defaults to `true`. */
  readonly composed?: boolean;
  /** Whether a listener can cancel the event with `preventDefault()`. Defaults to `false`. */
  readonly cancelable?: boolean;
  /** Returns `true` for valid detail or a diagnostic message for invalid detail. */
  readonly validate?: (detail: Detail) => boolean | string;
}

export type EventDeclarations<Events extends object = Record<string, unknown>> = Readonly<{
  [Name in keyof Events]?: EventDeclaration<Events[Name]>;
}>;

export type ComponentEventMap<Events extends object> = {
  readonly [Name in keyof Events]: CustomEvent<Events[Name]>;
};

export interface SlotDeclaration {
  /** Reports a diagnostic after the first render when no matching content was provided. */
  readonly required?: boolean;
  /** Records that the component renders fallback content for this slot. */
  readonly fallback?: boolean;
}

export type SlotDeclarations<Names extends string = string> = Readonly<
  Partial<Record<Names, SlotDeclaration>>
>;

let renderDebugHook: GluonRenderDebugHook | undefined;

/** Installs the development render diagnostic hook and returns a restore handle. */
export function setGluonRenderDebugHook(
  hook: GluonRenderDebugHook | undefined,
): () => void {
  const previous = renderDebugHook;
  renderDebugHook = hook;
  return () => {
    renderDebugHook = previous;
  };
}

export type PropertyType =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | ObjectConstructor
  | ArrayConstructor;

export interface PropertyConverter<Value = unknown> {
  /** Converts an attribute string into the JavaScript property value. */
  fromAttribute?(value: string | null, type?: PropertyType): Value;
  /** Converts a reflected JavaScript property value into an attribute string. */
  toAttribute?(value: Value, type?: PropertyType): string | null;
}

export interface PropertyDeclaration<Value = unknown> {
  /** Selects the built-in String, Number, Boolean, Object, or Array attribute converter. */
  readonly type?: PropertyType;
  /** Changes the attribute name, or disables attribute transport with `false`. */
  readonly attribute?: string | false;
  /** Mirrors accepted property writes back to the matching attribute. Defaults to `false`. */
  readonly reflect?: boolean;
  /** Supplies the initial value; use a factory for per-instance objects and arrays. */
  readonly default?: Value | (() => Value);
  /** Replaces one or both built-in attribute conversion directions. */
  readonly converter?: PropertyConverter<Value>;
  /** Decides whether a write schedules an update. The default is `!Object.is(value, oldValue)`. */
  readonly hasChanged?: (value: Value, oldValue: Value | undefined) => boolean;
  /** Reports a diagnostic on connection when no value or default was provided. */
  readonly required?: boolean;
  /** Returns `true` for a valid value or a diagnostic message for an invalid value. */
  readonly validate?: (value: Value) => boolean | string;
}

export type PropertyDefinition<Value = unknown> = PropertyType | PropertyDeclaration<Value>;
export type PropertyDeclarations<Props extends object = Record<string, unknown>> = Readonly<{
  [Name in keyof Props]: PropertyDefinition<Props[Name]>;
}>;

type GluonElementConstructor = GluonElementClass & {
  readonly properties?: Readonly<Record<string, PropertyDefinition<any>>>;
  readonly events?: Readonly<Record<string, EventDeclaration<any>>>;
  readonly slots?: SlotDeclarations;
  readonly styles?: CSSStyleSheet | readonly CSSStyleSheet[];
  readonly shadowRootRegistry?: GluonElementRegistry;
};

const finalizedConstructors = new WeakSet<Function>();
const declarationCache = new WeakMap<Function, PropertyDeclarations>();
const styleCache = new WeakMap<Function, readonly CSSStyleSheet[]>();
const eventDeclarationCache = new WeakMap<Function, EventDeclarations>();
const slotDeclarationCache = new WeakMap<Function, SlotDeclarations>();
const connectedElements = new Set<GluonElement<any>>();
const hotElementDefinitions = new WeakMap<object, Map<string, GluonElementConstructor>>();
const defaultRegistryIdentity = Object.freeze({ kind: 'gluon-default-element-registry' });
const definedElementNames = new WeakMap<
  GluonElementClass,
  Map<object, `${string}-${string}`>
>();
const serverElementDefinitions = new Map<`${string}-${string}`, GluonElementClass>();
const propertyValues = Symbol('gluon.property-values');
const compiledTextBinding = Symbol('gluon.compiled-text-binding');
const setProperty = Symbol('gluon.set-property');
export const functionalElementPropertyChanged = Symbol('gluon.functional-element-property-changed');
const publicInstance = Symbol('gluon.public-instance');
let elementUpdateSequence = 0;

interface UpdateDeferred {
  readonly promise: Promise<void>;
  readonly resolve: () => void;
  readonly reject: (reason?: unknown) => void;
}

type ComponentErrorReporter = (error: unknown, source: AppErrorSource) => void;

interface CapturedComponentBoundary {
  readonly element: GluonElement<any>;
  readonly context?: ApplicationContext;
  readonly callbacks: readonly ComponentErrorBoundary[];
}

interface ElementRenderDebugState {
  readonly causes: GluonRenderCause[];
  dependencies?: EffectDebuggerEvent[];
}

const elementRenderDebugStates = compiledDevelopment === false
  ? undefined
  : new WeakMap<GluonElement<any>, ElementRenderDebugState>();

/**
 * Base class for a stateful Gluon Custom Element with a Shadow DOM render root.
 *
 * Subclasses declare their input properties, output events, slots, and adopted
 * styles with static fields. Implement the protected `render()` method for the
 * component template, register connection-owned work with the lifecycle hooks, and call
 * {@link emit} for typed native `CustomEvent` output. Register the class once
 * with {@link defineElement}.
 *
 * Prefer `defineGluonElement()` when a component does not need inheritance or
 * protected lifecycle/render hooks.
 *
 * @typeParam Events Map from emitted event names to their `CustomEvent.detail` types.
 */
export abstract class GluonElement<
  Events extends object = Record<string, unknown>,
> extends HTMLElementBase {
  /** Declares reactive inputs and their attribute conversion, reflection, and validation rules. */
  static readonly properties: Readonly<Record<string, PropertyDefinition<any>>> = {};
  /** Declares native output events and their propagation, cancellation, and validation rules. */
  static readonly events: Readonly<Record<string, EventDeclaration<any>>> = {};
  /** Declares required named/default slots and whether the template supplies fallback content. */
  static readonly slots: SlotDeclarations = {};
  /** Lists constructable stylesheets adopted into each instance's render root. */
  static readonly styles: CSSStyleSheet | readonly CSSStyleSheet[] = [];
  /** Optional explicit registry associated with this element's ShadowRoot. */
  static readonly shadowRootRegistry?: GluonElementRegistry;

  /** Shadow root rendered by {@link update}; override {@link createRenderRoot} to customize it. */
  protected readonly renderRoot: ShadowRoot;
  private readonly [propertyValues] = new Map<string, unknown>();
  private readonly providedProperties = new Set<string>();
  private readonly updateId = elementUpdateSequence;
  private connected = false;
  private reflectingAttribute?: string;
  private readonly initialAttributePrecedence = new Map<string, string>();
  private applicationContext?: ApplicationContext;
  private componentErrorReporter?: ComponentErrorReporter;
  private renderScope?: EffectScope;
  private renderEffect?: ReactiveEffectRunner<void | undefined>;
  private [compiledTextBinding]?: CompiledPrimitiveTextBinding;
  private pendingUpdate?: UpdateDeferred;
  private pendingPropertyUpdate?: string;
  private pendingPropertyValue?: unknown;
  private pendingFullUpdate = false;
  private compiledPropertyUpdateJob?: () => void;
  private connectionRendered = false;
  private hydrationPending = false;
  private readonly connectedHooks: ComponentLifecycleCallback[] = [];
  private readonly beforeUpdateHooks: ComponentLifecycleCallback[] = [];
  private readonly updatedHooks: ComponentLifecycleCallback[] = [];
  private readonly disconnectedHooks: ComponentLifecycleCallback[] = [];
  private readonly errorBoundaries: ComponentErrorBoundary[] = [];
  /** @internal */
  [publicInstance]?: Readonly<object>;
  private updatePromise: Promise<void> = Promise.resolve();

  /** Creates the render root, finalizes declarations, captures pre-upgrade values, and applies defaults. */
  constructor() {
    super();
    elementUpdateSequence += 1;
    this.renderRoot = typeof this.attachShadow === 'function'
      ? this.createRenderRoot()
      : undefined as unknown as ShadowRoot;
    const constructor = this.constructor as GluonElementConstructor;
    finalizeProperties(constructor);
    this.capturePreUpgradeProperties(constructor);
    this.applyPropertyDefaults(constructor);
  }

  /** Attribute names derived from {@link properties}; managed by Gluon for the Custom Elements platform. */
  static get observedAttributes(): string[] {
    const attributes: string[] = [];
    for (const [name, definition] of Object.entries(getDeclarations(
      this as unknown as GluonElementConstructor,
    ))) {
      const attribute = getAttributeName(name, normalizeDeclaration(definition));
      if (attribute) attributes.push(attribute);
    }
    return attributes;
  }

  /** Starts connection-owned reactivity and queues the first render. Prefer {@link onConnected} in subclasses. */
  connectedCallback(): void {
    if (this.connected) return;
    this.connected = true;
    this.applicationContext = resolveApplicationContext(this);
    this.componentErrorReporter = this.createComponentErrorReporter();
    this.validateDeclaredProperties();
    adoptStyles(this.renderRoot, ...getStyles(this.constructor as GluonElementConstructor));
    this.reflectCurrentProperties();
    this.createRenderEffect();
    connectedElements.add(this);
    void this.queueUpdate(
      compiledDevelopment !== false && isDevelopmentEnabled()
        ? { type: 'connection' }
        : undefined,
    );
  }

  /** Stops connection-owned work and suspends rendering. Prefer {@link onDisconnected} in subclasses. */
  disconnectedCallback(): void {
    if (!this.connected) return;
    this.connected = false;
    connectedElements.delete(this);
    const scope = this.renderScope;
    this.renderScope = undefined;
    this.renderEffect = undefined;
    /* v8 ignore next -- production-only job ownership is covered by the built Vite integration. */
    if (this.compiledPropertyUpdateJob) invalidateJob(this.compiledPropertyUpdateJob);
    try {
      scope?.stop();
    } finally {
      this.resolvePendingUpdate();
      if (compiledDevelopment !== false && isDevelopmentEnabled()) {
        elementRenderDebugStates?.delete(this);
      }
      try {
        suspendRender(this.renderRoot);
        releaseRenderStyles(this.renderRoot);
      } finally {
        try {
          this.invokeLifecycle(this.disconnectedHooks);
        } finally {
          this.teardownConnection();
          this.connectionRendered = false;
          this.componentErrorReporter = undefined;
          this.applicationContext = undefined;
        }
      }
    }
  }

  /** Converts a changed declared attribute and writes the corresponding property. */
  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    value: string | null,
  ): void {
    if (oldValue === value || this.reflectingAttribute === name) return;
    const declarations = getDeclarations(this.constructor as GluonElementConstructor);

    for (const [property, definition] of Object.entries(declarations)) {
      const declaration = normalizeDeclaration(definition);
      if (getAttributeName(property, declaration) !== name) continue;
      const initialAttribute = this.initialAttributePrecedence.get(name);
      if (initialAttribute !== undefined) {
        this.initialAttributePrecedence.delete(name);
        if (oldValue === null && value === initialAttribute) return;
      }
      const converted = declaration.converter?.fromAttribute
        ? declaration.converter.fromAttribute(value, declaration.type)
        : fromAttribute(value, declaration.type);
      this[setProperty](property, converted, declaration, false);
      return;
    }
  }

  /** Resolves after the currently scheduled render and its update hooks finish. */
  get updateComplete(): Promise<void> {
    return this.updatePromise;
  }

  /** Creates the component render root. Override only when the default open ShadowRoot is unsuitable. */
  protected createRenderRoot(): ShadowRoot {
    const registry = (this.constructor as GluonElementConstructor).shadowRootRegistry;
    return registry
      ? createRegistryShadowRoot(this, registry)
      : this.shadowRoot ?? this.attachShadow({ mode: 'open' });
  }

  /** Schedules a deduplicated render and returns the same completion promise exposed by {@link updateComplete}. */
  protected requestUpdate(): Promise<void> {
    return this.queueUpdate(
      compiledDevelopment !== false && isDevelopmentEnabled()
        ? { type: 'request' }
        : undefined,
    );
  }

  /** Requests a render pass after the official Vite runtime patches compatible logic. Application code should use normal reactive or property updates. */
  requestHotUpdate(): Promise<void> {
    return this.requestUpdate();
  }

  /** Returns the component template without browser connection lifecycle for official server rendering. */
  renderForServer(): TemplateResult {
    return this.render();
  }

  /** Defers the first connection render while official hydration binds declarative Shadow DOM. */
  beginHydration(): void {
    this.hydrationPending = true;
  }

  /** Resumes connection rendering after official hydration installs the hydrated root. */
  endHydration(): void {
    if (!this.hydrationPending) return;
    this.hydrationPending = false;
    void this.queueUpdate(
      compiledDevelopment !== false && isDevelopmentEnabled()
        ? { type: 'request' }
        : undefined,
    );
  }

  /** Runs a callback once after the first render of each connection. */
  protected onConnected(callback: ComponentLifecycleCallback): void {
    this.connectedHooks.push(callback);
  }

  /** Runs a callback before every update after the first render. */
  protected onBeforeUpdate(callback: ComponentLifecycleCallback): void {
    this.beforeUpdateHooks.push(callback);
  }

  /** Runs a callback after every successful render, including the first render. */
  protected onUpdated(callback: ComponentLifecycleCallback): void {
    this.updatedHooks.push(callback);
  }

  /** Runs a callback during disconnection after scoped reactive cleanup and render suspension. */
  protected onDisconnected(callback: ComponentLifecycleCallback): void {
    this.disconnectedHooks.push(callback);
  }

  /** Captures descendant component errors; return `true` to stop propagation to outer boundaries. */
  protected onErrorCaptured(callback: ComponentErrorBoundary): void {
    this.errorBoundaries.push(callback);
  }

  /** Initializes work once per connection inside the connection's reactive effect scope. */
  protected setupConnection(): void {}

  /** Releases connection-local references after scoped cleanup and disconnect hooks. */
  protected teardownConnection(): void {}

  /** Publishes a frozen, deliberately small public object for use with `exposedRef()`. */
  protected expose<Public extends object>(value: Public): Readonly<Public> {
    const exposed = Object.freeze(value);
    this[publicInstance] = exposed;
    return exposed;
  }

  /** Commits the value returned by {@link render} into {@link renderRoot}. */
  protected update(): void {
    const result = this.render();
    render(result, this.renderRoot);
    const binding = getCompiledPrimitiveTextBinding(result);
    this[compiledTextBinding] = binding;
  }

  /**
   * Dispatches a typed native `CustomEvent` using the matching static event declaration.
   *
   * Events bubble and cross the Shadow DOM boundary by default. The return value
   * is `false` only when a cancelable event was canceled by a listener.
   */
  protected emit<Name extends keyof Events & string>(
    type: Name,
    detail: Events[Name],
    init: Omit<CustomEventInit<Events[Name]>, 'detail'> = {},
  ): boolean {
    const declarations = getEventDeclarations(this.constructor as GluonElementConstructor);
    const declaration = declarations[type] as EventDeclaration<Events[Name]> | undefined;
    if (Object.keys(declarations).length > 0 && !declaration) {
      reportApplicationWarning(
        this.applicationContext,
        `Event "${type}" is not declared by ${this.localName}.`,
        'GLUON_EVENT_UNDECLARED',
        this,
      );
    }
    if (declaration?.validate) {
      this.validateContractValue('event', type, detail, declaration.validate);
    }
    return this.dispatchEvent(new CustomEvent(type, {
      bubbles: declaration?.bubbles ?? true,
      composed: declaration?.composed ?? true,
      cancelable: declaration?.cancelable ?? false,
      ...init,
      detail,
    }));
  }

  /** Returns the template for the current component state. */
  protected abstract render(): TemplateResult;

  /** @internal */
  [setProperty](
    name: string,
    value: unknown,
    declaration: PropertyDeclaration,
    reflect = true,
  ): void {
    if (declaration.required) this.providedProperties.add(name);
    if (this.connected && declaration.validate) {
      this.validateContractValue('property', name, value, declaration.validate);
    }
    const oldValue = this[propertyValues].get(name);
    if (declaration.hasChanged
      ? !declaration.hasChanged(value, oldValue)
      : Object.is(value, oldValue)) return;

    this[propertyValues].set(name, value);
    const functionalObserver = (this as GluonElement<Events> & {
      [functionalElementPropertyChanged]?: (property: string) => void;
    })[functionalElementPropertyChanged];
    functionalObserver?.call(this, name);
    if (reflect && declaration.reflect && this.connected) {
      this.reflectProperty(name, value, declaration);
    }
    void this.queuePropertyUpdate(
      name,
      value,
      compiledDevelopment !== false && isDevelopmentEnabled()
        ? {
            type: 'property',
            name,
            value,
            oldValue,
          }
        : undefined,
    );
  }

  private createRenderEffect(): void {
    if (this.renderEffect) return;
    const ownsErrorRouting = Boolean(this.applicationContext) || this.hasAncestorErrorBoundary();
    const scope = effectScope({
      detached: true,
      ...(ownsErrorRouting
        ? { onError: (errorContext: ReactivityErrorContext) => this.reportReactiveError(errorContext) }
        : {}),
    });
    try {
      scope.run(() => this.runOwned(() => this.setupConnection()));
    } catch (error) {
      try {
        scope.stop();
      } finally {
        this.teardownConnection();
      }
      this.handleComponentError(error, 'lifecycle');
      return;
    }
    const runner = scope.run(() => effect(
      () => scope.run(() => this.performUpdate()),
      {
        flush: 'update',
        id: this.updateId,
        lazy: true,
        onSchedule: () => {
          if (this.connected) {
            this.pendingFullUpdate = true;
            this.ensurePendingUpdate();
          }
        },
        ...(compiledDevelopment !== false && isDevelopmentEnabled() ? {
          onTrack: (dependency: EffectDebuggerEvent) => {
            getElementRenderDebugState(this).dependencies?.push(dependency);
          },
          onTrigger: (dependency: EffectDebuggerEvent) => {
            recordElementRenderCause(this, { type: 'reactive', dependency });
          },
        } : {}),
      },
    ))!;
    this.renderScope = scope;
    this.renderEffect = runner;
  }

  private queueUpdate(cause?: GluonRenderCause): Promise<void> {
    const runner = this.renderEffect;
    if (!this.connected || !runner) return this.updatePromise;
    if (compiledDevelopment !== false && isDevelopmentEnabled()) {
      if (cause) recordElementRenderCause(this, cause);
    }
    this.pendingFullUpdate = true;
    const promise = this.ensurePendingUpdate();
    queueJob(runner, { phase: 'update', id: this.updateId });
    return promise;
  }

  private queuePropertyUpdate(
    name: string,
    value: unknown,
    cause?: GluonRenderCause,
  ): Promise<void> {
    const runner = this.renderEffect;
    if (!this.connected || !runner) return this.updatePromise;
    if (compiledDevelopment !== false && isDevelopmentEnabled()) {
      if (cause) recordElementRenderCause(this, cause);
    }
    if (this.pendingPropertyUpdate === undefined) this.pendingPropertyUpdate = name;
    else if (this.pendingPropertyUpdate !== name) this.pendingFullUpdate = true;
    this.pendingPropertyValue = value;
    const promise = this.ensurePendingUpdate();
    /* v8 ignore next -- the production compiler path is covered by the built Vite integration. */
    if (
      compiledDevelopment === false
      && !this.pendingFullUpdate
      && this.connectionRendered
      && this[compiledTextBinding]?.property === name
      && this.beforeUpdateHooks.length === 0
      && this.updatedHooks.length === 0
    ) {
      const job = this.compiledPropertyUpdateJob ??= () => this.performCompiledPropertyUpdate();
      queueJob(job, { phase: 'update', id: this.updateId });
    } else {
      queueJob(runner, { phase: 'update', id: this.updateId });
    }
    return promise;
  }

  /* v8 ignore next -- exercised in the production Vite integration and comparative browser build. */
  private performCompiledPropertyUpdate(): void {
    if (!this.connected) return;
    const runner = this.renderEffect;
    const property = this.pendingPropertyUpdate;
    const value = this.pendingPropertyValue;
    const binding = this[compiledTextBinding];
    if (
      !runner
      || this.pendingFullUpdate
      || this.hydrationPending
      || !this.connectionRendered
      || !property
      || binding?.property !== property
      || this.beforeUpdateHooks.length > 0
      || this.updatedHooks.length > 0
    ) {
      if (runner) queueJob(runner, { phase: 'update', id: this.updateId });
      return;
    }

    const deferred = this.pendingUpdate ?? createUpdateDeferred();
    if (!this.pendingUpdate) this.updatePromise = deferred.promise;
    this.pendingUpdate = undefined;
    this.pendingPropertyUpdate = undefined;
    this.pendingPropertyValue = undefined;
    try {
      if (!updateCompiledPrimitiveTextBinding(this.renderRoot, binding.index, value)) {
        this.pendingUpdate = deferred;
        this.pendingPropertyUpdate = property;
        this.pendingPropertyValue = value;
        this.pendingFullUpdate = true;
        runner();
        return;
      }
      deferred.resolve();
    } catch (error) {
      deferred.reject(error);
      this.handleComponentError(error, 'render');
    }
  }

  private performUpdate(): void {
    const deferred = this.pendingUpdate ?? createUpdateDeferred();
    if (!this.pendingUpdate) this.updatePromise = deferred.promise;
    this.pendingUpdate = undefined;
    this.pendingPropertyUpdate = undefined;
    this.pendingPropertyValue = undefined;
    this.pendingFullUpdate = false;

    if (compiledDevelopment !== false && isDevelopmentEnabled()) {
      performElementUpdateWithDiagnostics(this, () => this.commitUpdate(deferred));
      return;
    }
    this.commitUpdate(deferred);
  }

  private commitUpdate(deferred: UpdateDeferred): void {
    try {
      if (this.hydrationPending) {
        deferred.resolve();
        return;
      }
      if (this.connectionRendered) this.invokeLifecycle(this.beforeUpdateHooks);
      this.releaseCompiledPrimitiveTextBinding();
      this.runOwned(() => this.update());
      if (!this.connectionRendered) {
        this.validateDeclaredSlots();
        this.connectionRendered = true;
        this.invokeLifecycle(this.connectedHooks);
      }
      this.invokeLifecycle(this.updatedHooks);
      deferred.resolve();
    } catch (error) {
      deferred.reject(error);
      throw error;
    }
  }

  private ensurePendingUpdate(): Promise<void> {
    if (!this.pendingUpdate) {
      this.pendingUpdate = createUpdateDeferred();
      this.updatePromise = this.pendingUpdate.promise;
    }
    return this.pendingUpdate.promise;
  }

  private resolvePendingUpdate(): void {
    this.pendingUpdate?.resolve();
    this.pendingUpdate = undefined;
    this.pendingPropertyUpdate = undefined;
    this.pendingPropertyValue = undefined;
    this.pendingFullUpdate = false;
    this.updatePromise = Promise.resolve();
  }

  private releaseCompiledPrimitiveTextBinding(): void {
    this[compiledTextBinding] = undefined;
  }

  private runOwned<Result>(callback: () => Result): Result {
    const reportError = this.componentErrorReporter ??= this.createComponentErrorReporter();
    return runWithApplicationContext(
      this.applicationContext,
      this,
      reportError,
      callback,
    );
  }

  private invokeLifecycle(callbacks: readonly ComponentLifecycleCallback[]): void {
    for (const callback of callbacks) {
      const reportError = this.componentErrorReporter ??= this.createComponentErrorReporter();
      try {
        const result = runWithApplicationContext(
          this.applicationContext,
          this,
          reportError,
          callback,
        );
        if (isPromiseLike(result)) {
          void Promise.resolve(result).catch((error: unknown) => {
            reportError(error, 'lifecycle');
          });
        }
      } catch (error) {
        reportError(error, 'lifecycle');
      }
    }
  }

  private reportReactiveError(errorContext: ReactivityErrorContext): void {
    const source: AppErrorSource = errorContext.source === this.renderEffect
      ? 'render'
      : errorContext.phase === 'cleanup'
        ? 'lifecycle'
        : 'effect';
    this.handleComponentError(errorContext.error, source);
  }

  private handleComponentError(error: unknown, source: AppErrorSource): void {
    (this.componentErrorReporter ??= this.createComponentErrorReporter())(error, source);
  }

  private createComponentErrorReporter(): ComponentErrorReporter {
    const applicationContext = this.applicationContext;
    const boundaries: CapturedComponentBoundary[] = [];
    let current = getComposedParent(this);
    while (current) {
      if (current instanceof GluonElement && current.errorBoundaries.length > 0) {
        boundaries.push({
          element: current,
          context: current.applicationContext ?? applicationContext,
          callbacks: [...current.errorBoundaries],
        });
      }
      current = getComposedParent(current);
    }

    return (error, source) => {
      for (const captured of boundaries) {
        for (const boundary of captured.callbacks) {
          try {
            const handled = runWithApplicationContext(
              captured.context,
              captured.element,
              (boundaryError) => reportApplicationError(
                applicationContext,
                boundaryError,
                'application',
                captured.element,
              ),
              () => boundary({ error, source, element: this }),
            );
            if (handled === true) return;
          } catch (boundaryError) {
            reportApplicationError(
              applicationContext,
              boundaryError,
              'application',
              captured.element,
            );
          }
        }
      }
      reportApplicationError(applicationContext, error, source, this);
    };
  }

  private hasAncestorErrorBoundary(): boolean {
    let current = getComposedParent(this);
    while (current) {
      if (current instanceof GluonElement && current.errorBoundaries.length > 0) return true;
      current = getComposedParent(current);
    }
    return false;
  }

  private validateDeclaredProperties(): void {
    const declarations = getDeclarations(this.constructor as GluonElementConstructor);
    for (const [name, definition] of Object.entries(declarations)) {
      const declaration = normalizeDeclaration(definition);
      if (declaration.required && !this.providedProperties.has(name)) {
        reportApplicationWarning(
          this.applicationContext,
          `Required property "${name}" is missing on ${this.localName}.`,
          'GLUON_PROP_REQUIRED',
          this,
        );
      }
      if (declaration.validate && this[propertyValues].has(name)) {
        this.validateContractValue(
          'property',
          name,
          this[propertyValues].get(name),
          declaration.validate,
        );
      }
    }
  }

  private validateDeclaredSlots(): void {
    const declarations = getSlotDeclarations(this.constructor as GluonElementConstructor);
    const slots = [...this.renderRoot.querySelectorAll('slot')];
    for (const [name, declaration] of Object.entries(declarations)) {
      if (!declaration?.required) continue;
      const slotName = name === 'default' ? '' : name;
      const assigned = slots
        .filter((slot) => (slot.getAttribute('name') ?? '') === slotName)
        .some((slot) => slot.assignedNodes().length > 0);
      if (!assigned) {
        reportApplicationWarning(
          this.applicationContext,
          `Required slot "${name}" is empty on ${this.localName}.`,
          'GLUON_SLOT_REQUIRED',
          this,
        );
      }
    }
  }

  private validateContractValue<Value>(
    kind: 'property' | 'event',
    name: string,
    value: Value,
    validator: (value: Value) => boolean | string,
  ): void {
    try {
      const result = validator(value);
      if (result === true) return;
      reportApplicationWarning(
        this.applicationContext,
        typeof result === 'string'
          ? result
          : `Invalid ${kind} value for "${name}" on ${this.localName}.`,
        kind === 'property' ? 'GLUON_PROP_INVALID' : 'GLUON_EVENT_INVALID',
        this,
      );
    } catch (error) {
      reportApplicationError(this.applicationContext, error, 'application', this);
    }
  }

  private capturePreUpgradeProperties(constructor: GluonElementConstructor): void {
    const declarations = getDeclarations(constructor);
    for (const [name, definition] of Object.entries(declarations)) {
      if (!Object.prototype.hasOwnProperty.call(this, name)) continue;
      const value = (this as unknown as Record<string, unknown>)[name];
      delete (this as unknown as Record<string, unknown>)[name];
      const declaration = normalizeDeclaration(definition);
      const attribute = getAttributeName(name, declaration);
      if (attribute && this.hasAttribute(attribute)) {
        this.initialAttributePrecedence.set(attribute, this.getAttribute(attribute)!);
      }
      this[setProperty](name, value, declaration);
    }
  }

  private applyPropertyDefaults(constructor: GluonElementConstructor): void {
    for (const [name, definition] of Object.entries(getDeclarations(constructor))) {
      if (this[propertyValues].has(name)) continue;
      const declaration = normalizeDeclaration(definition);
      if (!('default' in declaration)) continue;
      const defaultValue = typeof declaration.default === 'function'
        ? (declaration.default as () => unknown)()
        : declaration.default;
      this[propertyValues].set(name, defaultValue);
    }
  }

  private reflectCurrentProperties(): void {
    const declarations = getDeclarations(this.constructor as GluonElementConstructor);
    for (const [name, definition] of Object.entries(declarations)) {
      const declaration = normalizeDeclaration(definition);
      if (!declaration.reflect || !this[propertyValues].has(name)) continue;
      this.reflectProperty(name, this[propertyValues].get(name), declaration);
    }
  }

  private reflectProperty(
    name: string,
    value: unknown,
    declaration: PropertyDeclaration,
  ): void {
    const attribute = getAttributeName(name, declaration);
    if (!attribute) return;

    const converted = declaration.converter?.toAttribute
      ? declaration.converter.toAttribute(value, declaration.type)
      : toAttribute(value, declaration.type);

    this.reflectingAttribute = attribute;
    try {
      if (converted == null) this.removeAttribute(attribute);
      else this.setAttribute(attribute, converted);
    } finally {
      this.reflectingAttribute = undefined;
    }
  }
}

function createUpdateDeferred(): UpdateDeferred {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function getElementRenderDebugState(element: GluonElement<any>): ElementRenderDebugState {
  const states = elementRenderDebugStates!;
  let state = states.get(element);
  if (!state) {
    state = { causes: [] };
    states.set(element, state);
  }
  return state;
}

function recordElementRenderCause(element: GluonElement<any>, cause: GluonRenderCause): void {
  if (renderDebugHook) getElementRenderDebugState(element).causes.push(cause);
}

function performElementUpdateWithDiagnostics(
  element: GluonElement<any>,
  update: () => void,
): void {
  const state = getElementRenderDebugState(element);
  const causes = Object.freeze([...state.causes]);
  state.causes.length = 0;
  const dependencies: EffectDebuggerEvent[] = [];
  state.dependencies = dependencies;
  const startedAt = performance.now();
  let failed = false;
  let renderError: unknown;
  try {
    update();
  } catch (error) {
    failed = true;
    renderError = error;
    throw error;
  } finally {
    const endedAt = performance.now();
    state.dependencies = undefined;
    emitRenderDebugEvent({
      element,
      causes,
      dependencies: Object.freeze([...dependencies]),
      startedAt,
      endedAt,
      duration: endedAt - startedAt,
      failed,
      ...(failed ? { error: renderError } : {}),
    });
  }
}

function emitRenderDebugEvent(event: GluonRenderDebugEvent): void {
  const hook = renderDebugHook;
  if (!isDevelopmentEnabled() || !hook) return;
  try {
    hook(Object.freeze(event));
  } catch (error) {
    reportDebugHookError(error);
  }
}

function reportDebugHookError(error: unknown): void {
  const environment = globalThis as {
    reportError?: (reason: unknown) => void;
    console?: { error?: (...values: unknown[]) => void };
  };
  try {
    if (typeof environment.reportError === 'function') environment.reportError(error);
    else environment.console?.error?.(error);
  } catch {
    // A development observer cannot turn a completed render into an application failure.
  }
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === 'object' && value !== null) || typeof value === 'function'
  ) && typeof Reflect.get(value, 'then') === 'function';
}

function getComposedParent(node: Node): Node | null {
  if (node.parentNode) return node.parentNode;
  return node instanceof ShadowRoot ? node.host : null;
}

export function getPublicInstance<Public extends object>(
  element: GluonElement<any>,
): Readonly<Public> | undefined {
  return element[publicInstance] as Readonly<Public> | undefined;
}

export type ValueRefTarget<Value> =
  | { value: Value | undefined }
  | ((value: Value | undefined) => void);

export function exposedRef<Public extends object>(
  target: ValueRefTarget<Readonly<Public>>,
): RefTarget<GluonElement<any>> {
  let currentElement: GluonElement<any> | undefined;
  let attached = false;
  const publish = (value: Readonly<Public> | undefined): void => {
    if (typeof target === 'function') target(value);
    else target.value = value;
    attached = value !== undefined;
  };
  return (element) => {
    currentElement = element;
    if (!element) {
      if (attached) publish(undefined);
      return;
    }
    const resolve = (): void => {
      if (currentElement !== element) return;
      const value = getPublicInstance<Public>(element);
      if (value !== undefined) publish(value);
    };
    resolve();
    if (!attached) {
      const registry = getNodeCustomElementRegistry(element);
      void (registry?.whenDefined(element.localName) ?? Promise.resolve()).then(() => {
        queueMicrotask(resolve);
      });
    }
  };
}

export type GluonElementClass<ElementType extends GluonElement<any> = GluonElement<any>> = {
  new (): ElementType;
  readonly prototype: ElementType;
  readonly properties?: Readonly<Record<string, PropertyDefinition<any>>>;
  readonly events?: Readonly<Record<string, EventDeclaration<any>>>;
  readonly slots?: SlotDeclarations;
  readonly styles?: CSSStyleSheet | readonly CSSStyleSheet[];
  readonly shadowRootRegistry?: GluonElementRegistry;
};

export interface DefineElementOptions {
  /** Registration target; omitting it preserves the global browser registry and server default. */
  readonly registry?: GluonElementDefinitionRegistry;
}

export function defineElement<Constructor extends GluonElementClass>(
  tagName: `${string}-${string}`,
  constructor: Constructor,
  options: DefineElementOptions = {},
): Constructor {
  const registry = options.registry
    ?? (globalThis as { customElements?: CustomElementRegistry }).customElements;
  const identity = (registry ?? defaultRegistryIdentity) as object;
  const names = definedElementNames.get(constructor);
  const constructorTag = names?.get(identity);
  if (constructorTag && constructorTag !== tagName) {
    throw new Error(`Custom element constructor is already registered as "${constructorTag}".`);
  }
  const existing = registry
    ? getRegistryDefinition(registry, tagName)
    : serverElementDefinitions.get(tagName);
  if (existing && existing !== constructor) {
    throw new Error(`Custom element "${tagName}" is already defined with another constructor.`);
  }
  if (!existing) {
    if (registry) defineRegistryElement(registry, tagName, constructor);
    else serverElementDefinitions.set(tagName, constructor);
  }
  const nextNames = names ?? new Map<object, `${string}-${string}`>();
  nextNames.set(identity, tagName);
  if (!names) definedElementNames.set(constructor, nextNames);
  return constructor;
}

export interface GluonElementServerRender {
  readonly tagName: `${string}-${string}`;
  readonly template: TemplateResult;
  readonly scopedRegistry: boolean;
}

export interface GluonElementServerRenderOptions {
  readonly registry?: GluonElementDefinitionRegistry;
}

/** Instantiates one registered element definition without connecting it to a DOM. */
export function renderGluonElementForServer<Constructor extends GluonElementClass>(
  constructor: Constructor,
  properties: Readonly<Record<string, unknown>> = {},
  options: GluonElementServerRenderOptions = {},
): GluonElementServerRender {
  const identity = (options.registry ?? defaultRegistryIdentity) as object;
  const names = definedElementNames.get(constructor);
  const tagName = names?.get(identity) ?? (names?.size === 1 ? names.values().next().value : undefined);
  if (!tagName) throw new Error('Server-rendered Gluon elements must be registered with defineElement().');
  const element = new constructor();
  Object.assign(element, properties);
  return Object.freeze({
    tagName,
    template: element.renderForServer(),
    scopedRegistry: Boolean(constructor.shadowRootRegistry?.requestedScoped),
  });
}

export interface GluonElementHotUpdateResult<Constructor extends GluonElementClass> {
  readonly compatible: boolean;
  readonly constructor: Constructor;
  readonly reason?: string;
}

/**
 * Registers the first Custom Element constructor and patches its compatible
 * prototype on later Vite evaluations. Application code should use
 * `defineElement()`; this entry point belongs to the official Vite integration.
 */
export function applyGluonElementHotUpdate<Constructor extends GluonElementClass>(
  tagName: `${string}-${string}`,
  next: Constructor,
  options: DefineElementOptions = {},
): GluonElementHotUpdateResult<Constructor> {
  const registry = options.registry ?? customElements;
  const identity = registry as object;
  let definitions = hotElementDefinitions.get(identity);
  const recorded = definitions?.get(tagName);
  if (!recorded) {
    const registered = getRegistryDefinition(registry, tagName);
    if (registered && registered !== next) {
      throw new Error(`Custom element "${tagName}" is already defined outside Gluon HMR.`);
    }
    if (!registered) defineRegistryElement(registry, tagName, next);
    definitions ??= new Map();
    definitions.set(tagName, next as GluonElementConstructor);
    hotElementDefinitions.set(identity, definitions);
    return Object.freeze({ compatible: true, constructor: next });
  }

  const reason = getHotUpdateIncompatibility(recorded, next as GluonElementConstructor);
  if (reason) {
    return Object.freeze({
      compatible: false,
      constructor: recorded as Constructor,
      reason,
    });
  }

  patchHotElementConstructor(recorded, next as GluonElementConstructor);
  for (const element of connectedElements) {
    if (recorded.prototype.isPrototypeOf(element)) void element.requestHotUpdate();
  }
  return Object.freeze({ compatible: true, constructor: recorded as Constructor });
}

/** Requests a render pass for all currently connected Gluon elements. */
export function refreshGluonElements(): void {
  for (const element of connectedElements) void element.requestHotUpdate();
}

function getHotUpdateIncompatibility(
  current: GluonElementConstructor,
  next: GluonElementConstructor,
): string | undefined {
  if (Object.getPrototypeOf(current) !== Object.getPrototypeOf(next)) {
    return 'the Custom Element superclass changed';
  }
  const currentFormAssociated = Reflect.get(current, 'formAssociated');
  const nextFormAssociated = Reflect.get(next, 'formAssociated');
  if (currentFormAssociated !== nextFormAssociated) {
    return 'the form-associated contract changed';
  }
  if (hotPropertySchema(current) !== hotPropertySchema(next)) {
    return 'the public property or attribute schema changed';
  }
  if (hotEventSchema(current) !== hotEventSchema(next)) {
    return 'the public event schema changed';
  }
  if (hotSlotSchema(current) !== hotSlotSchema(next)) {
    return 'the public slot schema changed';
  }
  if (normalizeStyleList(current.styles).length !== normalizeStyleList(next.styles).length) {
    return 'the number of adopted component stylesheets changed';
  }
  return undefined;
}

function hotEventSchema(constructor: GluonElementConstructor): string {
  return JSON.stringify(Object.entries(getEventDeclarations(constructor))
    .map(([name, declaration]) => [
      name,
      declaration?.bubbles ?? true,
      declaration?.composed ?? true,
      declaration?.cancelable ?? false,
    ])
    .sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function hotSlotSchema(constructor: GluonElementConstructor): string {
  return JSON.stringify(Object.entries(getSlotDeclarations(constructor))
    .map(([name, declaration]) => [
      name,
      declaration?.required ?? false,
      declaration?.fallback ?? false,
    ])
    .sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function hotPropertySchema(constructor: GluonElementConstructor): string {
  return JSON.stringify(Object.entries(getDeclarations(constructor))
    .map(([name, definition]) => {
      const declaration = normalizeDeclaration(definition);
      return [
        name,
        getAttributeName(name, declaration) ?? null,
        declaration.type?.name ?? null,
        declaration.reflect ?? false,
        declaration.required ?? false,
      ];
    })
    .sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function patchHotElementConstructor(
  current: GluonElementConstructor,
  next: GluonElementConstructor,
): void {
  const declarationNames = new Set(Object.keys(getDeclarations(current)));
  const nextPrototypeKeys = new Set(Reflect.ownKeys(next.prototype));
  for (const key of Reflect.ownKeys(current.prototype)) {
    if (key === 'constructor' || declarationNames.has(String(key))) continue;
    if (!nextPrototypeKeys.has(key)) Reflect.deleteProperty(current.prototype, key);
  }
  for (const key of nextPrototypeKeys) {
    if (key === 'constructor') continue;
    const descriptor = Object.getOwnPropertyDescriptor(next.prototype, key);
    if (descriptor) Object.defineProperty(current.prototype, key, descriptor);
  }

  const stableStyles = synchronizeHotStyles(
    normalizeStyleList(current.styles),
    normalizeStyleList(next.styles),
  );
  for (const key of Reflect.ownKeys(next)) {
    if (key === 'length' || key === 'name' || key === 'prototype' || key === 'styles') continue;
    const descriptor = Object.getOwnPropertyDescriptor(next, key);
    if (descriptor) Object.defineProperty(current, key, descriptor);
  }
  synchronizeLegacyDecoratorProperties(current, next);
  Object.defineProperty(current, 'styles', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: stableStyles,
  });

  for (const name of declarationNames) {
    const descriptor = Object.getOwnPropertyDescriptor(current.prototype, name);
    if (descriptor?.get && descriptor.set) Reflect.deleteProperty(current.prototype, name);
  }
  finalizedConstructors.delete(current);
  declarationCache.delete(current);
  styleCache.delete(current);
  eventDeclarationCache.delete(current);
  slotDeclarationCache.delete(current);
  finalizeProperties(current);
}

function normalizeStyleList(
  styles: CSSStyleSheet | readonly CSSStyleSheet[] | undefined,
): readonly CSSStyleSheet[] {
  if (!styles) return [];
  return styles instanceof CSSStyleSheet ? [styles] : styles;
}

function synchronizeHotStyles(
  current: readonly CSSStyleSheet[],
  next: readonly CSSStyleSheet[],
): CSSStyleSheet | readonly CSSStyleSheet[] {
  if (current.length !== next.length) return next;
  for (let index = 0; index < current.length; index += 1) {
    const stable = current[index]!;
    const replacement = next[index]!;
    if (stable === replacement) continue;
    stable.replaceSync([...replacement.cssRules].map((rule) => rule.cssText).join('\n'));
  }
  return current.length === 1 ? current[0]! : current;
}

function finalizeProperties(constructor: GluonElementConstructor): void {
  if (finalizedConstructors.has(constructor)) return;
  const parent = Object.getPrototypeOf(constructor) as GluonElementConstructor | undefined;
  if (parent?.prototype instanceof GluonElement) finalizeProperties(parent);

  for (const [name, definition] of Object.entries(getDeclarations(constructor))) {
    if (Object.getOwnPropertyDescriptor(constructor.prototype, name)
      && !hasOwnDecoratedProperty(constructor, name)) continue;
    const declaration = normalizeDeclaration(definition);
    Object.defineProperty(constructor.prototype, name, {
      configurable: true,
      enumerable: true,
      get(this: GluonElement) {
        return this[propertyValues].get(name);
      },
      set(this: GluonElement, value: unknown) {
        this[setProperty](name, value, declaration);
      },
    });
  }

  finalizedConstructors.add(constructor);
}

function getDeclarations(constructor: GluonElementConstructor): PropertyDeclarations {
  const cached = declarationCache.get(constructor);
  if (cached) return cached;
  const parent = Object.getPrototypeOf(constructor) as GluonElementConstructor | undefined;
  const ownProperties = Object.prototype.hasOwnProperty.call(constructor, 'properties')
    ? constructor.properties
    : undefined;
  const declarations = {
    ...(parent?.prototype instanceof GluonElement ? getDeclarations(parent) : {}),
    ...(ownProperties ?? {}),
    ...getOwnDecoratedProperties(constructor),
  };
  declarationCache.set(constructor, declarations);
  return declarations;
}

function getStyles(constructor: GluonElementConstructor): readonly CSSStyleSheet[] {
  const cached = styleCache.get(constructor);
  if (cached) return cached;
  const parent = Object.getPrototypeOf(constructor) as GluonElementConstructor | undefined;
  const inherited = parent?.prototype instanceof GluonElement ? getStyles(parent) : [];
  const ownStyles = Array.isArray(constructor.styles)
    ? constructor.styles
    : constructor.styles
      ? [constructor.styles]
      : [];
  const styles = [...new Set([...inherited, ...ownStyles])];
  styleCache.set(constructor, styles);
  return styles;
}

function getEventDeclarations(constructor: GluonElementConstructor): EventDeclarations {
  const cached = eventDeclarationCache.get(constructor);
  if (cached) return cached;
  const parent = Object.getPrototypeOf(constructor) as GluonElementConstructor | undefined;
  const declarations = {
    ...(parent?.prototype instanceof GluonElement ? getEventDeclarations(parent) : {}),
    ...(constructor.events ?? {}),
  } satisfies EventDeclarations;
  eventDeclarationCache.set(constructor, declarations);
  return declarations;
}

function getSlotDeclarations(constructor: GluonElementConstructor): SlotDeclarations {
  const cached = slotDeclarationCache.get(constructor);
  if (cached) return cached;
  const parent = Object.getPrototypeOf(constructor) as GluonElementConstructor | undefined;
  const declarations = {
    ...(parent?.prototype instanceof GluonElement ? getSlotDeclarations(parent) : {}),
    ...(constructor.slots ?? {}),
  } satisfies SlotDeclarations;
  slotDeclarationCache.set(constructor, declarations);
  return declarations;
}

function normalizeDeclaration(definition: PropertyDefinition): PropertyDeclaration {
  return typeof definition === 'function' ? { type: definition } : definition;
}

function getAttributeName(
  property: string,
  declaration: PropertyDeclaration,
): string | undefined {
  if (declaration.attribute === false) return undefined;
  if (typeof declaration.attribute === 'string') return declaration.attribute;
  return property.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
}

function fromAttribute(value: string | null, type?: PropertyType): unknown {
  if (type === Boolean) return value !== null;
  if (type === Number) return value === null ? null : Number(value);
  if (type === Object || type === Array) {
    if (value === null) return null;
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }
  return value;
}

function toAttribute(value: unknown, type?: PropertyType): string | null {
  if (type === Boolean) return value ? '' : null;
  if (value == null) return null;
  if (type === Object || type === Array) return JSON.stringify(value);
  return String(value);
}
