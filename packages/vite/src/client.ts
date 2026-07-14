import {
  applyGluonElementHotUpdate,
  refreshGluonApplications,
  refreshGluonElements,
  type GluonElementClass,
} from '@gluonjs/core';

interface HotContext {
  invalidate(message?: string): void;
}

interface StoreManagerLike {
  hotUpdate(definition: StoreDefinitionLike, metadata?: Readonly<Record<string, unknown>>): unknown;
  use(definition: StoreDefinitionLike): unknown;
}

interface StoreDefinitionLike {
  readonly id: string;
  readonly options: unknown;
  use(manager: StoreManagerLike): unknown;
}

interface ComponentRecord {
  current: Function;
  readonly stable: Function;
}

interface StoreRecord {
  current: StoreDefinitionLike;
  readonly managers: Set<StoreManagerLike>;
  readonly stable: StoreDefinitionLike;
}

interface ElementRecord {
  readonly constructor: GluonElementClass;
  readonly signature: string;
  readonly tagName: `${string}-${string}`;
}

interface FunctionalElementDefinitionLike {
  readonly tagName: `${string}-${string}`;
}

const componentRecords = new Map<string, ComponentRecord>();
const elementRecords = new Map<string, ElementRecord>();
const storeRecords = new Map<string, StoreRecord>();
const styleRecords = new Map<string, CSSStyleSheet>();

export function component<Implementation extends Function>(
  next: Implementation,
  moduleId: string,
  key: string,
): Implementation {
  const id = recordId(moduleId, key);
  const existing = componentRecords.get(id);
  if (existing) {
    existing.current = next;
    return existing.stable as Implementation;
  }
  const record = {} as ComponentRecord;
  const stable = function hotComponent(this: unknown, ...args: unknown[]) {
    return Reflect.apply(record.current, this, args);
  };
  Object.defineProperty(stable, 'name', { configurable: true, value: next.name });
  record.current = next;
  Object.defineProperty(stable, 'displayName', {
    configurable: true,
    enumerable: true,
    get: () => Reflect.get(record.current, 'displayName'),
  });
  Object.defineProperty(stable, 'layer', {
    configurable: true,
    enumerable: true,
    get: () => Reflect.get(record.current, 'layer'),
  });
  Object.defineProperty(stable, 'styles', {
    configurable: true,
    enumerable: true,
    get: () => Reflect.get(record.current, 'styles'),
  });
  Object.defineProperty(record, 'stable', { value: stable });
  componentRecords.set(id, record);
  return stable as unknown as Implementation;
}

export function element<Constructor extends GluonElementClass>(
  _defineElement: (tagName: `${string}-${string}`, constructor: Constructor) => Constructor,
  tagName: `${string}-${string}`,
  next: Constructor,
  _moduleId: string,
  _key: string,
  initializerSignature: string,
  hot?: HotContext,
): Constructor {
  return installElement(tagName, next, _moduleId, _key, initializerSignature, hot);
}

export function elementDecorator<Constructor extends GluonElementClass>(
  _customElement: (tagName: `${string}-${string}`) => (constructor: Constructor) => Constructor | void,
  tagName: `${string}-${string}`,
  moduleId: string,
  key: string,
  initializerSignature: string,
  hot?: HotContext,
): {
  (constructor: Constructor): Constructor;
  (constructor: Constructor, context: ClassDecoratorContext<Constructor>): void;
} {
  return ((next: Constructor, context?: ClassDecoratorContext<Constructor>) => {
    if (!context) return installElement(tagName, next, moduleId, key, initializerSignature, hot);
    context.addInitializer(() => {
      installElement(tagName, next, moduleId, key, initializerSignature, hot);
    });
  }) as {
    (constructor: Constructor): Constructor;
    (constructor: Constructor, context: ClassDecoratorContext<Constructor>): void;
  };
}

export function functionalElement<Constructor extends GluonElementClass>(
  define: (
    definition: FunctionalElementDefinitionLike,
    options: { readonly register: false },
  ) => Constructor,
  definition: FunctionalElementDefinitionLike,
  moduleId: string,
  key: string,
  hot?: HotContext,
): Constructor {
  const next = define(definition, { register: false });
  return installElement(definition.tagName, next, moduleId, key, 'functional-setup-v1', hot);
}

function installElement<Constructor extends GluonElementClass>(
  tagName: `${string}-${string}`,
  next: Constructor,
  moduleId: string,
  key: string,
  initializerSignature: string,
  hot?: HotContext,
): Constructor {
  const id = recordId(moduleId, key);
  const existing = elementRecords.get(id);
  if (existing && (existing.tagName !== tagName || existing.signature !== initializerSignature)) {
    const reason = existing.tagName !== tagName
      ? `the tag name changed from ${existing.tagName} to ${tagName}`
      : 'constructor or instance-field initialization changed';
    hot?.invalidate(`Gluon HMR requires a reload: ${reason}.`);
    return existing.constructor as Constructor;
  }
  const result = applyGluonElementHotUpdate(tagName, next);
  if (!result.compatible) {
    hot?.invalidate(`Gluon HMR requires a reload for ${tagName}: ${result.reason}.`);
  }
  if (!existing) {
    elementRecords.set(id, {
      constructor: result.constructor,
      signature: initializerSignature,
      tagName,
    });
  }
  return result.constructor;
}

export function store<Definition extends StoreDefinitionLike>(
  next: Definition,
  moduleId: string,
  key: string,
): Definition {
  const id = recordId(moduleId, key);
  const existing = storeRecords.get(id);
  if (existing) {
    if (existing.current.id !== next.id) {
      throw new Error(`Gluon store HMR cannot change id "${existing.current.id}" to "${next.id}".`);
    }
    existing.current = next;
    for (const manager of existing.managers) {
      manager.hotUpdate(existing.stable, { module: moduleId });
    }
    return existing.stable as Definition;
  }

  const record = {} as StoreRecord;
  const managers = new Set<StoreManagerLike>();
  const stable: StoreDefinitionLike = {
    get id() { return record.current.id; },
    get options() { return record.current.options; },
    use(manager) {
      managers.add(manager);
      return manager.use(stable);
    },
  };
  record.current = next;
  Object.defineProperties(record, {
    managers: { value: managers },
    stable: { value: stable },
  });
  storeRecords.set(id, record);
  return stable as Definition;
}

export function style(next: CSSStyleSheet, moduleId: string, key: string): CSSStyleSheet {
  const id = recordId(moduleId, key);
  const stable = styleRecords.get(id);
  if (!stable) {
    styleRecords.set(id, next);
    return next;
  }
  stable.replaceSync([...next.cssRules].map((rule) => rule.cssText).join('\n'));
  return stable;
}

export function accept(_moduleId: string): void {
  refreshGluonApplications();
  refreshGluonElements();
}

function recordId(moduleId: string, key: string): string {
  const normalizedModuleId = moduleId.replace(/[?#].*$/, '');
  return `${normalizedModuleId}::${key}`;
}
