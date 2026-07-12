import {
  createStyleSheet,
  createStyleSheetOwner,
  createStyleSheetSelection,
  css,
  foundationStyles,
  getStyleSheetDigest,
  getStyleSheetText,
  layerOrderStyles,
  replaceStyleSheet,
  type StyleSheetOwner,
  type StyleSheetSelection,
  type StyleTarget,
} from '@gluonjs/core';

export type UiThemeName = 'light' | 'dark';

export const uiTokenStyles = css`
  @layer atoms {
    :root, :host {
      --gluon-font-family: ui-sans-serif, system-ui, sans-serif;
      --gluon-radius-control: 0.625rem;
      --gluon-radius-surface: 1rem;
      --gluon-space-control-block: 0.75rem;
      --gluon-space-control-inline: 1rem;
      --gluon-focus-width: 3px;
    }
  }
`;

export const lightThemeStyles = css`
  @layer atoms {
    :root, :host, [data-gluon-theme="light"], :host([data-gluon-theme="light"]) {
      color-scheme: light;
      --gluon-color-canvas: #ffffff;
      --gluon-color-surface: #ffffff;
      --gluon-color-text: #12312f;
      --gluon-color-muted: #526663;
      --gluon-color-rule: #b8c9c6;
      --gluon-color-action: #087f7b;
      --gluon-color-action-text: #ffffff;
      --gluon-color-action-soft: #e6f4f1;
      --gluon-color-action-soft-text: #075e5b;
      --gluon-color-focus: #173f91;
      --gluon-color-danger: #a52222;
    }
  }
`;

export const darkThemeStyles = css`
  @layer atoms {
    :root, :host, [data-gluon-theme="dark"], :host([data-gluon-theme="dark"]) {
      color-scheme: dark;
      --gluon-color-canvas: #101716;
      --gluon-color-surface: #172220;
      --gluon-color-text: #f1f7f5;
      --gluon-color-muted: #b8c9c6;
      --gluon-color-rule: #526663;
      --gluon-color-action: #65d5c8;
      --gluon-color-action-text: #071f1c;
      --gluon-color-action-soft: #20443f;
      --gluon-color-action-soft-text: #e8fffb;
      --gluon-color-focus: #8caeff;
      --gluon-color-danger: #ff9b9b;
    }
  }
`;

export interface InstallUiOptions {
  readonly theme?: UiThemeName;
  /** Validate and consume SSR carriers for this UI selection before returning. */
  readonly hydrate?: boolean;
}

export interface UiOwner {
  readonly target: StyleTarget;
  readonly theme: UiThemeName;
  readonly themeSheet: CSSStyleSheet;
  /** Additional target-scoped sheets explicitly retained by this UI handle. */
  readonly styleOwner: StyleSheetOwner;
  readonly selection: UiStyleSelection;
  readonly disposed: boolean;
  setTheme(theme: UiThemeName): void;
  dispose(): void;
}

export interface UiStyleSelection extends StyleSheetSelection {
  readonly scope: 'gluon-ui';
  readonly theme: UiThemeName;
}

export type UiHydrationMismatch = 'missing' | 'duplicate' | 'reordered' | 'mismatched';

export class UiHydrationError extends Error {
  readonly code = 'GLUON_UI_HYDRATION_MISMATCH';
  constructor(readonly mismatch: UiHydrationMismatch, message: string) {
    super(message);
    this.name = 'UiHydrationError';
  }
}

interface UiTargetState {
  owners: number;
  theme: UiThemeName;
  readonly themeSheet: CSSStyleSheet;
  readonly baseOwner: StyleSheetOwner;
  readonly themeHost: Element;
  readonly initialThemeAttribute: string | null;
}

const uiTargets = new WeakMap<StyleTarget, UiTargetState>();
const uiScope = 'gluon-ui' as const;

export function getThemeStyles(theme: UiThemeName): CSSStyleSheet {
  return theme === 'dark' ? darkThemeStyles : lightThemeStyles;
}

/** Returns the exact ordered shared UI selection used by SSR and hydration. */
export function createUiStyleSelection(theme: UiThemeName = 'light'): UiStyleSelection {
  return createSelection(theme, getThemeStyles(theme));
}

/**
 * Installs the layer order, Core foundation, UI tokens, active theme, and one
 * target-scoped style owner on a Document or ShadowRoot.
 */
export function installUi(
  target: StyleTarget = document,
  options: InstallUiOptions = {},
): UiOwner {
  const requestedTheme = options.theme ?? 'light';
  const carriers = options.hydrate ? validateHydrationCarriers(target, requestedTheme) : [];
  let state = uiTargets.get(target);
  if (!state) {
    const baseOwner = createStyleSheetOwner(target);
    const themeSheet = createStyleSheet(getStyleSheetText(getThemeStyles(requestedTheme)));
    const themeHost = getThemeHost(target);
    try {
      baseOwner.retain(layerOrderStyles, foundationStyles, uiTokenStyles, themeSheet);
      state = {
        owners: 0,
        theme: requestedTheme,
        themeSheet,
        baseOwner,
        themeHost,
        initialThemeAttribute: themeHost.getAttribute('data-gluon-theme'),
      };
      applyTheme(state, requestedTheme);
      uiTargets.set(target, state);
    } catch (error) {
      baseOwner.dispose();
      throw error;
    }
  } else if (state.theme !== requestedTheme) {
    applyTheme(state, requestedTheme);
  }
  state.owners += 1;
  const styleOwner = createStyleSheetOwner(target);
  let disposed = false;
  const installedState = state;
  const owner: UiOwner = {
    target,
    get theme() { return installedState.theme; },
    get themeSheet() { return installedState.themeSheet; },
    styleOwner,
    get selection() { return createSelection(installedState.theme, installedState.themeSheet); },
    get disposed() { return disposed; },
    setTheme(theme) {
      if (disposed) throw new Error('A disposed UI owner cannot change themes.');
      applyTheme(installedState, theme);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      styleOwner.dispose();
      installedState.owners -= 1;
      if (installedState.owners > 0) return;
      installedState.baseOwner.dispose();
      if (installedState.themeHost.getAttribute('data-gluon-theme') === installedState.theme) {
        if (installedState.initialThemeAttribute === null) {
          installedState.themeHost.removeAttribute('data-gluon-theme');
        } else {
          installedState.themeHost.setAttribute('data-gluon-theme', installedState.initialThemeAttribute);
        }
      }
      uiTargets.delete(target);
    },
  };
  for (const carrier of carriers) carrier.remove();
  return Object.freeze(owner);
}

/** @deprecated Use installUi() and call owner.dispose(). */
export function installUiTheme(
  target: StyleTarget,
  theme: UiThemeName = 'light',
): () => void {
  const owner = createStyleSheetOwner(target);
  owner.retain(uiTokenStyles, getThemeStyles(theme));
  return () => owner.dispose();
}

function createSelection(theme: UiThemeName, themeSheet: CSSStyleSheet): UiStyleSelection {
  const selection = createStyleSheetSelection([
    { id: 'gluon-ui-layer-order', scope: uiScope, sheet: layerOrderStyles },
    { id: 'gluon-ui-foundation', scope: uiScope, sheet: foundationStyles },
    { id: 'gluon-ui-tokens', scope: uiScope, sheet: uiTokenStyles },
    { id: 'gluon-ui-theme', scope: uiScope, sheet: themeSheet },
  ]);
  return Object.freeze({ ...selection, scope: uiScope, theme });
}

function applyTheme(state: UiTargetState, theme: UiThemeName): void {
  if (state.theme !== theme) {
    replaceStyleSheet(state.themeSheet, getStyleSheetText(getThemeStyles(theme)));
    state.theme = theme;
  }
  state.themeHost.setAttribute('data-gluon-theme', theme);
}

function getThemeHost(target: StyleTarget): Element {
  if ('documentElement' in target) {
    if (!target.documentElement) throw new Error('A UI Document target requires a documentElement.');
    return target.documentElement;
  }
  return target.host;
}

function validateHydrationCarriers(
  target: StyleTarget,
  theme: UiThemeName,
): readonly HTMLStyleElement[] {
  const expected = createUiStyleSelection(theme).entries;
  const carriers = [...target.querySelectorAll<HTMLStyleElement>('style[data-gluon-style]')]
    .filter((carrier) => carrier.dataset.gluonStyleScope === uiScope);
  const ids = carriers.map((carrier) => carrier.dataset.gluonStyle ?? '');
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length > 0) {
    throw new UiHydrationError('duplicate', `Duplicate UI hydration sheet "${duplicates[0]}".`);
  }
  const expectedIds = expected.map((entry) => entry.id);
  const missing = expectedIds.filter((id) => !ids.includes(id));
  if (missing.length > 0) {
    throw new UiHydrationError('missing', `Missing UI hydration sheet "${missing[0]}".`);
  }
  if (carriers.length !== expected.length) {
    throw new UiHydrationError('mismatched', `Expected ${expected.length} UI hydration sheets; received ${carriers.length}.`);
  }
  if (ids.some((id, index) => id !== expectedIds[index])) {
    throw new UiHydrationError('reordered', `UI hydration sheet order must be ${expectedIds.join(', ')}.`);
  }
  for (let index = 0; index < expected.length; index += 1) {
    const entry = expected[index]!;
    const carrier = carriers[index]!;
    const cssText = getStyleSheetText(entry.sheet);
    if (
      carrier.dataset.gluonDigest !== getStyleSheetDigest(entry.sheet)
      || (carrier.textContent ?? '').replace(/<\\\/style/gi, '</style') !== cssText
    ) {
      throw new UiHydrationError('mismatched', `UI hydration sheet "${entry.id}" content does not match theme "${theme}".`);
    }
  }
  return carriers;
}
