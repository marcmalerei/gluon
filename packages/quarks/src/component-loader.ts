import {
  validateComponentLibraryManifest,
  type ComponentLibraryEntry,
  type ComponentLibraryManifest,
} from './component-library.js';

export type ComponentLoadStatus = 'idle' | 'loading' | 'loaded' | 'failed';

export interface ComponentLibraryModuleResolver {
  /** Resolve only the exact public manifest entry requested by the consumer. */
  load(entry: ComponentLibraryEntry): Promise<unknown>;
}

export interface ComponentLoadResult {
  readonly entry: ComponentLibraryEntry;
  readonly value: unknown;
}

/**
 * Explicit, consumer-owned component loader. It never scans a package or
 * imports unrequested entries; a bundler-aware resolver supplies the actual
 * public module import for each manifest record.
 */
export class ComponentLibraryLoader {
  readonly #entries: ReadonlyMap<string, ComponentLibraryEntry>;
  readonly #resolver: ComponentLibraryModuleResolver;
  readonly #states = new Map<string, ComponentLoadStatus>();
  readonly #cache = new Map<string, Promise<ComponentLoadResult>>();

  constructor(manifest: ComponentLibraryManifest, resolver: ComponentLibraryModuleResolver) {
    const validation = validateComponentLibraryManifest(manifest);
    if (!validation.valid) throw new TypeError(`Invalid component-library manifest: ${validation.errors.join(' ')}`);
    this.#entries = new Map(manifest.entries.map((entry) => [entry.id, entry]));
    this.#resolver = resolver;
  }

  status(id: string): ComponentLoadStatus {
    this.#requireEntry(id);
    return this.#states.get(id) ?? 'idle';
  }

  load(id: string): Promise<ComponentLoadResult> {
    const cached = this.#cache.get(id);
    if (cached) return cached;
    const entry = this.#requireEntry(id);
    this.#states.set(id, 'loading');
    const promise = this.#load(entry, new Set());
    this.#cache.set(id, promise);
    void promise.then(
      () => this.#states.set(id, 'loaded'),
      () => { this.#states.set(id, 'failed'); this.#cache.delete(id); },
    );
    return promise;
  }

  async #load(entry: ComponentLibraryEntry, ancestors: Set<string>): Promise<ComponentLoadResult> {
    if (ancestors.has(entry.id)) throw new Error(`Component dependency cycle includes ${entry.id}.`);
    const nextAncestors = new Set(ancestors).add(entry.id);
    for (const dependency of entry.dependencies) await this.#load(this.#requireEntry(dependency), nextAncestors);
    const value = await this.#resolver.load(entry);
    if (entry.layer === 'element') this.#validateElement(entry, value);
    return { entry, value };
  }

  #requireEntry(id: string): ComponentLibraryEntry {
    const entry = this.#entries.get(id);
    if (!entry) throw new RangeError(`Unknown component-library entry: ${id}.`);
    return entry;
  }

  #validateElement(entry: ComponentLibraryEntry, value: unknown): void {
    if (typeof customElements === 'undefined') return;
    const registered = customElements.get(entry.tag!);
    if (registered && registered !== value) {
      throw new Error(`Duplicate custom-element registration for ${entry.tag}.`);
    }
  }
}

export function createComponentLibraryLoader(
  manifest: ComponentLibraryManifest,
  resolver: ComponentLibraryModuleResolver,
): ComponentLibraryLoader {
  return new ComponentLibraryLoader(manifest, resolver);
}
