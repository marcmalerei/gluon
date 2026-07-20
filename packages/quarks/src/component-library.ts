/**
 * Public, serializable contract for optional component-library records.
 *
 * A manifest describes what a consumer may request.  It deliberately does not
 * import modules, register custom elements, or adopt styles: those observable
 * effects belong to an explicit loader implementation owned by the consumer.
 */
export interface ComponentLibraryEntry {
  /** Stable, library-local request key such as `product-configurator`. */
  readonly id: string;
  /** Public ESM specifier that a loader is allowed to resolve. */
  readonly module: string;
  /** Named public export provided by `module`. */
  readonly exportName: string;
  /** Functional components render through this public layer. */
  readonly layer: 'quark' | 'atom' | 'molecule' | 'element';
  /** Required only for an element that may register a custom-element name. */
  readonly tag?: `${string}-${string}`;
  /** Stable constructable-stylesheet ids needed by this record. */
  readonly styles: readonly string[];
  /** Other manifest entries that must be loaded first. */
  readonly dependencies: readonly string[];
  /** Short consumer-visible accessibility contract. */
  readonly accessibility: string;
  /** Stable Storybook story id, when a developer story is supplied. */
  readonly storyId?: string;
}

export interface ComponentLibraryManifest {
  readonly schemaVersion: 1;
  readonly name: string;
  readonly entries: readonly ComponentLibraryEntry[];
}

export interface ComponentLibraryManifestValidation {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/**
 * Validates untrusted JSON before a loader uses it for module resolution.
 * The result contains all structural errors and never performs an import.
 */
export function validateComponentLibraryManifest(value: unknown): ComponentLibraryManifestValidation {
  if (!value || typeof value !== 'object') {
    return { valid: false, errors: ['Manifest must be an object.'] };
  }
  const manifest = value as Partial<ComponentLibraryManifest>;
  const errors: string[] = [];
  if (manifest.schemaVersion !== 1) errors.push('Manifest schemaVersion must be 1.');
  if (typeof manifest.name !== 'string' || manifest.name.length === 0) errors.push('Manifest name must be a non-empty string.');
  if (!Array.isArray(manifest.entries)) {
    errors.push('Manifest entries must be an array.');
    return { valid: false, errors };
  }
  const ids = new Set<string>();
  const tags = new Set<string>();
  for (const [index, entry] of manifest.entries.entries()) {
    const prefix = `Entry ${index}`;
    if (!entry || typeof entry !== 'object') { errors.push(`${prefix} must be an object.`); continue; }
    const candidate = entry as Partial<ComponentLibraryEntry>;
    if (typeof candidate.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(candidate.id)) errors.push(`${prefix} id must be a kebab-case string.`);
    else if (ids.has(candidate.id)) errors.push(`${prefix} duplicates id ${candidate.id}.`); else ids.add(candidate.id);
    if (typeof candidate.module !== 'string' || !/^(?:@[^/]+\/[^/]+|[a-z][a-z0-9-]*)(?:\/[a-zA-Z0-9._-]+)*$/.test(candidate.module)) errors.push(`${prefix} module must be a bare public ESM specifier.`);
    if (typeof candidate.exportName !== 'string' || !/^[A-Za-z_$][\w$]*$/.test(candidate.exportName)) errors.push(`${prefix} exportName must be an identifier.`);
    if (!['quark', 'atom', 'molecule', 'element'].includes(candidate.layer ?? '')) errors.push(`${prefix} layer is invalid.`);
    if (!Array.isArray(candidate.styles) || candidate.styles.some((style) => typeof style !== 'string' || style.length === 0)) errors.push(`${prefix} styles must be non-empty string ids.`);
    if (!Array.isArray(candidate.dependencies) || candidate.dependencies.some((dependency) => typeof dependency !== 'string' || dependency.length === 0)) errors.push(`${prefix} dependencies must be string ids.`);
    if (typeof candidate.accessibility !== 'string' || candidate.accessibility.length === 0) errors.push(`${prefix} accessibility must be a non-empty string.`);
    if (candidate.layer === 'element' && (typeof candidate.tag !== 'string' || !/^[a-z][a-z0-9]*-[a-z0-9-]+$/.test(candidate.tag))) errors.push(`${prefix} element tag must be a custom-element name.`);
    if (candidate.layer !== 'element' && candidate.tag !== undefined) errors.push(`${prefix} only an element may declare tag.`);
    if (candidate.tag) { if (tags.has(candidate.tag)) errors.push(`${prefix} duplicates tag ${candidate.tag}.`); else tags.add(candidate.tag); }
  }
  return { valid: errors.length === 0, errors };
}
