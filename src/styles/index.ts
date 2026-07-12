export type StyleTarget = Document | ShadowRoot;
export type CssValue = string | number;

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
const styleSheetText = new WeakMap<CSSStyleSheet, string>();

interface TargetSheetOwnership {
  count: number;
  readonly installed: boolean;
}

const targetStyleOwnership = new WeakMap<StyleTarget, Map<CSSStyleSheet, TargetSheetOwnership>>();

interface ServerStyleSheet {
  readonly [serverStyleSheetBrand]: true;
  readonly cssText: string;
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
