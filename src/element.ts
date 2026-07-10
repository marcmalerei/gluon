import { render, suspendRender, type TemplateResult } from './runtime.js';
import { adoptStyles } from './styles/index.js';
import {
  effect,
  effectScope,
  queueJob,
  type EffectDebuggerEvent,
  type EffectScope,
  type ReactiveEffectRunner,
} from '@gluonjs/reactivity';

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
  readonly element: GluonElement;
  readonly causes: readonly GluonRenderCause[];
  readonly dependencies: readonly EffectDebuggerEvent[];
  readonly startedAt: number;
  readonly endedAt: number;
  readonly duration: number;
  readonly failed: boolean;
  readonly error?: unknown;
}

export type GluonRenderDebugHook = (event: GluonRenderDebugEvent) => void;

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
  fromAttribute?(value: string | null, type?: PropertyType): Value;
  toAttribute?(value: Value, type?: PropertyType): string | null;
}

export interface PropertyDeclaration<Value = unknown> {
  readonly type?: PropertyType;
  readonly attribute?: string | false;
  readonly reflect?: boolean;
  readonly default?: Value | (() => Value);
  readonly converter?: PropertyConverter<Value>;
  readonly hasChanged?: (value: Value, oldValue: Value | undefined) => boolean;
}

export type PropertyDefinition<Value = unknown> = PropertyType | PropertyDeclaration<Value>;
export type PropertyDeclarations = Readonly<Record<string, PropertyDefinition>>;

type GluonElementConstructor = typeof GluonElement & {
  readonly properties?: PropertyDeclarations;
  readonly styles?: CSSStyleSheet | readonly CSSStyleSheet[];
};

const finalizedConstructors = new WeakSet<Function>();
const declarationCache = new WeakMap<Function, PropertyDeclarations>();
const styleCache = new WeakMap<Function, readonly CSSStyleSheet[]>();
const propertyValues = Symbol('gluon.property-values');
const setProperty = Symbol('gluon.set-property');
let elementUpdateSequence = 0;

interface UpdateDeferred {
  readonly promise: Promise<void>;
  readonly resolve: () => void;
  readonly reject: (reason?: unknown) => void;
}

export abstract class GluonElement extends HTMLElement {
  static readonly properties: PropertyDeclarations = {};
  static readonly styles: CSSStyleSheet | readonly CSSStyleSheet[] = [];

  protected readonly renderRoot: ShadowRoot;
  private readonly [propertyValues] = new Map<string, unknown>();
  private readonly updateId = elementUpdateSequence;
  private connected = false;
  private reflectingAttribute?: string;
  private readonly initialAttributePrecedence = new Map<string, string>();
  private renderScope?: EffectScope;
  private renderEffect?: ReactiveEffectRunner<void | undefined>;
  private pendingUpdate?: UpdateDeferred;
  private readonly pendingRenderCauses: GluonRenderCause[] = [];
  private activeRenderDependencies?: EffectDebuggerEvent[];
  private updatePromise: Promise<void> = Promise.resolve();

  constructor() {
    super();
    elementUpdateSequence += 1;
    this.renderRoot = this.createRenderRoot();
    const constructor = this.constructor as GluonElementConstructor;
    finalizeProperties(constructor);
    this.capturePreUpgradeProperties(constructor);
    this.applyPropertyDefaults(constructor);
  }

  static get observedAttributes(): string[] {
    const attributes: string[] = [];
    for (const [name, definition] of Object.entries(getDeclarations(this as GluonElementConstructor))) {
      const attribute = getAttributeName(name, normalizeDeclaration(definition));
      if (attribute) attributes.push(attribute);
    }
    return attributes;
  }

  connectedCallback(): void {
    if (this.connected) return;
    this.connected = true;
    adoptStyles(this.renderRoot, ...getStyles(this.constructor as GluonElementConstructor));
    this.reflectCurrentProperties();
    this.createRenderEffect();
    void this.queueUpdate({ type: 'connection' });
  }

  disconnectedCallback(): void {
    if (!this.connected) return;
    this.connected = false;
    const scope = this.renderScope;
    this.renderScope = undefined;
    this.renderEffect = undefined;
    try {
      scope?.stop();
    } finally {
      this.resolvePendingUpdate();
      this.pendingRenderCauses.length = 0;
      this.activeRenderDependencies = undefined;
      suspendRender(this.renderRoot);
    }
  }

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

  get updateComplete(): Promise<void> {
    return this.updatePromise;
  }

  protected createRenderRoot(): ShadowRoot {
    return this.attachShadow({ mode: 'open' });
  }

  protected requestUpdate(): Promise<void> {
    return this.queueUpdate({ type: 'request' });
  }

  protected update(): void {
    render(this.render(), this.renderRoot);
  }

  protected emit<Detail>(
    type: string,
    detail: Detail,
    init: Omit<CustomEventInit<Detail>, 'detail'> = {},
  ): boolean {
    return this.dispatchEvent(new CustomEvent(type, {
      bubbles: true,
      composed: true,
      ...init,
      detail,
    }));
  }

  protected abstract render(): TemplateResult;

  [setProperty](
    name: string,
    value: unknown,
    declaration: PropertyDeclaration,
    reflect = true,
  ): void {
    const oldValue = this[propertyValues].get(name);
    const hasChanged = declaration.hasChanged ?? defaultHasChanged;
    if (!hasChanged(value, oldValue)) return;

    this[propertyValues].set(name, value);
    if (reflect && declaration.reflect && this.connected) {
      this.reflectProperty(name, value, declaration);
    }
    void this.queueUpdate({
      type: 'property',
      name,
      value,
      oldValue,
    });
  }

  private createRenderEffect(): void {
    if (this.renderEffect) return;
    const scope = effectScope(true);
    const runner = scope.run(() => effect(
      () => scope.run(() => this.performUpdate()),
      {
        flush: 'update',
        id: this.updateId,
        lazy: true,
        onSchedule: () => {
          if (this.connected) this.ensurePendingUpdate();
        },
        onTrack: (dependency) => {
          this.activeRenderDependencies?.push(dependency);
        },
        onTrigger: (dependency) => {
          this.recordRenderCause({ type: 'reactive', dependency });
        },
      },
    ))!;
    this.renderScope = scope;
    this.renderEffect = runner;
  }

  private queueUpdate(cause: GluonRenderCause): Promise<void> {
    const runner = this.renderEffect;
    if (!this.connected || !runner) return this.updatePromise;
    this.recordRenderCause(cause);
    const promise = this.ensurePendingUpdate();
    queueJob(runner, { phase: 'update', id: this.updateId });
    return promise;
  }

  private performUpdate(): void {
    const deferred = this.pendingUpdate ?? createUpdateDeferred();
    if (!this.pendingUpdate) this.updatePromise = deferred.promise;
    this.pendingUpdate = undefined;

    const causes = Object.freeze([...this.pendingRenderCauses]);
    this.pendingRenderCauses.length = 0;
    const dependencies: EffectDebuggerEvent[] = [];
    this.activeRenderDependencies = dependencies;
    const startedAt = performance.now();
    let failed = false;
    let renderError: unknown;

    try {
      this.update();
      deferred.resolve();
    } catch (error) {
      failed = true;
      renderError = error;
      deferred.reject(error);
      throw error;
    } finally {
      const endedAt = performance.now();
      this.activeRenderDependencies = undefined;
      emitRenderDebugEvent({
        element: this,
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
    this.updatePromise = Promise.resolve();
  }

  private recordRenderCause(cause: GluonRenderCause): void {
    if (isDevelopment() && renderDebugHook) this.pendingRenderCauses.push(cause);
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

function emitRenderDebugEvent(event: GluonRenderDebugEvent): void {
  const hook = renderDebugHook;
  if (!hook || !isDevelopment()) return;
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

function isDevelopment(): boolean {
  return (
    globalThis as { process?: { env?: { NODE_ENV?: string } } }
  ).process?.env?.NODE_ENV !== 'production';
}

export type GluonElementClass<ElementType extends GluonElement = GluonElement> = {
  new (): ElementType;
} & typeof GluonElement;

export function defineElement<ElementType extends GluonElement>(
  tagName: `${string}-${string}`,
  constructor: GluonElementClass<ElementType>,
): GluonElementClass<ElementType> {
  const existing = customElements.get(tagName);
  if (existing && existing !== constructor) {
    throw new Error(`Custom element "${tagName}" is already defined with another constructor.`);
  }
  if (!existing) customElements.define(tagName, constructor);
  return constructor;
}

function finalizeProperties(constructor: GluonElementConstructor): void {
  if (finalizedConstructors.has(constructor)) return;
  const parent = Object.getPrototypeOf(constructor) as GluonElementConstructor | undefined;
  if (parent?.prototype instanceof GluonElement) finalizeProperties(parent);

  for (const [name, definition] of Object.entries(getDeclarations(constructor))) {
    if (Object.getOwnPropertyDescriptor(constructor.prototype, name)) continue;
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
  const declarations = {
    ...(parent?.prototype instanceof GluonElement ? getDeclarations(parent) : {}),
    ...(constructor.properties ?? {}),
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

function defaultHasChanged(value: unknown, oldValue: unknown): boolean {
  return !Object.is(value, oldValue);
}
