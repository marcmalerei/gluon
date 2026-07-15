export type GluonElementConstructor = CustomElementConstructor;
export type GluonElementDefinitionRegistry = GluonElementRegistry | CustomElementRegistry;

export interface GluonElementRegistry {
  /** The platform registry used in this runtime. It is scoped when `scoped` is true. */
  readonly platformRegistry?: CustomElementRegistry;
  /** True only when the runtime can associate an independent registry with a ShadowRoot. */
  readonly scoped: boolean;
  /** True when this handle was requested as an isolated registry, including during SSR. */
  readonly requestedScoped: boolean;
  define(name: `${string}-${string}`, constructor: GluonElementConstructor): void;
  get(name: string): GluonElementConstructor | undefined;
  whenDefined(name: string): Promise<GluonElementConstructor>;
}

export interface CreateGluonElementRegistryOptions {
  /**
   * Keeps the application functional on runtimes without native scoped registries.
   * `global` is the default; `error` rejects construction instead.
   */
  readonly fallback?: 'global' | 'error';
}

interface InitializableCustomElementRegistry extends CustomElementRegistry {
  initialize?(root: ShadowRoot): void;
}

interface RegistryAwareShadowRoot extends ShadowRoot {
  readonly customElementRegistry?: CustomElementRegistry | null;
}

let scopedRegistrySupport: boolean | undefined;

/** Detects constructable registries plus ShadowRoot association without mutating the document registry. */
export function supportsScopedCustomElementRegistries(): boolean {
  if (scopedRegistrySupport !== undefined) return scopedRegistrySupport;
  if (
    typeof document === 'undefined'
    || typeof HTMLElement === 'undefined'
    || typeof CustomElementRegistry !== 'function'
  ) {
    /* v8 ignore next -- DOM-free behavior is exercised by the SSR suite. */
    return false;
  }
  try {
    const registry = new CustomElementRegistry();
    const host = document.createElement('div');
    const root = host.attachShadow({ mode: 'open', customElementRegistry: registry });
    class ScopedRegistryProbe extends HTMLElement {}
    registry.define('gluon-scoped-registry-probe', ScopedRegistryProbe);
    root.innerHTML = '<gluon-scoped-registry-probe></gluon-scoped-registry-probe>';
    scopedRegistrySupport = (root as RegistryAwareShadowRoot).customElementRegistry === registry
      && root.firstElementChild instanceof ScopedRegistryProbe;
  } catch {
    /* v8 ignore next -- unsupported engines exercise the fallback in the browser matrix. */
    scopedRegistrySupport = false;
  }
  return scopedRegistrySupport;
}

/**
 * Creates one explicit Custom Element ownership boundary.
 *
 * Browsers with native scoped registries receive an independent platform
 * registry. Other browsers use the global registry by default, while SSR keeps
 * an isolated definition table so rendering never depends on browser globals.
 */
export function createGluonElementRegistry(
  options: CreateGluonElementRegistryOptions = {},
): GluonElementRegistry {
  const fallback = options.fallback ?? 'global';
  const browser = typeof window !== 'undefined';
  const scoped = browser && supportsScopedCustomElementRegistries();
  /* v8 ignore next 3 -- unsupported engines exercise both fallback modes in the browser matrix. */
  if (browser && !scoped && fallback === 'error') {
    throw new Error('Scoped Custom Element registries are not supported by this browser.');
  }
  const platformRegistry = scoped
    ? new CustomElementRegistry()
    : browser
      ? globalThis.customElements
      /* v8 ignore next -- the SSR suite exercises the DOM-free definition table. */
      : undefined;
  const definitions = new Map<string, GluonElementConstructor>();
  let handle!: GluonElementRegistry;
  handle = Object.freeze({
    platformRegistry,
    scoped,
    requestedScoped: true,
    define(name: `${string}-${string}`, constructor: GluonElementConstructor): void {
      const existing = platformRegistry?.get(name) ?? definitions.get(name);
      if (existing && existing !== constructor) {
        throw new Error(`Custom element "${name}" is already defined with another constructor.`);
      }
      if (!existing) {
        platformRegistry?.define(name, constructor);
        definitions.set(name, constructor);
      }
    },
    get(name: string): GluonElementConstructor | undefined {
      return platformRegistry?.get(name) ?? definitions.get(name);
    },
    whenDefined(name: string): Promise<GluonElementConstructor> {
      const existing = platformRegistry?.get(name) ?? definitions.get(name);
      if (existing) return Promise.resolve(existing);
      if (platformRegistry) return platformRegistry.whenDefined(name);
      /* v8 ignore next -- the SSR suite owns the server-only rejection contract. */
      return Promise.reject(new Error(`Custom element "${name}" is not defined in this server registry.`));
    },
  });
  return handle;
}

/** Associates a Gluon registry with a component ShadowRoot or applies the documented global fallback. */
export function createRegistryShadowRoot(
  host: HTMLElement,
  registry: GluonElementRegistry,
  options: Omit<ShadowRootInit, 'customElementRegistry'> = { mode: 'open' },
): ShadowRoot {
  const current = host.shadowRoot;
  if (current) {
    initializeRegistryShadowRoot(current, registry);
    return current;
  }
  return registry.scoped && registry.platformRegistry
    ? host.attachShadow({ ...options, customElementRegistry: registry.platformRegistry })
    : host.attachShadow(options);
}

/** Initializes a declarative ShadowRoot emitted for a scoped-registry component during hydration. */
export function initializeRegistryShadowRoot(
  root: ShadowRoot,
  registry: GluonElementRegistry,
): void {
  if (!registry.scoped || !registry.platformRegistry) return;
  const current = (root as RegistryAwareShadowRoot).customElementRegistry;
  if (current === registry.platformRegistry) return;
  if (current) {
    throw new Error('The ShadowRoot is already owned by another Custom Element registry.');
  }
  const initializable = registry.platformRegistry as InitializableCustomElementRegistry;
  if (typeof initializable.initialize !== 'function') {
    throw new Error('The browser cannot initialize a scoped registry on an existing ShadowRoot.');
  }
  initializable.initialize(root);
}

/** Resolves the registry that owns a rendered node, falling back to the document registry. */
export function getNodeCustomElementRegistry(node: Node): CustomElementRegistry | undefined {
  const root = node.getRootNode();
  if (root instanceof ShadowRoot) {
    return (root as RegistryAwareShadowRoot).customElementRegistry ?? globalThis.customElements;
  }
  return globalThis.customElements;
}

export function getRegistryDefinition(
  registry: GluonElementDefinitionRegistry,
  name: string,
): GluonElementConstructor | undefined {
  return registry.get(name);
}

export function defineRegistryElement(
  registry: GluonElementDefinitionRegistry,
  name: `${string}-${string}`,
  constructor: GluonElementConstructor,
): void {
  registry.define(name, constructor);
}
