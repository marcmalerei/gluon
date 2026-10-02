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

/** Public CSS custom-property values accepted by a tenant-scoped UI owner. */
export type UiTokenValue = string | number;

/**
 * Application and tenant theme extensions are deliberately CSS-variable based.
 * Only `--gluon-*` names are accepted so a tenant cannot replace component
 * selectors or inject a second styling mechanism through this API.
 */
export type UiTokenOverrides = Readonly<Record<string, UiTokenValue>>;

export interface UiTenantOptions {
  /** Stable identifier used for diagnostics and host metadata. */
  readonly id: string;
  /** Element subtree receiving this tenant's inherited CSS variables. */
  readonly scope: HTMLElement;
  /** Optional tenant-local light/dark theme. */
  readonly theme?: UiThemeName;
  /** Tenant-local semantic or component token overrides. */
  readonly tokens?: UiTokenOverrides;
}

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
  /** Optional isolated tenant scope for multi-tenant applications. */
  readonly tenant?: UiTenantOptions;
}

export interface UiOwner {
  readonly target: StyleTarget;
  readonly theme: UiThemeName;
  readonly themeSheet: CSSStyleSheet;
  /** Additional target-scoped sheets explicitly retained by this UI handle. */
  readonly styleOwner: StyleSheetOwner;
  readonly selection: UiStyleSelection;
  readonly tenantId?: string;
  readonly disposed: boolean;
  setTheme(theme: UiThemeName): void;
  setTokens(tokens: UiTokenOverrides): void;
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

interface UiTenantState {
  readonly scope: HTMLElement;
  readonly id: string;
  readonly initialThemeAttribute: string | null;
  readonly initialTenantAttribute: string | null;
  readonly initialTokens: Map<string, string | null>;
  readonly ownedTokens: Set<string>;
  owners: number;
  theme: UiThemeName;
  tokens: UiTokenOverrides;
}

const uiTargets = new WeakMap<StyleTarget, UiTargetState>();
const uiTenants = new WeakMap<HTMLElement, UiTenantState>();
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
  const requestedTheme = options.theme ?? uiTargets.get(target)?.theme ?? 'light';
  const tenant = options.tenant;
  if (tenant) {
    validateTenantOptions(target, tenant);
  }
  const carriers = options.hydrate ? validateHydrationCarriers(target, requestedTheme) : [];
  let state = uiTargets.get(target);
  let createdState = false;
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
      createdState = true;
    } catch (error) {
      baseOwner.dispose();
      throw error;
    }
  } else if (state.theme !== requestedTheme) {
    applyTheme(state, requestedTheme);
  }
  let tenantState: UiTenantState | undefined;
  try {
    tenantState = tenant ? acquireTenant(tenant, tenant.theme ?? options.theme ?? 'light') : undefined;
  } catch (error) {
    if (createdState) {
      state.baseOwner.dispose();
      uiTargets.delete(target);
    }
    throw error;
  }
  state.owners += 1;
  const styleOwner = createStyleSheetOwner(target);
  let disposed = false;
  const installedState = state;
  const owner: UiOwner = {
    target,
    get theme() { return tenantState?.theme ?? installedState.theme; },
    get themeSheet() { return installedState.themeSheet; },
    styleOwner,
    get tenantId() { return tenantState?.id; },
    get selection() { return createSelection(installedState.theme, installedState.themeSheet); },
    get disposed() { return disposed; },
    setTheme(theme) {
      if (disposed) throw new Error('A disposed UI owner cannot change themes.');
      if (tenantState) {
        applyTenant(tenantState, theme, tenantState.tokens);
      } else {
        applyTheme(installedState, theme);
      }
    },
    setTokens(tokens) {
      if (disposed) throw new Error('A disposed UI owner cannot change tokens.');
      if (!tenantState) throw new Error('Token overrides require a tenant-scoped UI owner.');
      applyTenant(tenantState, tenantState.theme, tokens);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      styleOwner.dispose();
      if (tenantState) releaseTenant(tenantState);
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

const tenantThemeTokens: Readonly<Record<UiThemeName, UiTokenOverrides>> = Object.freeze({
  light: Object.freeze({
    '--gluon-color-canvas': '#ffffff',
    '--gluon-color-surface': '#ffffff',
    '--gluon-color-text': '#12312f',
    '--gluon-color-muted': '#526663',
    '--gluon-color-rule': '#b8c9c6',
    '--gluon-color-action': '#087f7b',
    '--gluon-color-action-text': '#ffffff',
    '--gluon-color-action-soft': '#e6f4f1',
    '--gluon-color-action-soft-text': '#075e5b',
    '--gluon-color-focus': '#173f91',
    '--gluon-color-danger': '#a52222',
  }),
  dark: Object.freeze({
    '--gluon-color-canvas': '#101716',
    '--gluon-color-surface': '#172220',
    '--gluon-color-text': '#f1f7f5',
    '--gluon-color-muted': '#b8c9c6',
    '--gluon-color-rule': '#526663',
    '--gluon-color-action': '#65d5c8',
    '--gluon-color-action-text': '#071f1c',
    '--gluon-color-action-soft': '#20443f',
    '--gluon-color-action-soft-text': '#e8fffb',
    '--gluon-color-focus': '#8caeff',
    '--gluon-color-danger': '#ff9b9b',
  }),
});

function validateTenantOptions(target: StyleTarget, tenant: UiTenantOptions): void {
  if (!tenant.id.trim()) throw new Error('A tenant-scoped UI owner requires a non-empty id.');
  if (!tenant.scope || tenant.scope.nodeType !== Node.ELEMENT_NODE) {
    throw new Error('A tenant-scoped UI owner requires an HTMLElement scope.');
  }
  const root = tenant.scope.getRootNode();
  const inTarget = 'documentElement' in target
    ? target.documentElement?.contains(tenant.scope) === true
    : root === target || target.host === tenant.scope;
  if (!inTarget) throw new Error('A tenant scope must belong to the UI style target.');
  normalizeTokens(tenant.tokens ?? {});
}

function acquireTenant(tenant: UiTenantOptions, fallbackTheme: UiThemeName): UiTenantState {
  const requestedTheme = tenant.theme ?? fallbackTheme;
  const requestedTokens = normalizeTokens(tenant.tokens ?? {});
  const existing = uiTenants.get(tenant.scope);
  if (existing) {
    if (existing.id !== tenant.id || existing.theme !== requestedTheme || !sameTokens(existing.tokens, requestedTokens)) {
      throw new Error(`Tenant scope "${tenant.id}" is already owned with a different configuration.`);
    }
    existing.owners += 1;
    return existing;
  }
  const state: UiTenantState = {
    scope: tenant.scope,
    id: tenant.id,
    initialThemeAttribute: tenant.scope.getAttribute('data-gluon-theme'),
    initialTenantAttribute: tenant.scope.getAttribute('data-gluon-tenant'),
    initialTokens: new Map(),
    ownedTokens: new Set(),
    owners: 0,
    theme: requestedTheme,
    tokens: requestedTokens,
  };
  applyTenant(state, requestedTheme, requestedTokens);
  state.owners = 1;
  uiTenants.set(tenant.scope, state);
  return state;
}

function applyTenant(state: UiTenantState, theme: UiThemeName, tokens: UiTokenOverrides): void {
  const normalized = normalizeTokens(tokens);
  const values = { ...tenantThemeTokens[theme], ...normalized };
  for (const key of state.ownedTokens) {
    if (!(key in values)) restoreToken(state, key);
  }
  for (const [key, value] of Object.entries(values)) {
    if (!state.initialTokens.has(key)) state.initialTokens.set(key, state.scope.style.getPropertyValue(key) || null);
    state.scope.style.setProperty(key, String(value));
    state.ownedTokens.add(key);
  }
  state.scope.setAttribute('data-gluon-theme', theme);
  state.scope.setAttribute('data-gluon-tenant', state.id);
  state.theme = theme;
  state.tokens = normalized;
}

function releaseTenant(state: UiTenantState): void {
  state.owners -= 1;
  if (state.owners > 0) return;
  for (const key of state.ownedTokens) restoreToken(state, key);
  restoreAttribute(state.scope, 'data-gluon-theme', state.initialThemeAttribute);
  restoreAttribute(state.scope, 'data-gluon-tenant', state.initialTenantAttribute);
  uiTenants.delete(state.scope);
}

function restoreToken(state: UiTenantState, key: string): void {
  const initial = state.initialTokens.get(key);
  if (initial === null || initial === undefined) state.scope.style.removeProperty(key);
  else state.scope.style.setProperty(key, initial);
  state.ownedTokens.delete(key);
}

function restoreAttribute(scope: HTMLElement, name: string, value: string | null): void {
  if (value === null) scope.removeAttribute(name);
  else scope.setAttribute(name, value);
}

function normalizeTokens(tokens: UiTokenOverrides): UiTokenOverrides {
  const normalized: Record<string, UiTokenValue> = {};
  for (const [name, value] of Object.entries(tokens)) {
    if (!/^--gluon-[a-z0-9-]+$/.test(name)) throw new Error(`Invalid Gluon UI token "${name}".`);
    if (typeof value !== 'string' && typeof value !== 'number') throw new Error(`Invalid value for Gluon UI token "${name}".`);
    normalized[name] = value;
  }
  return Object.freeze(normalized);
}

function sameTokens(a: UiTokenOverrides, b: UiTokenOverrides): boolean {
  const aEntries = Object.entries(a);
  const bEntries = Object.entries(b);
  return aEntries.length === bEntries.length && aEntries.every(([key, value]) => b[key] === value);
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
