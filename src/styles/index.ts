export type StyleTarget = Document | ShadowRoot;
export type CssValue = string | number;

const serverStyleSheetBrand = Symbol('gluon.server-style-sheet');

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
  return sheet;
}

/** Returns serializable CSS for server-created descriptors or browser sheets. */
export function getStyleSheetText(sheet: CSSStyleSheet): string {
  const serverSheet = sheet as unknown as Partial<ServerStyleSheet>;
  if (serverSheet[serverStyleSheetBrand]) return serverSheet.cssText ?? '';
  return [...sheet.cssRules].map((rule) => rule.cssText).join('\n');
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
  adoptStyles(target, layerOrderStyles, foundationStyles);
  return () => unadoptStyles(target, layerOrderStyles, foundationStyles);
}
