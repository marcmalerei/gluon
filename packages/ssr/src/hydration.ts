import {
  hydrate,
  getStyleSheetText,
  renderGluonApplicationForServer,
  TemplateResult,
  type AppContainer,
  type AppMount,
  type GluonApp,
  type GluonElement,
  type HydrationMismatchCategory,
  type HydrationResult,
} from '@gluonjs/core';
import type { Router, RouterSnapshot } from '@gluonjs/router/memory';
import type { StoreManager, StoreSnapshot } from '@gluonjs/store';
import { prepareForHydration } from './index.js';
import type { StyleManifest } from './index.js';

export interface HydrateTemplateOptions {
  readonly recovery?: 'replace' | 'throw';
  readonly suppress?: boolean | readonly HydrationMismatchCategory[];
  readonly onMismatch?: Parameters<typeof hydrate>[2]['onMismatch'];
  readonly state?: { readonly server: unknown; readonly client: unknown };
  readonly styles?: StyleManifest;
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
  const handoff = options.styles
    ? prepareStyleHandoff(options.styleRoot ?? container.getRootNode() as Document | ShadowRoot, options.styles)
    : undefined;
  try {
    const result = hydrate(prepared.value, container, {
      expectedMarkup: prepared.html,
      recovery: options.recovery,
      suppress: options.suppress,
      onMismatch: options.onMismatch,
      state: options.state,
    });
    if (!result.retained && handoff) throw new SsrTransportError('DOM hydration recovery is incompatible with an active style handoff.');
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

function prepareStyleHandoff(root: Document | ShadowRoot, manifest: StyleManifest) {
  if (!('adoptedStyleSheets' in root)) throw new SsrTransportError('The hydration root does not support adoptedStyleSheets.');
  const carriers = [...root.querySelectorAll<HTMLStyleElement>('style[data-gluon-style]')];
  if (carriers.length !== manifest.entries.length) throw new SsrTransportError('The SSR style carrier count does not match the manifest.');
  const sheets: CSSStyleSheet[] = [];
  for (let index = 0; index < manifest.entries.length; index += 1) {
    const entry = manifest.entries[index]!;
    const carrier = carriers[index]!;
    if (carrier.dataset.gluonStyle !== entry.id || carrier.dataset.gluonDigest !== entry.digest) {
      throw new SsrTransportError(`SSR style carrier ${index} does not match manifest order or digest.`);
    }
    if ((carrier.textContent ?? '').replace(/<\\\/style/gi, '</style') !== entry.cssText) {
      throw new SsrTransportError(`SSR style carrier ${entry.id} CSS does not match its manifest entry.`);
    }
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(entry.cssText);
    if (getStyleSheetText(sheet).length === 0 && entry.cssText.length > 0) {
      throw new SsrTransportError(`SSR style carrier ${entry.id} could not be constructed.`);
    }
    sheets.push(sheet);
  }
  const previous = [...root.adoptedStyleSheets];
  root.adoptedStyleSheets = [...previous, ...sheets.filter((sheet) => !previous.includes(sheet))];
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
      root.adoptedStyleSheets = previous;
    },
  };
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
  const handoff = options.styles
    ? prepareStyleHandoff(options.styleRoot ?? container.getRootNode() as Document | ShadowRoot, options.styles)
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
    if (!hydration.retained && handoff) throw new SsrTransportError(
      `DOM hydration recovery is incompatible with an active style handoff: ${hydration.mismatches.map((mismatch) => `${mismatch.category} ${mismatch.path} expected ${mismatch.expected} actual ${mismatch.actual}`).join('; ')}`,
    );
    const mount = app.mount(container);
    handoff?.commit();
    return Object.freeze({ hydration, mount });
  } catch (error) {
    handoff?.rollback();
    throw error;
  }
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
