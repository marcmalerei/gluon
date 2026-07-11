import {
  hydrate,
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

export interface HydrateTemplateOptions {
  readonly recovery?: 'replace' | 'throw';
  readonly suppress?: boolean | readonly HydrationMismatchCategory[];
  readonly onMismatch?: Parameters<typeof hydrate>[2]['onMismatch'];
  readonly state?: { readonly server: unknown; readonly client: unknown };
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
  return hydrate(prepared.value, container, {
    expectedMarkup: prepared.html,
    ...options,
  });
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
  const hydration = await app.run(() => hydrate(prepared.value as TemplateResult, container, {
    expectedMarkup: prepared.html,
    ...options,
  }));
  if (!hydration) throw new Error('The Gluon application hydration did not complete.');
  return Object.freeze({ hydration, mount: app.mount(container) });
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
