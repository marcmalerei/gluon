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

export interface ComponentLibraryStyleResolver {
  /** Resolve constructable sheets for exactly one loaded public entry. */
  resolve(entry: ComponentLibraryEntry): readonly CSSStyleSheet[];
}

export interface ComponentLibraryLoaderOptions {
  /** Explicit target that owns sheets resolved by `styles`. */
  readonly styleTarget?: Document | ShadowRoot;
  /** Optional public stylesheet resolver; no styles are adopted without it. */
  readonly styles?: ComponentLibraryStyleResolver;
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
  readonly #libraryName: string;
  readonly #entries: ReadonlyMap<string, ComponentLibraryEntry>;
  readonly #resolver: ComponentLibraryModuleResolver;
  readonly #states = new Map<string, ComponentLoadStatus>();
  readonly #cache = new Map<string, Promise<ComponentLoadResult>>();
  readonly #styleTarget?: Document | ShadowRoot;
  readonly #styles?: ComponentLibraryStyleResolver;
  readonly #styleReferences = new Map<CSSStyleSheet, number>();
  readonly #installedStyles = new Set<CSSStyleSheet>();
  readonly #entryStyles = new Map<string, readonly CSSStyleSheet[]>();
  readonly #styleIdOrder: readonly string[];
  readonly #styleIdReferences = new Map<string, number>();
  readonly #entryStyleIds = new Map<string, readonly string[]>();
  #disposed = false;

  constructor(manifest: ComponentLibraryManifest, resolver: ComponentLibraryModuleResolver, options: ComponentLibraryLoaderOptions = {}) {
    const validation = validateComponentLibraryManifest(manifest);
    if (!validation.valid) throw new TypeError(`Invalid component-library manifest: ${validation.errors.join(' ')}`);
    this.#libraryName = manifest.name;
    this.#entries = new Map(manifest.entries.map((entry) => [entry.id, entry]));
    this.#styleIdOrder = [...new Set(manifest.entries.flatMap((entry) => entry.styles))];
    this.#resolver = resolver;
    this.#styleTarget = options.styleTarget;
    this.#styles = options.styles;
    if (this.#styles && !this.#styleTarget) throw new TypeError('A component-library stylesheet resolver requires a styleTarget.');
  }

  status(id: string): ComponentLoadStatus {
    this.#requireEntry(id);
    return this.#states.get(id) ?? 'idle';
  }

  load(id: string): Promise<ComponentLoadResult> {
    if (this.#disposed) throw new Error('A disposed component-library loader cannot load entries.');
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

  release(id: string): void {
    const styleIds = this.#entryStyleIds.get(id);
    if (styleIds) {
      this.#entryStyleIds.delete(id);
      for (const styleId of styleIds) {
        const count = this.#styleIdReferences.get(styleId) ?? 0;
        if (count > 1) this.#styleIdReferences.set(styleId, count - 1);
        else this.#styleIdReferences.delete(styleId);
      }
    }
    const sheets = this.#entryStyles.get(id);
    if (!sheets || !this.#styleTarget) return;
    this.#entryStyles.delete(id);
    for (const sheet of sheets) this.#releaseStyle(sheet);
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    for (const id of [...this.#entryStyleIds.keys()]) this.release(id);
    this.#cache.clear();
  }

  /** Serializable request-local style ids retained by successfully loaded entries. */
  styleSnapshot(): Readonly<{ schemaVersion: 1; library: string; styles: readonly string[] }> {
    return Object.freeze({
      schemaVersion: 1 as const,
      library: this.#libraryName,
      styles: Object.freeze(this.#styleIdOrder.filter((styleId) => this.#styleIdReferences.has(styleId))),
    });
  }

  /** Rejects a hydration handoff unless the library and ordered style ids match exactly. */
  validateStyleSnapshot(snapshot: unknown): void {
    const expected = this.styleSnapshot();
    if (!snapshot || typeof snapshot !== 'object') throw new TypeError('Component-library style snapshot must be an object.');
    const candidate = snapshot as Partial<typeof expected>;
    if (candidate.schemaVersion !== 1) throw new Error('Component-library style snapshot schemaVersion must be 1.');
    if (candidate.library !== expected.library) throw new Error(`Component-library style snapshot library must be ${expected.library}.`);
    if (!Array.isArray(candidate.styles) || candidate.styles.some((styleId) => typeof styleId !== 'string')) {
      throw new TypeError('Component-library style snapshot styles must be a string array.');
    }
    if (candidate.styles.length !== expected.styles.length || candidate.styles.some((styleId, index) => styleId !== expected.styles[index])) {
      throw new Error('Component-library style snapshot does not match the loaded style ids.');
    }
  }

  async #load(entry: ComponentLibraryEntry, ancestors: Set<string>): Promise<ComponentLoadResult> {
    if (ancestors.has(entry.id)) throw new Error(`Component dependency cycle includes ${entry.id}.`);
    const nextAncestors = new Set(ancestors).add(entry.id);
    for (const dependency of entry.dependencies) await this.#load(this.#requireEntry(dependency), nextAncestors);
    const value = await this.#resolver.load(entry);
    if (entry.layer === 'element') this.#validateElement(entry, value);
    this.#retainStyles(entry);
    this.#retainStyleIds(entry);
    return { entry, value };
  }

  #retainStyleIds(entry: ComponentLibraryEntry): void {
    if (this.#entryStyleIds.has(entry.id)) return;
    for (const styleId of entry.styles) this.#styleIdReferences.set(styleId, (this.#styleIdReferences.get(styleId) ?? 0) + 1);
    this.#entryStyleIds.set(entry.id, entry.styles);
  }

  #retainStyles(entry: ComponentLibraryEntry): void {
    if (!this.#styles || !this.#styleTarget || this.#entryStyles.has(entry.id)) return;
    const sheets = this.#styles.resolve(entry);
    if (sheets.length !== entry.styles.length) throw new Error(`Component stylesheet resolver returned an unexpected sheet count for ${entry.id}.`);
    const target = this.#styleTarget;
    for (const sheet of sheets) {
      const count = this.#styleReferences.get(sheet) ?? 0;
      if (count === 0 && !target.adoptedStyleSheets.includes(sheet)) {
        target.adoptedStyleSheets = [...target.adoptedStyleSheets, sheet];
        this.#installedStyles.add(sheet);
      }
      this.#styleReferences.set(sheet, count + 1);
    }
    this.#entryStyles.set(entry.id, sheets);
  }

  #releaseStyle(sheet: CSSStyleSheet): void {
    const count = this.#styleReferences.get(sheet);
    if (!count || !this.#styleTarget) return;
    if (count > 1) { this.#styleReferences.set(sheet, count - 1); return; }
    this.#styleReferences.delete(sheet);
    if (this.#installedStyles.delete(sheet)) {
      this.#styleTarget.adoptedStyleSheets = this.#styleTarget.adoptedStyleSheets.filter((candidate) => candidate !== sheet);
    }
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
  options?: ComponentLibraryLoaderOptions,
): ComponentLibraryLoader {
  return new ComponentLibraryLoader(manifest, resolver, options);
}
