import type { GluonElementClass, PropertyDefinition } from './element.js';

type DecoratedDeclarations = Readonly<Record<string, PropertyDefinition<any>>>;

const symbolWithMetadata = Symbol as SymbolConstructor & { metadata?: symbol };
export const decoratorMetadataSymbol = symbolWithMetadata.metadata ??= Symbol('Symbol.metadata');

const standardDeclarations = new WeakMap<object, Map<string, PropertyDefinition<any>>>();
const legacyDeclarations = new WeakMap<Function, Map<string, PropertyDefinition<any>>>();

export function recordStandardProperty(
  metadata: object,
  name: string,
  definition: PropertyDefinition<any>,
): void {
  let declarations = standardDeclarations.get(metadata);
  if (!declarations) {
    declarations = new Map();
    standardDeclarations.set(metadata, declarations);
  }
  declarations.set(name, definition);
}

export function recordLegacyProperty(
  constructor: GluonElementClass,
  name: string,
  definition: PropertyDefinition<any>,
): void {
  let declarations = legacyDeclarations.get(constructor);
  if (!declarations) {
    declarations = new Map();
    legacyDeclarations.set(constructor, declarations);
  }
  declarations.set(name, definition);
}

export function getOwnDecoratedProperties(
  constructor: GluonElementClass,
): DecoratedDeclarations {
  const declarations: Record<string, PropertyDefinition<any>> = {};
  for (const [name, definition] of legacyDeclarations.get(constructor) ?? []) {
    declarations[name] = definition;
  }
  const metadata = ownDecoratorMetadata(constructor);
  for (const [name, definition] of metadata ? standardDeclarations.get(metadata) ?? [] : []) {
    declarations[name] = definition;
  }
  return declarations;
}

export function hasOwnDecoratedProperty(
  constructor: GluonElementClass,
  name: string,
): boolean {
  if (legacyDeclarations.get(constructor)?.has(name)) return true;
  const metadata = ownDecoratorMetadata(constructor);
  return metadata ? standardDeclarations.get(metadata)?.has(name) === true : false;
}

export function synchronizeLegacyDecoratorProperties(
  current: GluonElementClass,
  next: GluonElementClass,
): void {
  const declarations = legacyDeclarations.get(next);
  if (declarations) legacyDeclarations.set(current, new Map(declarations));
  else legacyDeclarations.delete(current);
}

function ownDecoratorMetadata(constructor: GluonElementClass): object | undefined {
  if (!Object.prototype.hasOwnProperty.call(constructor, decoratorMetadataSymbol)) return undefined;
  const metadata = Reflect.get(constructor, decoratorMetadataSymbol);
  return metadata && typeof metadata === 'object' ? metadata : undefined;
}
