import {
  computed,
  effectScope,
  onScopeDispose,
  reactive,
  ref,
  watch,
  watchEffect,
  type ComputedRef,
  type EffectScope,
  type Ref,
  type WatchCallback,
  type WatchEffectCallback,
  type WatchOptions,
  type WatchSource,
  type WatchStopHandle,
} from '@gluonjs/reactivity';
import { inject, type InjectionKey } from './application.js';
import {
  GluonElement,
  defineElement,
  functionalElementPropertyChanged,
  type ComponentErrorBoundary,
  type ComponentErrorInfo,
  type ComponentLifecycleCallback,
  type EventDeclaration,
  type PropertyDeclaration,
  type PropertyDefinition,
  type SlotDeclaration,
} from './element.js';
import type { TemplateResult } from './runtime.js';
import type {
  GluonElementDefinitionRegistry,
  GluonElementRegistry,
} from './element-registry.js';

declare const elementPropertyValue: unique symbol;
declare const elementEventDetail: unique symbol;

export type ElementProperty<Value> = PropertyDeclaration<Value> & {
  readonly [elementPropertyValue]: (value: Value) => Value;
};

export type ElementEvent<Detail> = EventDeclaration<Detail> & {
  readonly [elementEventDetail]: (detail: Detail) => Detail;
};

/** Carries a structured property type into `defineGluonElement()` inference. */
export function elementProperty<Value>(
  declaration: PropertyDeclaration<Value>,
): ElementProperty<Value> {
  return declaration as ElementProperty<Value>;
}

/** Carries a native CustomEvent detail type into `defineGluonElement()` inference. */
export function elementEvent<Detail>(
  declaration: EventDeclaration<Detail> = {},
): ElementEvent<Detail> {
  return declaration as ElementEvent<Detail>;
}

type PropertyRecord = Readonly<Record<string, PropertyDefinition<any>>>;
type EventRecord = Readonly<Record<string, EventDeclaration<any>>>;
type SlotRecord = Readonly<Record<string, SlotDeclaration>>;

type DefaultValue<Definition> = Definition extends { readonly default?: infer Value }
  ? Value extends (...args: never[]) => infer Result
    ? Result
    : Exclude<Value, undefined>
  : never;

type InferredProperty<Definition> =
  Definition extends ElementProperty<infer Value> ? Value
    : Definition extends StringConstructor ? string | null
      : Definition extends NumberConstructor ? number | null
        : Definition extends BooleanConstructor ? boolean
          : Definition extends ObjectConstructor ? object | null
            : Definition extends ArrayConstructor ? unknown[] | null
              : Definition extends { readonly type?: StringConstructor }
                ? Definition extends { readonly default: unknown } ? string : string | null
                : Definition extends { readonly type?: NumberConstructor }
                  ? Definition extends { readonly default: unknown } ? number : number | null
                  : Definition extends { readonly type?: BooleanConstructor } ? boolean
                    : [DefaultValue<Definition>] extends [never] ? unknown : DefaultValue<Definition>;

export type InferElementProperties<Definitions extends PropertyRecord> = {
  -readonly [Name in keyof Definitions]: InferredProperty<Definitions[Name]>;
};

export type InferElementEvents<Definitions extends EventRecord> = {
  readonly [Name in keyof Definitions]: Definitions[Name] extends ElementEvent<infer Detail>
    ? Detail
    : unknown;
};

export interface FunctionalElementFormContext {
  readonly internals: ElementInternals | undefined;
  readonly form: HTMLFormElement | null;
  readonly labels: NodeList;
  setValue(value: string | File | FormData | null, state?: string | File | FormData | null): void;
  setValidity(flags?: ValidityStateFlags, message?: string, anchor?: HTMLElement): void;
  onDisabled(callback: (disabled: boolean) => void): void;
  onReset(callback: () => void): void;
  onRestore(callback: (state: string | File | FormData | null, mode: 'restore' | 'autocomplete') => void): void;
}

export interface FunctionalElementSetupContext<
  Props extends object,
  Events extends object,
  FormAssociated extends boolean,
> {
  readonly host: GluonElement<Events> & Props;
  readonly props: Readonly<Props>;
  readonly form: FormAssociated extends true ? FunctionalElementFormContext : undefined;
  state<Value>(key: string, initial: Value | (() => Value)): Ref<Value>;
  reactiveState<Value extends object>(key: string, initial: Value | (() => Value)): Value;
  computed<Value>(getter: () => Value): ComputedRef<Value>;
  watch<Value>(source: WatchSource<Value>, callback: WatchCallback<Value>, options?: WatchOptions): WatchStopHandle;
  watchEffect(callback: WatchEffectCallback, options?: WatchOptions): WatchStopHandle;
  onCleanup(callback: () => void): void;
  onConnected(callback: ComponentLifecycleCallback): void;
  onBeforeUpdate(callback: ComponentLifecycleCallback): void;
  onUpdated(callback: ComponentLifecycleCallback): void;
  onDisconnected(callback: ComponentLifecycleCallback): void;
  onErrorCaptured(callback: ComponentErrorBoundary): void;
  inject<Value>(key: InjectionKey<Value>): Value;
  inject<Value>(key: InjectionKey<Value>, fallback: Value): Value;
  emit<Name extends keyof Events & string>(
    name: Name,
    detail: Events[Name],
    init?: Omit<CustomEventInit<Events[Name]>, 'detail'>,
  ): boolean;
  requestUpdate(): Promise<void>;
}

export interface FunctionalElementSetupResult<Public extends object = Record<string, never>> {
  readonly render: () => TemplateResult;
  readonly expose?: Public;
}

export interface FunctionalElementDefinition<
  TagName extends `${string}-${string}`,
  Properties extends PropertyRecord,
  Events extends EventRecord,
  Slots extends SlotRecord,
  FormAssociated extends boolean,
  Public extends object,
> {
  readonly tagName: TagName;
  readonly properties?: Properties;
  readonly events?: Events;
  readonly slots?: Slots;
  readonly styles?: CSSStyleSheet | readonly CSSStyleSheet[];
  readonly formAssociated?: FormAssociated;
  readonly setup: (
    context: FunctionalElementSetupContext<
      InferElementProperties<Properties>,
      InferElementEvents<Events>,
      FormAssociated
    >,
  ) => FunctionalElementSetupResult<Public>;
}

export interface FunctionalElementFormPublic {
  readonly form: HTMLFormElement | null;
  readonly labels: NodeList;
  readonly validity: ValidityState | undefined;
  readonly validationMessage: string;
  readonly willValidate: boolean;
  checkValidity(): boolean;
  reportValidity(): boolean;
  setCustomValidity(message: string): void;
}

export type FunctionalElementInstance<
  Properties extends PropertyRecord,
  Events extends EventRecord,
  FormAssociated extends boolean,
  Public extends object,
> = GluonElement<InferElementEvents<Events>>
  & InferElementProperties<Properties>
  & Readonly<Public>
  & (FormAssociated extends true ? FunctionalElementFormPublic : object);

export type FunctionalElementClass<
  Properties extends PropertyRecord,
  Events extends EventRecord,
  FormAssociated extends boolean,
  Public extends object,
> = {
  new (): FunctionalElementInstance<Properties, Events, FormAssociated, Public>;
  readonly prototype: FunctionalElementInstance<Properties, Events, FormAssociated, Public>;
  readonly properties: Properties;
  readonly events: Events;
  readonly slots: SlotRecord;
  readonly styles: CSSStyleSheet | readonly CSSStyleSheet[];
  readonly formAssociated: FormAssociated;
};

export interface DefineGluonElementOptions {
  /** @internal The official Vite HMR bridge creates an unregistered next constructor. */
  readonly register?: boolean;
  /** Explicit registration target; the global registry remains the default. */
  readonly registry?: GluonElementDefinitionRegistry;
  /** Explicit registry associated with every instance ShadowRoot. */
  readonly shadowRootRegistry?: GluonElementRegistry;
}

interface ConnectionCallbacks {
  connected: ComponentLifecycleCallback[];
  beforeUpdate: ComponentLifecycleCallback[];
  updated: ComponentLifecycleCallback[];
  disconnected: ComponentLifecycleCallback[];
  errors: ComponentErrorBoundary[];
  formDisabled?: (disabled: boolean) => void;
  formReset?: () => void;
  formRestore?: (state: string | File | FormData | null, mode: 'restore' | 'autocomplete') => void;
}

const emptyLabels = {
  length: 0,
  item: () => null,
  forEach: () => undefined,
  entries: function* () {},
  keys: function* () {},
  values: function* () {},
  [Symbol.iterator]: function* () {},
} as unknown as NodeList;

/**
 * Defines and registers one autonomous Custom Element backed by `GluonElement`.
 * Setup runs once per connection inside the element's owned reactive scope.
 */
export function defineGluonElement<
  const TagName extends `${string}-${string}`,
  const Properties extends PropertyRecord = Record<never, never>,
  const Events extends EventRecord = Record<never, never>,
  const Slots extends SlotRecord = Record<never, never>,
  const FormAssociated extends boolean = false,
  Public extends object = Record<string, never>,
>(
  definition: FunctionalElementDefinition<
    TagName,
    Properties,
    Events,
    Slots,
    FormAssociated,
    Public
  >,
  options: DefineGluonElementOptions = {},
): FunctionalElementClass<Properties, Events, FormAssociated, Public> {
  type Props = InferElementProperties<Properties>;
  type EventsMap = InferElementEvents<Events>;

  class FunctionalGluonElement extends GluonElement<EventsMap> {
    static override readonly properties = (definition.properties ?? {}) as Properties;
    static override readonly events = (definition.events ?? {}) as Events;
    static override readonly slots = (definition.slots ?? {}) as Slots;
    static override readonly styles = definition.styles ?? [];
    static readonly formAssociated = (definition.formAssociated ?? false) as FormAssociated;
    static override readonly shadowRootRegistry = options.shadowRootRegistry;

    private readonly retainedState = new Map<string, unknown>();
    private connectionCallbacks = createConnectionCallbacks();
    private connectionRender?: () => TemplateResult;
    private setupScope?: EffectScope;
    private propsRevision?: Ref<number>;
    private refreshSetupBeforeRender = false;
    private setupRegistrationOpen = false;
    private readonly elementInternals = this.createElementInternals();

    constructor() {
      super();
      this.onConnected(() => invokeCallbacks(this.connectionCallbacks.connected));
      this.onBeforeUpdate(() => invokeCallbacks(this.connectionCallbacks.beforeUpdate));
      this.onUpdated(() => invokeCallbacks(this.connectionCallbacks.updated));
      this.onDisconnected(() => invokeCallbacks(this.connectionCallbacks.disconnected));
      this.onErrorCaptured((info) => {
        for (const callback of this.connectionCallbacks.errors) {
          if (callback(info) === true) return true;
        }
        return false;
      });
    }

    get form(): HTMLFormElement | null {
      return this.elementInternals?.form ?? null;
    }

    get labels(): NodeList {
      return this.elementInternals?.labels ?? emptyLabels;
    }

    get validity(): ValidityState | undefined {
      return this.elementInternals?.validity;
    }

    get validationMessage(): string {
      return this.elementInternals?.validationMessage ?? '';
    }

    get willValidate(): boolean {
      return this.elementInternals?.willValidate ?? false;
    }

    checkValidity(): boolean {
      return this.elementInternals?.checkValidity() ?? true;
    }

    reportValidity(): boolean {
      return this.elementInternals?.reportValidity() ?? true;
    }

    setCustomValidity(message: string): void {
      this.elementInternals?.setValidity(message ? { customError: true } : {}, message);
    }

    formDisabledCallback(disabled: boolean): void {
      this.connectionCallbacks.formDisabled?.(disabled);
    }

    formResetCallback(): void {
      this.connectionCallbacks.formReset?.();
    }

    formStateRestoreCallback(
      state: string | File | FormData | null,
      mode: 'restore' | 'autocomplete',
    ): void {
      this.connectionCallbacks.formRestore?.(state, mode);
    }

    protected override setupConnection(): void {
      this.initializeSetup();
    }

    override requestHotUpdate(): Promise<void> {
      this.refreshSetupBeforeRender = true;
      return super.requestHotUpdate();
    }

    protected override teardownConnection(): void {
      this.setupScope?.stop();
      this.setupScope = undefined;
      this.refreshSetupBeforeRender = false;
      this.connectionRender = undefined;
      this.propsRevision = undefined;
      this.connectionCallbacks = createConnectionCallbacks();
    }

    [functionalElementPropertyChanged](): void {
      if (this.propsRevision) this.propsRevision.value += 1;
    }

    protected override render(): TemplateResult {
      if (this.refreshSetupBeforeRender) {
        this.refreshSetupBeforeRender = false;
        this.initializeSetup();
      }
      if (!this.connectionRender) {
        throw new Error(`${definition.tagName} setup has no active connection owner.`);
      }
      return this.connectionRender();
    }

    private initializeSetup(): void {
      this.setupScope?.stop();
      this.connectionCallbacks = createConnectionCallbacks();
      const scope = effectScope();
      this.setupScope = scope;
      this.setupRegistrationOpen = true;
      let result: FunctionalElementSetupResult<Public> | undefined;
      try {
        result = scope.run(() => definition.setup(this.createSetupContext()));
      } finally {
        this.setupRegistrationOpen = false;
      }
      if (!result) throw new Error(`${definition.tagName} setup did not return a render contract.`);
      this.connectionRender = result.render;
      if (result.expose) this.installPublic(result.expose);
    }

    override renderForServer(): TemplateResult {
      if (this.connectionRender) return this.connectionRender();
      const scope = effectScope({ detached: true });
      try {
        return scope.run(() => {
          this.setupConnection();
          return this.render();
        })!;
      } finally {
        scope.stop();
        this.teardownConnection();
      }
    }

    private createElementInternals(): ElementInternals | undefined {
      if (!definition.formAssociated) return undefined;
      if (typeof this.attachInternals === 'function') return this.attachInternals();
      if (typeof globalThis.HTMLElement === 'function') {
        throw new Error(`${definition.tagName} requires ElementInternals for form participation.`);
      }
      return undefined;
    }

    private createSetupContext(): FunctionalElementSetupContext<Props, EventsMap, FormAssociated> {
      const form = definition.formAssociated ? this.createFormContext() : undefined;
      const propsRevision = ref(0);
      this.propsRevision = propsRevision;
      const props = new Proxy(this as unknown as Props, {
        get: (target, property, receiver) => {
          void propsRevision.value;
          return Reflect.get(target, property, receiver);
        },
        set: () => false,
      }) as Readonly<Props>;
      return Object.freeze({
        host: this as unknown as GluonElement<EventsMap> & Props,
        props,
        form,
        state: <Value>(key: string, initial: Value | (() => Value)): Ref<Value> => {
          const retained = this.retainedState.get(`ref:${key}`);
          if (retained) return retained as Ref<Value>;
          const value = typeof initial === 'function'
            ? (initial as () => Value)()
            : initial;
          const created = ref(value);
          this.retainedState.set(`ref:${key}`, created);
          return created;
        },
        reactiveState: <Value extends object>(key: string, initial: Value | (() => Value)): Value => {
          const retained = this.retainedState.get(`reactive:${key}`);
          if (retained) return retained as Value;
          const value = typeof initial === 'function'
            ? (initial as () => Value)()
            : initial;
          const created = reactive(value) as Value;
          this.retainedState.set(`reactive:${key}`, created);
          return created;
        },
        computed,
        watch,
        watchEffect,
        onCleanup: (callback: () => void) => {
          if (!onScopeDispose(callback)) {
            throw new Error(`${definition.tagName} cleanup must be registered during setup.`);
          }
        },
        onConnected: (callback: ComponentLifecycleCallback) => {
          this.assertSetupRegistration('onConnected');
          this.connectionCallbacks.connected.push(callback);
        },
        onBeforeUpdate: (callback: ComponentLifecycleCallback) => {
          this.assertSetupRegistration('onBeforeUpdate');
          this.connectionCallbacks.beforeUpdate.push(callback);
        },
        onUpdated: (callback: ComponentLifecycleCallback) => {
          this.assertSetupRegistration('onUpdated');
          this.connectionCallbacks.updated.push(callback);
        },
        onDisconnected: (callback: ComponentLifecycleCallback) => {
          this.assertSetupRegistration('onDisconnected');
          this.connectionCallbacks.disconnected.push(callback);
        },
        onErrorCaptured: (callback: ComponentErrorBoundary) => {
          this.assertSetupRegistration('onErrorCaptured');
          this.connectionCallbacks.errors.push(callback);
        },
        inject: (function <Value>(key: InjectionKey<Value>, ...fallback: [Value?]): Value {
          return fallback.length > 0 ? inject(key, fallback[0] as Value) : inject(key);
        }) as FunctionalElementSetupContext<Props, EventsMap, FormAssociated>['inject'],
        emit: <Name extends keyof EventsMap & string>(
          name: Name,
          detail: EventsMap[Name],
          init?: Omit<CustomEventInit<EventsMap[Name]>, 'detail'>,
        ) => this.emit(name, detail, init),
        requestUpdate: () => this.requestUpdate(),
      }) as unknown as FunctionalElementSetupContext<Props, EventsMap, FormAssociated>;
    }

    private createFormContext(): FunctionalElementFormContext {
      const internals = this.elementInternals;
      return Object.freeze({
        internals,
        get form() { return internals?.form ?? null; },
        get labels() { return internals?.labels ?? emptyLabels; },
        setValue: (value: string | File | FormData | null, state?: string | File | FormData | null) => {
          internals?.setFormValue(value, state);
        },
        setValidity: (flags: ValidityStateFlags = {}, message = '', anchor?: HTMLElement) => {
          internals?.setValidity(flags, message, anchor);
        },
        onDisabled: (callback: (disabled: boolean) => void) => {
          this.assertSetupRegistration('form.onDisabled');
          this.connectionCallbacks.formDisabled = callback;
        },
        onReset: (callback: () => void) => {
          this.assertSetupRegistration('form.onReset');
          this.connectionCallbacks.formReset = callback;
        },
        onRestore: (callback: (state: string | File | FormData | null, mode: 'restore' | 'autocomplete') => void) => {
          this.assertSetupRegistration('form.onRestore');
          this.connectionCallbacks.formRestore = callback;
        },
      });
    }

    private assertSetupRegistration(api: string): void {
      if (!this.setupRegistrationOpen) {
        throw new Error(`${definition.tagName} ${api} must be registered synchronously during setup.`);
      }
    }

    private installPublic(value: Public): void {
      const exposed = this.expose(value);
      for (const key of Reflect.ownKeys(exposed)) {
        const descriptor = Object.getOwnPropertyDescriptor(exposed, key);
        if (!descriptor) continue;
        if ('value' in descriptor && typeof descriptor.value === 'function') {
          Object.defineProperty(this, key, {
            configurable: true,
            enumerable: descriptor.enumerable,
            value: descriptor.value.bind(exposed),
          });
          continue;
        }
        Object.defineProperty(this, key, {
          configurable: true,
          enumerable: descriptor.enumerable,
          get: descriptor.get
            ? () => descriptor.get?.call(exposed)
            : () => Reflect.get(exposed, key, exposed),
          ...(descriptor.set
            ? { set: (next: unknown) => descriptor.set?.call(exposed, next) }
            : {}),
        });
      }
    }
  }

  const constructor = FunctionalGluonElement as unknown as FunctionalElementClass<
    Properties,
    Events,
    FormAssociated,
    Public
  >;
  if (options.register === false) return constructor;
  return defineElement(definition.tagName, constructor, { registry: options.registry }) as typeof constructor;
}

function createConnectionCallbacks(): ConnectionCallbacks {
  return {
    connected: [],
    beforeUpdate: [],
    updated: [],
    disconnected: [],
    errors: [],
  };
}

function invokeCallbacks(callbacks: readonly ComponentLifecycleCallback[]): void | PromiseLike<void> {
  const pending: PromiseLike<void>[] = [];
  for (const callback of callbacks) {
    const result = callback();
    if (result && typeof result === 'object' && typeof result.then === 'function') {
      pending.push(result);
    }
  }
  if (pending.length > 0) return Promise.all(pending).then(() => undefined);
}

export type FunctionalElementErrorInfo = ComponentErrorInfo;
