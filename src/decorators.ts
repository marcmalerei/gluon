import {
  GluonElement,
  defineElement,
  type GluonElementClass,
  type PropertyDeclaration,
  type PropertyDefinition,
} from './element.js';
import {
  recordLegacyProperty,
  recordStandardProperty,
} from './decorator-metadata.js';

export type CustomElementDecorator = {
  <Constructor extends GluonElementClass>(constructor: Constructor): Constructor | void;
  <Constructor extends GluonElementClass>(
    constructor: Constructor,
    context: ClassDecoratorContext<Constructor>,
  ): Constructor | void;
};

export type GluonPropertyDecorator = {
  <This extends GluonElement<any>, Value>(
    value: undefined,
    context: ClassFieldDecoratorContext<This, Value>,
  ): ((initialValue: Value) => Value) | void;
  <This extends GluonElement<any>, Value>(
    target: ClassAccessorDecoratorTarget<This, Value>,
    context: ClassAccessorDecoratorContext<This, Value>,
  ): ClassAccessorDecoratorResult<This, Value> | void;
  (prototype: object, name: string | symbol): void;
};

/** Options accepted by {@link state}; internal state never uses attributes or reflection. */
export type StateDeclaration<Value = unknown> = Pick<
  PropertyDeclaration<Value>,
  'default' | 'hasChanged' | 'validate'
>;

/**
 * Registers the decorated `GluonElement` subclass with the Custom Elements registry.
 * This is the decorator equivalent of `defineElement(tagName, Constructor)`.
 */
export function customElement(tagName: `${string}-${string}`): CustomElementDecorator {
  return (<Constructor extends GluonElementClass>(
    constructor: Constructor,
    context?: ClassDecoratorContext<Constructor>,
  ): Constructor | void => {
    if (context) {
      if (context.kind !== 'class') throw new Error('@customElement() can decorate only a class.');
      context.addInitializer(() => {
        defineElement(tagName, constructor);
      });
      return;
    }
    return defineElement(tagName, constructor);
  }) as CustomElementDecorator;
}

/**
 * Declares a public reactive Gluon property on a class field or auto-accessor.
 * This is the decorator equivalent of an entry in `static properties`.
 */
export function property<Value = unknown>(
  definition: PropertyDefinition<Value> = {},
): GluonPropertyDecorator {
  return ((target: unknown, contextOrName: unknown): unknown => {
    if (isStandardPropertyContext(contextOrName)) {
      registerStandardProperty(contextOrName, definition);
      if (contextOrName.kind === 'field') {
        contextOrName.addInitializer(function replayDecoratedField(this: GluonElement<any>) {
          if (!Object.prototype.hasOwnProperty.call(this, contextOrName.name)) return;
          const initialValue = Reflect.get(this, contextOrName.name);
          Reflect.deleteProperty(this, contextOrName.name);
          if (initialValue !== undefined) Reflect.set(this, contextOrName.name, initialValue);
        });
        return (initialValue: Value): Value => initialValue;
      }
      return {
        init(this: GluonElement<any>, initialValue: Value): Value {
          if (initialValue !== undefined) Reflect.set(this, contextOrName.name, initialValue);
          return initialValue;
        },
      } satisfies ClassAccessorDecoratorResult<GluonElement<any>, Value>;
    }

    if ((typeof contextOrName !== 'string' && typeof contextOrName !== 'symbol')
      || !target || typeof target !== 'object') {
      throw new Error('@property() can decorate only an instance field or auto-accessor.');
    }
    const name = propertyName(contextOrName);
    const constructor = (target as { constructor?: unknown }).constructor;
    if (typeof constructor !== 'function' || !(constructor.prototype instanceof GluonElement)) {
      throw new Error('@property() requires a GluonElement subclass.');
    }
    recordLegacyProperty(constructor as GluonElementClass, name, definition);
  }) as GluonPropertyDecorator;
}

/** Declares reactive component-owned state without an HTML attribute transport. */
export function state<Value = unknown>(
  declaration: StateDeclaration<Value> = {},
): GluonPropertyDecorator {
  return property<Value>({ ...declaration, attribute: false, reflect: false });
}

type SupportedStandardPropertyContext =
  | ClassFieldDecoratorContext<GluonElement<any>, unknown>
  | ClassAccessorDecoratorContext<GluonElement<any>, unknown>;

function isStandardPropertyContext(value: unknown): value is SupportedStandardPropertyContext {
  return Boolean(value && typeof value === 'object' && 'kind' in value);
}

function registerStandardProperty(
  context: SupportedStandardPropertyContext,
  definition: PropertyDefinition<any>,
): void {
  if (context.kind !== 'field' && context.kind !== 'accessor') {
    throw new Error('@property() supports standard class fields and auto-accessors only.');
  }
  if (context.static) throw new Error('@property() cannot decorate a static member.');
  if (context.private) throw new Error('@property() cannot decorate a JavaScript #private member.');
  if (!context.metadata || typeof context.metadata !== 'object') {
    throw new Error('@property() requires standard decorator metadata support.');
  }
  recordStandardProperty(context.metadata, propertyName(context.name), definition);
}

function propertyName(name: string | symbol): string {
  if (typeof name !== 'string') {
    throw new Error('Gluon decorated properties require a string member name.');
  }
  return name;
}
