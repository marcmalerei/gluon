import {
  createComponentStyleSelection,
  createStyleSheetOwner,
  createStyleSheetSelection,
  hydrate,
  getStyleSheetText,
  renderGluonApplicationForServer,
  TemplateResult,
  unmount,
  type AppContainer,
  type AppMount,
  type GluonApp,
  type GluonElement,
  type HydrationMismatchCategory,
  type HydrationResult,
  type StyleSheetSelection,
} from '@gluonjs/core';
import type { Router, RouterSnapshot } from '@gluonjs/router/memory';
import type { StoreManager, StoreSnapshot } from '@gluonjs/store';
import { createStyleManifest, prepareForHydration } from './index.js';
import type { StyleManifest } from './index.js';

export interface HydrateTemplateOptions {
  readonly recovery?: 'replace' | 'throw';
  readonly suppress?: boolean | readonly HydrationMismatchCategory[];
  readonly onMismatch?: Parameters<typeof hydrate>[2]['onMismatch'];
  readonly state?: { readonly server: unknown; readonly client: unknown };
  readonly styles?: StyleManifest;
  /** Exact application sheets combined with component styles discovered from the hydrated tree. */
  readonly styleSelection?: StyleSheetSelection;
  readonly styleRoot?: Document | ShadowRoot;
}

export interface HydratedApplication<Public = unknown> {
  readonly mount: AppMount<Public>;
  readonly hydration: HydrationResult;
}

/** Hydrates the open Declarative Shadow DOM owned by one upgraded Gluon element. */
export async function hydrateElement(
  element: GluonElement,
  options: HydrateTemplateOptions = {},
): Promise<HydrationResult> {
  const root = element.shadowRoot;
  if (!root) throw new Error('A hydrated Gluon element requires an open declarative ShadowRoot.');
  element.beginHydration();
  try {
    return await hydrateTemplate(element.renderForServer(), root, options);
  } finally {
    element.endHydration();
  }
}

/** Resolves async server contracts once, validates marker DOM, and binds it in place. */
export async function hydrateTemplate(
  result: TemplateResult,
  container: AppContainer,
  options: HydrateTemplateOptions = {},
): Promise<HydrationResult> {
  const prepared = await prepareForHydration(result);
  if (!(prepared.value instanceof TemplateResult)) {
    throw new TypeError('A hydration root must resolve to a TemplateResult.');
  }
  const selection = mergeHydrationSelections(
    options.styleSelection,
    createComponentStyleSelection(prepared.value),
  );
  const manifest = options.styles ?? (selection.entries.length > 0 ? createStyleManifest(selection) : undefined);
  const handoff = manifest
    ? prepareStyleHandoff(options.styleRoot ?? container.getRootNode() as Document | ShadowRoot, manifest, selection)
    : undefined;
  try {
    const result = hydrate(prepared.value, container, {
      expectedMarkup: prepared.html,
      recovery: options.recovery,
      suppress: options.suppress,
      onMismatch: options.onMismatch,
      state: options.state,
    });
    if (!result.retained && handoff) {
      unmount(container);
      throw new SsrTransportError('DOM hydration recovery is incompatible with an active style handoff.');
    }
    handoff?.commit();
    return result;
  } catch (error) {
    handoff?.rollback();
    throw error;
  }
}

export class SsrTransportError extends Error {
  readonly code = 'GLUON_UNSUPPORTED_SSR_TRANSPORT';
  constructor(message: string) {
    super(message);
    this.name = 'SsrTransportError';
  }
}

export type ComponentStyleHydrationMismatch =
  | 'missing'
  | 'extra'
  | 'duplicate'
  | 'reordered'
  | 'mismatched'
  | 'wrong-target';

export class ComponentStyleHydrationError extends Error {
  readonly code = 'GLUON_COMPONENT_STYLE_HYDRATION_MISMATCH';
  constructor(readonly mismatch: ComponentStyleHydrationMismatch, message: string) {
    super(message);
    this.name = 'ComponentStyleHydrationError';
  }
}

function prepareStyleHandoff(
  root: Document | ShadowRoot,
  manifest: StyleManifest,
  selection: StyleSheetSelection,
) {
  if (!('adoptedStyleSheets' in root)) throw new SsrTransportError('The hydration root does not support adoptedStyleSheets.');
  const carriers = [...root.querySelectorAll<HTMLStyleElement>('style[data-gluon-style]')];
  const actualIds = carriers.map((carrier) => carrier.dataset.gluonStyle ?? '');
  if (new Set(actualIds).size !== actualIds.length) {
    throw hydrationStyleError(manifest, 'duplicate', 'The hydration target contains duplicate SSR style carriers.');
  }
  if (carriers.length < manifest.entries.length) {
    const expectedIds = new Set(manifest.entries.map((entry) => entry.id));
    const actualIds = new Set(carriers.map((carrier) => carrier.dataset.gluonStyle));
    const missing = [...expectedIds].filter((id) => !actualIds.has(id));
    const elsewhere = root instanceof ShadowRoot
      && missing.some((id) => root.ownerDocument.querySelector(`style[data-gluon-style="${id}"]`));
    throw hydrationStyleError(
      manifest,
      elsewhere ? 'wrong-target' : 'missing',
      elsewhere
        ? `SSR component style carrier ${missing.join(', ')} was emitted for the wrong style target.`
        : `Missing SSR component style carrier ${missing.join(', ')}.`,
    );
  }
  if (carriers.length > manifest.entries.length) {
    throw hydrationStyleError(manifest, 'extra', 'The hydration target contains extra SSR style carriers.');
  }
  const explicitOwner = createStyleSheetOwner(root);
  const selectedById = new Map(selection.entries.map((entry) => [entry.id, entry]));
  for (let index = 0; index < manifest.entries.length; index += 1) {
    const entry = manifest.entries[index]!;
    const carrier = carriers[index]!;
    if (carrier.dataset.gluonStyle !== entry.id) {
      explicitOwner.dispose();
      throw hydrationStyleError(manifest, 'reordered', `SSR style carrier ${index} is not ${entry.id}.`);
    }
    if (carrier.dataset.gluonDigest !== entry.digest) {
      explicitOwner.dispose();
      throw hydrationStyleError(manifest, 'mismatched', `SSR style carrier ${entry.id} has a mismatched digest.`);
    }
    if ((carrier.textContent ?? '').replace(/<\\\/style/gi, '</style') !== entry.cssText) {
      explicitOwner.dispose();
      throw hydrationStyleError(manifest, 'mismatched', `SSR style carrier ${entry.id} CSS does not match its manifest entry.`);
    }
    const selected = selectedById.get(entry.id);
    if (selected && selected.scope !== 'gluon-component') {
      explicitOwner.retain(selected.sheet);
    } else if (!selected) {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(entry.cssText);
      if (getStyleSheetText(sheet).length === 0 && entry.cssText.length > 0) {
        explicitOwner.dispose();
        throw new SsrTransportError(`SSR style carrier ${entry.id} could not be constructed.`);
      }
      explicitOwner.retain(sheet);
    }
  }
  let complete = false;
  return {
    commit() {
      if (complete) return;
      complete = true;
      for (const carrier of carriers) carrier.remove();
    },
    rollback() {
      if (complete) return;
      complete = true;
      explicitOwner.dispose();
    },
    dispose() { explicitOwner.dispose(); },
  };
}

function hydrationStyleError(
  manifest: StyleManifest,
  mismatch: ComponentStyleHydrationMismatch,
  message: string,
): ComponentStyleHydrationError | SsrTransportError {
  return manifest.entries.some((entry) => entry.scope === 'gluon-component')
    ? new ComponentStyleHydrationError(mismatch, message)
    : new SsrTransportError(message);
}

/** Hydrates one created application, then mounts its reactive client runtime on the retained root. */
export async function hydrateApplication<Public = unknown>(
  app: GluonApp<Public>,
  container: AppContainer,
  options: HydrateTemplateOptions = {},
): Promise<HydratedApplication<Public>> {
  const root = renderGluonApplicationForServer(app);
  const prepared = await prepareForHydration(root);
  if (!(prepared.value instanceof TemplateResult)) {
    throw new TypeError('A Gluon application hydration root must resolve to a TemplateResult.');
  }
  const selection = mergeHydrationSelections(
    options.styleSelection,
    createComponentStyleSelection(prepared.value),
  );
  const manifest = options.styles ?? (selection.entries.length > 0 ? createStyleManifest(selection) : undefined);
  const handoff = manifest
    ? prepareStyleHandoff(options.styleRoot ?? container.getRootNode() as Document | ShadowRoot, manifest, selection)
    : undefined;
  try {
    const hydration = await app.run(() => hydrate(prepared.value as TemplateResult, container, {
      expectedMarkup: prepared.html,
      recovery: options.recovery,
      suppress: options.suppress,
      onMismatch: options.onMismatch,
      state: options.state,
    }));
    if (!hydration) throw new Error('The Gluon application hydration did not complete.');
    if (!hydration.retained && handoff) {
      unmount(container);
      throw new SsrTransportError(
        `DOM hydration recovery is incompatible with an active style handoff: ${hydration.mismatches.map((mismatch) => `${mismatch.category} ${mismatch.path} expected ${mismatch.expected} actual ${mismatch.actual}`).join('; ')}`,
      );
    }
    const mounted = app.mount(container);
    handoff?.commit();
    const mount: AppMount<Public> = handoff
      ? Object.freeze({
          app: mounted.app,
          container: mounted.container,
          get exposed() { return mounted.exposed; },
          unmount() {
            try {
              mounted.unmount();
            } finally {
              handoff.dispose();
            }
          },
        })
      : mounted;
    return Object.freeze({ hydration, mount });
  } catch (error) {
    handoff?.rollback();
    throw error;
  }
}

function mergeHydrationSelections(
  explicit: StyleSheetSelection | undefined,
  components: StyleSheetSelection,
): StyleSheetSelection {
  const entries = [...(explicit?.entries ?? []), ...components.entries];
  const ids = new Set<string>();
  return createStyleSheetSelection(entries.filter((entry) => {
    if (ids.has(entry.id)) return false;
    ids.add(entry.id);
    return true;
  }));
}

export interface RequestHydrationState<Data = unknown> {
  readonly router: RouterSnapshot;
  readonly store: StoreSnapshot;
  readonly data: Data;
}

/** Applies validated request snapshots before the browser application is created or mounted. */
export async function hydrateRequestState<Data = unknown>(
  state: RequestHydrationState<Data>,
  router: Router,
  store: StoreManager,
): Promise<Data> {
  store.hydrate(state.store);
  await router.hydrate(state.router);
  return state.data;
}

/** Reads the inert JSON carrier emitted by renderRequest(). */
export function readHydrationState<Data = unknown>(
  root: ParentNode = document,
): RequestHydrationState<Data> {
  const carrier = root.querySelector<HTMLScriptElement>('script[data-gluon-state][type="application/json"]');
  if (!carrier) throw new Error('The Gluon hydration state carrier was not found.');
  const parsed = JSON.parse(carrier.textContent ?? '') as unknown;
  if (!parsed || typeof parsed !== 'object' || !('router' in parsed) || !('store' in parsed)) {
    throw new TypeError('The Gluon hydration state carrier is invalid.');
  }
  return parsed as RequestHydrationState<Data>;
}
