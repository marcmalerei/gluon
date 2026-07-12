export type StyleTarget = Document | ShadowRoot;
export type CssValue = string | number;
export type ComponentStyleLayer = 'atom' | 'molecule' | 'organism';

export interface ComponentStyleDependency extends StyleSheetSelectionEntry {
  readonly layer: ComponentStyleLayer;
  /** Stable order inside one cascade layer. */
  readonly order: number;
}

export interface ComponentStyleOwner {
  readonly target: StyleTarget;
  readonly dependencies: readonly ComponentStyleDependency[];
  readonly disposed: boolean;
  retain(...dependencies: readonly ComponentStyleDependency[]): void;
  release(...dependencies: readonly ComponentStyleDependency[]): void;
  dispose(): void;
}

export interface StyleSheetSelectionEntry {
  /** Stable transport identity. Content changes are detected by the digest. */
  readonly id: string;
  readonly sheet: CSSStyleSheet;
  /** Optional owner namespace used to isolate hydration carriers. */
  readonly scope?: string;
}

export interface StyleSheetSelection {
  readonly version: 1;
  readonly entries: readonly StyleSheetSelectionEntry[];
}

export interface StyleSheetOwner {
  readonly target: StyleTarget;
  readonly sheets: readonly CSSStyleSheet[];
  readonly disposed: boolean;
  retain(...sheets: readonly CSSStyleSheet[]): void;
  release(...sheets: readonly CSSStyleSheet[]): void;
  dispose(): void;
}

const serverStyleSheetBrand = Symbol('gluon.server-style-sheet');
const legacyComponentStyleIds = Symbol('gluon.legacy-component-style-ids');
const styleSheetText = new WeakMap<CSSStyleSheet, string>();

interface TargetSheetOwnership {
  count: number;
  readonly installed: boolean;
}

const targetStyleOwnership = new WeakMap<StyleTarget, Map<CSSStyleSheet, TargetSheetOwnership>>();
const targetComponentStyles = new WeakMap<StyleTarget, Map<CSSStyleSheet, {
  count: number;
  readonly dependency: ComponentStyleDependency;
}>>();

interface ServerStyleSheet {
  readonly [serverStyleSheetBrand]: true;
  readonly cssText: string;
}

type LegacyComponentStyleSheet = CSSStyleSheet & {
  readonly [legacyComponentStyleIds]?: ReadonlySet<string>;
};

export class LegacyComponentStyleConflictError extends Error {
  readonly code = 'GLUON_LEGACY_COMPONENT_STYLE_CONFLICT';
  constructor(readonly componentStyleId: string) {
    super(
      `The deprecated aggregate stylesheet already covers ${componentStyleId}. `
      + 'Remove the aggregate adoption before using rendered component styles.',
    );
    this.name = 'LegacyComponentStyleConflictError';
  }
}

/** Creates a constructable stylesheet. Gluon intentionally has no `<style>` fallback. */
export function createStyleSheet(cssText: string): CSSStyleSheet {
  if (typeof CSSStyleSheet === 'undefined' || !('replaceSync' in CSSStyleSheet.prototype)) {
    if (typeof document !== 'undefined') {
      throw new Error(
        'Gluon requires constructable CSSStyleSheet support. '
        + 'No <style> fallback is provided by design.',
      );
    }
    return Object.freeze({
      [serverStyleSheetBrand]: true as const,
      cssText,
    }) as unknown as CSSStyleSheet;
  }

  const sheet = new CSSStyleSheet();
  sheet.replaceSync(cssText);
  styleSheetText.set(sheet, cssText);
  return sheet;
}

/** Returns serializable CSS for server-created descriptors or browser sheets. */
export function getStyleSheetText(sheet: CSSStyleSheet): string {
  const serverSheet = sheet as unknown as Partial<ServerStyleSheet>;
  if (serverSheet[serverStyleSheetBrand]) return serverSheet.cssText ?? '';
  const source = styleSheetText.get(sheet);
  if (source !== undefined) return source;
  return [...sheet.cssRules].map((rule) => rule.cssText).join('\n');
}

/** Returns the stable content digest used by Gluon's SSR style transport. */
export function getStyleSheetDigest(sheet: CSSStyleSheet): string {
  return getStyleTextDigest(getStyleSheetText(sheet));
}

/** Returns the stable FNV-1a digest used by Gluon's SSR style transport. */
export function getStyleTextDigest(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** Replaces a constructed sheet in place so every adopter keeps its identity. */
export function replaceStyleSheet(sheet: CSSStyleSheet, cssText: string): void {
  if (!('replaceSync' in sheet)) {
    throw new Error('A server stylesheet descriptor cannot be replaced in place.');
  }
  sheet.replaceSync(cssText);
  styleSheetText.set(sheet, cssText);
}

/** Creates an immutable, ordered, named stylesheet selection for SSR transport. */
export function createStyleSheetSelection(
  entries: readonly StyleSheetSelectionEntry[],
): StyleSheetSelection {
  const ids = new Set<string>();
  const normalized = entries.map((entry) => {
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(entry.id)) {
      throw new TypeError(`Invalid stylesheet selection id "${entry.id}".`);
    }
    if (ids.has(entry.id)) throw new TypeError(`Duplicate stylesheet selection id "${entry.id}".`);
    ids.add(entry.id);
    return Object.freeze({ id: entry.id, sheet: entry.sheet, ...(entry.scope ? { scope: entry.scope } : {}) });
  });
  return Object.freeze({ version: 1 as const, entries: Object.freeze(normalized) });
}

/** Defines immutable, named metadata for one component-owned stylesheet. */
export function createComponentStyleDependency(
  dependency: ComponentStyleDependency,
): ComponentStyleDependency {
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(dependency.id)) {
    throw new TypeError(`Invalid component stylesheet id "${dependency.id}".`);
  }
  if (!Number.isInteger(dependency.order) || dependency.order < 0) {
    throw new TypeError(`Component stylesheet ${dependency.id} requires a non-negative integer order.`);
  }
  return Object.freeze({
    id: dependency.id,
    sheet: dependency.sheet,
    layer: dependency.layer,
    order: dependency.order,
    ...(dependency.scope ? { scope: dependency.scope } : {}),
  });
}

/** Marks a deprecated aggregate sheet so exact rendering fails instead of silently double-styling. */
export function markLegacyComponentStyleSheet(
  sheet: CSSStyleSheet,
  componentStyleIds: readonly string[],
): CSSStyleSheet {
  if (!Object.isExtensible(sheet)) return sheet;
  Object.defineProperty(sheet, legacyComponentStyleIds, {
    configurable: false,
    enumerable: false,
    value: new Set(componentStyleIds),
  });
  return sheet;
}

/**
 * Owns exact component stylesheet references for one target. Active component
 * sheets are kept in deterministic layer/id order without moving unrelated
 * adopted sheets relative to one another.
 */
export function createComponentStyleOwner(target: StyleTarget): ComponentStyleOwner {
  const owned = new Set<ComponentStyleDependency>();
  let disposed = false;
  return {
    target,
    get dependencies() { return Object.freeze([...owned].sort(compareComponentStyles)); },
    get disposed() { return disposed; },
    retain(...dependencies) {
      if (disposed) throw new Error('A disposed Gluon component style owner cannot retain styles.');
      for (const dependency of dependencies) {
        if (owned.has(dependency)) continue;
        retainComponentStyle(target, dependency);
        owned.add(dependency);
      }
    },
    release(...dependencies) {
      if (disposed) return;
      for (const dependency of dependencies) {
        if (!owned.delete(dependency)) continue;
        releaseComponentStyle(target, dependency);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const dependency of owned) releaseComponentStyle(target, dependency);
      owned.clear();
    },
  };
}

function retainComponentStyle(target: StyleTarget, dependency: ComponentStyleDependency): void {
  const conflicting = target.adoptedStyleSheets.find((sheet) => (
    (sheet as LegacyComponentStyleSheet)[legacyComponentStyleIds]?.has(dependency.id)
  ));
  if (conflicting && conflicting !== dependency.sheet) {
    throw new LegacyComponentStyleConflictError(dependency.id);
  }
  let state = targetComponentStyles.get(target);
  if (!state) {
    state = new Map();
    targetComponentStyles.set(target, state);
  }
  const current = state.get(dependency.sheet);
  if (current) {
    if (current.dependency.id !== dependency.id) {
      throw new Error(
        `Component stylesheet identity collision between ${current.dependency.id} and ${dependency.id}.`,
      );
    }
    current.count += 1;
  } else {
    state.set(dependency.sheet, { count: 1, dependency });
    retainTargetSheet(target, dependency.sheet);
  }
  orderTargetComponentStyles(target, state);
}

function releaseComponentStyle(target: StyleTarget, dependency: ComponentStyleDependency): void {
  const state = targetComponentStyles.get(target);
  const current = state?.get(dependency.sheet);
  if (!state || !current) return;
  current.count -= 1;
  if (current.count > 0) return;
  state.delete(dependency.sheet);
  releaseTargetSheet(target, dependency.sheet);
  if (state.size === 0) targetComponentStyles.delete(target);
}

function orderTargetComponentStyles(
  target: StyleTarget,
  state: ReadonlyMap<CSSStyleSheet, { readonly dependency: ComponentStyleDependency }>,
): void {
  if (state.size < 2) return;
  const positions: number[] = [];
  const managed: ComponentStyleDependency[] = [];
  for (let index = 0; index < target.adoptedStyleSheets.length; index += 1) {
    const dependency = state.get(target.adoptedStyleSheets[index]!)?.dependency;
    if (!dependency) continue;
    positions.push(index);
    managed.push(dependency);
  }
  managed.sort(compareComponentStyles);
  const next = [...target.adoptedStyleSheets];
  for (let index = 0; index < positions.length; index += 1) {
    next[positions[index]!] = managed[index]!.sheet;
  }
  target.adoptedStyleSheets = next;
}

export function compareComponentStyles(
  left: ComponentStyleDependency,
  right: ComponentStyleDependency,
): number {
  const layers: Record<ComponentStyleLayer, number> = { atom: 0, molecule: 1, organism: 2 };
  return layers[left.layer] - layers[right.layer]
    || left.order - right.order
    || left.id.localeCompare(right.id);
}

/** Tagged-template helper that returns a constructable stylesheet. */
export function css(
  strings: TemplateStringsArray,
  ...values: readonly CssValue[]
): CSSStyleSheet {
  let cssText = strings[0] ?? '';
  for (let index = 0; index < values.length; index += 1) {
    cssText += String(values[index]) + (strings[index + 1] ?? '');
  }
  return createStyleSheet(cssText);
}

/** Adds sheets to a Document or ShadowRoot once, preserving existing sheets. */
export function adoptStyles(
  target: StyleTarget,
  ...sheets: readonly CSSStyleSheet[]
): void {
  if (!('adoptedStyleSheets' in target)) {
    throw new Error(
      'Gluon requires adoptedStyleSheets support. '
      + 'No <style> fallback is provided by design.',
    );
  }

  const next = [...target.adoptedStyleSheets];
  for (const sheet of sheets) {
    if (!next.includes(sheet)) next.push(sheet);
  }
  target.adoptedStyleSheets = next;
}

/** Removes only the supplied sheets and keeps unrelated adopted sheets intact. */
export function unadoptStyles(
  target: StyleTarget,
  ...sheets: readonly CSSStyleSheet[]
): void {
  const remove = new Set(sheets);
  target.adoptedStyleSheets = target.adoptedStyleSheets.filter(
    (sheet) => !remove.has(sheet),
  );
}

/**
 * Creates one disposable stylesheet owner for a Document or ShadowRoot.
 * Owners on the same target share reference counts and never remove sheets
 * that predated Gluon's first retained reference.
 */
export function createStyleSheetOwner(target: StyleTarget): StyleSheetOwner {
  const owned = new Set<CSSStyleSheet>();
  let disposed = false;
  return {
    target,
    get sheets() { return Object.freeze([...owned]); },
    get disposed() { return disposed; },
    retain(...sheets) {
      assertActive();
      for (const sheet of sheets) {
        if (owned.has(sheet)) continue;
        retainTargetSheet(target, sheet);
        owned.add(sheet);
      }
    },
    release(...sheets) {
      if (disposed) return;
      for (const sheet of sheets) {
        if (!owned.delete(sheet)) continue;
        releaseTargetSheet(target, sheet);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const sheet of owned) releaseTargetSheet(target, sheet);
      owned.clear();
    },
  };

  function assertActive(): void {
    if (disposed) throw new Error('A disposed Gluon stylesheet owner cannot retain sheets.');
  }
}

function retainTargetSheet(target: StyleTarget, sheet: CSSStyleSheet): void {
  let ownership = targetStyleOwnership.get(target);
  if (!ownership) {
    ownership = new Map();
    targetStyleOwnership.set(target, ownership);
  }
  const current = ownership.get(sheet);
  if (current) {
    current.count += 1;
    return;
  }
  const installed = !target.adoptedStyleSheets.includes(sheet);
  if (installed) adoptStyles(target, sheet);
  ownership.set(sheet, { count: 1, installed });
}

function releaseTargetSheet(target: StyleTarget, sheet: CSSStyleSheet): void {
  const ownership = targetStyleOwnership.get(target);
  const current = ownership?.get(sheet);
  if (!ownership || !current) return;
  current.count -= 1;
  if (current.count > 0) return;
  ownership.delete(sheet);
  if (current.installed) unadoptStyles(target, sheet);
  if (ownership.size === 0) targetStyleOwnership.delete(target);
}

export const layerOrderStyles = css`
  @layer gluon, quarks, atoms, molecules, organisms;
`;

export const foundationStyles = css`
  @layer gluon {
    :where(.gluon),
    :where(.gluon)::before,
    :where(.gluon)::after {
      box-sizing: border-box;
    }

    :where(.gluon[hidden]:not([hidden="until-found"])) {
      display: none !important;
    }
  }
`;

/** Installs Gluon's shared layer order and foundation sheet on a style target. */
export function installGluonStyles(target: StyleTarget = document): () => void {
  const owner = createStyleSheetOwner(target);
  owner.retain(layerOrderStyles, foundationStyles);
  return () => owner.dispose();
}
