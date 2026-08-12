import {
  createComponentStyleSelection,
  createStyleSheetOwner,
  createStyleSheetSelection,
  hydrate,
  GluonElement,
  getStyleSheetText,
  renderGluonApplicationForServer,
  TemplateResult,
  unmount,
  type AppContainer,
  type AppMount,
  type GluonApp,
  type HydrationMismatchCategory,
  type HydrationResult,
  type StyleSheetSelection,
} from '@gluonjs/core';
import type { Router, RouterSnapshot } from '@gluonjs/router/memory';
import type { StoreManager, StoreSnapshot } from '@gluonjs/store';
import {
  createStyleManifest,
  prepareForHydration,
  SSR_HYDRATION_MARKER_ATTRIBUTE,
} from './index.js';
import type { SsrHydrationMarkerTransport, StyleManifest } from './index.js';

export interface HydrateTemplateOptions {
  readonly recovery?: 'replace' | 'throw';
  readonly suppress?: boolean | readonly HydrationMismatchCategory[];
  readonly onMismatch?: Parameters<typeof hydrate>[2]['onMismatch'];
  readonly state?: { readonly server: unknown; readonly client: unknown };
  readonly styles?: StyleManifest;
  /** Exact application sheets combined with component styles discovered from the hydrated tree. */
  readonly styleSelection?: StyleSheetSelection;
  readonly styleRoot?: Document | ShadowRoot;
  /** @internal Set by hydrateElement() after validating the host transport attribute. */
  readonly markerTransport?: SsrHydrationMarkerTransport;
  /** @internal Nested roots reuse renderer-owned styles without consuming document carriers. */
  readonly skipStyleHandoff?: boolean;
  /** @internal Application hydration requires transport on server element roots. */
  readonly requireMarkerTransport?: boolean;
  /** @internal Prevents recursive nested-root hydration from visiting one host twice. */
  readonly hydratedElements?: Set<GluonElement>;
}

export interface HydratedApplication<Public = unknown> {
  readonly mount: AppMount<Public>;
  readonly hydration: HydrationResult;
}

export class SsrTransportError extends Error {
  readonly code = 'GLUON_UNSUPPORTED_SSR_TRANSPORT';
  constructor(message: string) {
    super(message);
    this.name = 'SsrTransportError';
  }
}

/** Hydrates the open Declarative Shadow DOM owned by one upgraded Gluon element. */
export async function hydrateElement(
  element: GluonElement,
  options: HydrateTemplateOptions = {},
): Promise<HydrationResult> {
  const root = element.shadowRoot;
  if (!root) throw new Error('A hydrated Gluon element requires an open declarative ShadowRoot.');
  const transport = readMarkerTransport(element, root, options.requireMarkerTransport === true);
  const nested = collectNestedGluonElements(root);
  const hydratedElements = options.hydratedElements ?? new Set<GluonElement>();
  if (hydratedElements.has(element)) {
    throw new Error('A Gluon element was scheduled for hydration more than once.');
  }
  hydratedElements.add(element);
  element.beginHydration();
  for (const child of nested) child.beginHydration();
  let completed = false;
  try {
    const result = await hydrateTemplate(element.renderForServer(), root, {
      ...options,
      ...(transport ? {
        markerTransport: transport,
        // A marker-range failure is transport corruption, never a recovery
        // opportunity. Preserve the original DSD for diagnosis.
        recovery: 'throw',
      } : {}),
    });
    for (const child of nested) {
      if (hydratedElements.has(child)) continue;
      await hydrateElement(child, {
        ...options,
        styles: undefined,
        styleRoot: undefined,
        skipStyleHandoff: true,
        requireMarkerTransport: options.requireMarkerTransport,
        hydratedElements,
      });
    }
    element.removeAttribute(SSR_HYDRATION_MARKER_ATTRIBUTE);
    for (const attribute of [...element.attributes]) {
      if (/^data-gluon-h-\d+$/.test(attribute.name)) element.removeAttribute(attribute.name);
    }
    completed = true;
    return result;
  } finally {
    if (completed) {
      for (const child of nested) child.endHydration();
      element.endHydration();
    }
  }
}

/** Resolves async server contracts once, validates marker DOM, and binds it in place. */
export async function hydrateTemplate(
  result: TemplateResult,
  container: AppContainer,
  options: HydrateTemplateOptions = {},
): Promise<HydrationResult> {
  const prepared = await prepareForHydration(result, options.markerTransport
    ? {
        markerOffset: options.markerTransport.start,
        omitServerElementShadowRoots: true,
      }
    : {});
  if (!(prepared.value instanceof TemplateResult)) {
    throw new TypeError('A hydration root must resolve to a TemplateResult.');
  }
  const selection = mergeHydrationSelections(
    options.styleSelection,
    createComponentStyleSelection(prepared.value),
  );
  const manifest = options.skipStyleHandoff
    ? undefined
    : options.styles ?? (selection.entries.length > 0 ? createStyleManifest(selection) : undefined);
  const handoff = manifest
    ? prepareStyleHandoff(options.styleRoot ?? container.getRootNode() as Document | ShadowRoot, manifest, selection)
    : undefined;
  try {
    const result = hydrate(prepared.value, container, {
      expectedMarkup: prepared.html,
      ...(options.markerTransport ? {
        markerOffset: options.markerTransport.start,
      } : {}),
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

export type HydrationMarkerTransportMismatch = 'missing' | 'invalid' | 'tampered';

export class HydrationMarkerTransportError extends SsrTransportError {
  constructor(
    readonly mismatch: HydrationMarkerTransportMismatch,
    message: string,
  ) {
    super(message);
    this.name = 'HydrationMarkerTransportError';
  }
}

function readMarkerTransport(
  element: GluonElement,
  root: ShadowRoot,
  required: boolean,
): SsrHydrationMarkerTransport | undefined {
  const encoded = element.getAttribute(SSR_HYDRATION_MARKER_ATTRIBUTE);
  if (encoded === null) {
    if (!required) return undefined;
    throw new HydrationMarkerTransportError(
      'missing',
      'Missing ' + SSR_HYDRATION_MARKER_ATTRIBUTE + ' on a server-rendered Gluon element.',
    );
  }
  const match = encoded.match(/^v([1-9]\d*):([0-9]+):([0-9]+)$/);
  if (!match) {
    throw new HydrationMarkerTransportError(
      'invalid',
      'Invalid ' + SSR_HYDRATION_MARKER_ATTRIBUTE + ' marker transport metadata.',
    );
  }
  const version = Number(match[1]);
  const start = Number(match[2]);
  const end = Number(match[3]);
  if (version !== 1 || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start
    || encoded !== 'v1:' + start + ':' + end) {
    throw new HydrationMarkerTransportError(
      'invalid',
      'Invalid ' + SSR_HYDRATION_MARKER_ATTRIBUTE + ' marker range.',
    );
  }
  const markers = [...root.childNodes]
    .flatMap((node) => collectMarkerNumbers(node))
    .filter((marker) => marker !== undefined) as number[];
  const actualStart = markers.length === 0 ? start : Math.min(...markers);
  const actualEnd = markers.length === 0 ? start : Math.max(...markers) + 1;
  if (actualStart !== start || actualEnd !== end) {
    throw new HydrationMarkerTransportError(
      'tampered',
      'The ' + SSR_HYDRATION_MARKER_ATTRIBUTE + ' marker range does not match the DSD markers.',
    );
  }
  return Object.freeze({ version: 1, start, end });
}

function collectMarkerNumbers(node: Node): Array<number | undefined> {
  const values: Array<number | undefined> = [];
  if (node instanceof Comment) {
    const match = node.data.match(/^gluon:(?:\/)?[hik]:(\d+)$/);
    if (match) values.push(Number(match[1]));
  }
  if (node instanceof Element) {
    for (const attribute of [...node.attributes]) {
      const match = attribute.name.match(/^data-gluon-h-(\d+)$/);
      if (match) values.push(Number(match[1]));
    }
  }
  for (const child of [...node.childNodes]) values.push(...collectMarkerNumbers(child));
  return values;
}

function collectNestedGluonElements(root: ParentNode): GluonElement[] {
  const elements: GluonElement[] = [];
  const visit = (scope: ParentNode): void => {
    for (const candidate of [...scope.querySelectorAll('*')]) {
      if (candidate instanceof GluonElement && isServerHydrationRoot(candidate)) {
        elements.push(candidate);
        if (candidate.shadowRoot) visit(candidate.shadowRoot);
      }
    }
  };
  visit(root);
  return elements;
}

function isServerHydrationRoot(element: GluonElement): boolean {
  if (element.hasAttribute(SSR_HYDRATION_MARKER_ATTRIBUTE)) return true;
  const root = element.shadowRoot;
  if (!root) return false;
  const visit = (node: Node): boolean => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 8 && /^gluon:(?:\/)?[hik]:\d+$/.test(child.textContent ?? '')) return true;
      if (visit(child)) return true;
    }
    return false;
  };
  return visit(root);
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
  const nested = collectNestedGluonElements(container as ParentNode);
  const hydratedElements = new Set<GluonElement>();
  for (const child of nested) {
    child.beginHydration();
  }
  let handoff: ReturnType<typeof prepareStyleHandoff> | undefined;
  let applicationRootHydrated = false;
  let completed = false;
  try {
    const root = renderGluonApplicationForServer(app);
    const prepared = await prepareForHydration(root, {
      // Nested server elements have already adopted their DSD templates into
      // their own roots before the application root is retained.
      omitServerElementShadowRoots: true,
    });
    if (!(prepared.value instanceof TemplateResult)) {
      throw new TypeError('A Gluon application hydration root must resolve to a TemplateResult.');
    }
    const selection = mergeHydrationSelections(
      options.styleSelection,
      createComponentStyleSelection(prepared.value),
    );
    const manifest = options.skipStyleHandoff
      ? undefined
      : options.styles ?? (selection.entries.length > 0 ? createStyleManifest(selection) : undefined);
    handoff = manifest
      ? prepareStyleHandoff(options.styleRoot ?? container.getRootNode() as Document | ShadowRoot, manifest, selection)
      : undefined;
    const hydration = await app.run(() => hydrate(prepared.value as TemplateResult, container, {
      expectedMarkup: prepared.html,
      recovery: options.recovery,
      suppress: options.suppress,
      onMismatch: options.onMismatch,
      state: options.state,
    }));
    if (!hydration) throw new Error('The Gluon application hydration did not complete.');
    applicationRootHydrated = hydration.retained;
    if (!hydration.retained && handoff) {
      unmount(container);
      throw new SsrTransportError(
        `DOM hydration recovery is incompatible with an active style handoff: ${hydration.mismatches.map((mismatch) => `${mismatch.category} ${mismatch.path} expected ${mismatch.expected} actual ${mismatch.actual}`).join('; ')}`,
      );
    }
    for (const child of nested) {
      if (hydratedElements.has(child)) continue;
      await hydrateElement(child, {
        ...options,
        styles: undefined,
        styleRoot: undefined,
        skipStyleHandoff: true,
        requireMarkerTransport: true,
        hydratedElements,
      });
    }
    const mounted = app.mount(container);
    const committedHandoff = handoff;
    committedHandoff?.commit();
    const mount: AppMount<Public> = committedHandoff
      ? Object.freeze({
          app: mounted.app,
          container: mounted.container,
          get exposed() { return mounted.exposed; },
          unmount() {
            try {
              mounted.unmount();
            } finally {
              committedHandoff.dispose();
            }
          },
        })
      : mounted;
    completed = true;
    return Object.freeze({ hydration, mount });
  } catch (error) {
    try {
      if (applicationRootHydrated) unmount(container);
    } finally {
      handoff?.rollback();
    }
    throw error;
  } finally {
    if (completed) {
      for (const child of nested) child.endHydration();
    }
  }
}

function mergeHydrationSelections(
  explicit: StyleSheetSelection | undefined,
  components: StyleSheetSelection,
): StyleSheetSelection {
  const explicitEntries = [...(explicit?.entries ?? [])];
  const insertAfter = explicitEntries.reduce(
    (last, entry, index) => entry.scope === 'gluon-ui' ? index : last,
    -1,
  ) + 1;
  const entries = [
    ...explicitEntries.slice(0, insertAfter),
    ...components.entries,
    ...explicitEntries.slice(insertAfter),
  ];
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
