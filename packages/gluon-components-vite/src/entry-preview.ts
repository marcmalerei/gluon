import {
  createComponentStyleSelection,
  isTemplateResult,
  render as renderGluon,
  unmount,
  type TemplateResult,
} from '@gluonjs/core';
import {
  createStyleManifest,
  prepareForHydration,
} from '@gluonjs/ssr';
import { hydrateTemplate } from '@gluonjs/ssr/hydration';
import { simulatePageLoad } from 'storybook/preview-api';
import type {
  Args,
  RenderContext,
  StoryContext,
} from 'storybook/internal/types';
import type { GluonRenderer, GluonStoryParameters } from './index.js';

/** @internal Identifies this preview as Gluon's native renderer. */
export const parameters = {
  renderer: 'gluon',
};

/**
 * Default story render for a functional component supplied through Storybook's
 * `component` metadata.
 *
 * @internal
 */
export function render(
  args: Args,
  context: StoryContext<GluonRenderer>,
): TemplateResult {
  const component = context.component;
  if (typeof component !== 'function') {
    throw new TypeError(
      `Story ${context.id} requires a Gluon component function or an explicit render function.`,
    );
  }
  return component(args, context);
}

/**
 * Renders one Gluon `TemplateResult` into Storybook's canvas and returns exact
 * renderer cleanup for story changes and unmounts.
 *
 * @internal
 */
export async function renderToCanvas(
  {
    storyFn,
    showMain,
    showError,
    forceRemount,
    kind,
    name,
    storyContext,
  }: RenderContext<GluonRenderer>,
  canvasElement: HTMLElement,
): Promise<() => void> {
  if (forceRemount) unmount(canvasElement);
  const result = storyFn();
  showMain();

  if (!isTemplateResult(result)) {
    showError({
      title: `Expected a Gluon template from "${name}" of "${kind}".`,
      description: 'Return html`...` or svg`...` from the story render function.',
    });
    unmount(canvasElement);
    return () => unmount(canvasElement);
  }

  if (usesSsrHydration(storyContext.parameters)) {
    return queueSsrHydration(async () => renderSsrHydrationStory(result, canvasElement, { kind, name, showError }));
  }

  renderGluon(result, canvasElement);
  simulatePageLoad(canvasElement);
  return () => unmount(canvasElement);
}

let ssrHydrationQueue = Promise.resolve();

function queueSsrHydration<Task>(task: () => Promise<Task>): Promise<Task> {
  const next = ssrHydrationQueue.then(task, task);
  ssrHydrationQueue = next.then(() => undefined, () => undefined);
  return next;
}

async function renderSsrHydrationStory(
  result: TemplateResult,
  canvasElement: HTMLElement,
  context: Pick<RenderContext<GluonRenderer>, 'kind' | 'name' | 'showError'>,
): Promise<() => void> {
  const document = canvasElement.ownerDocument;
  const carriers: HTMLStyleElement[] = [];
  const mismatches: string[] = [];
  try {
    unmount(canvasElement);
    const prepared = await prepareForHydration(result);
    if (!isTemplateResult(prepared.value)) {
      throw new TypeError('A Gluon SSR story must resolve to an html`...` or svg`...` template.');
    }
    const styles = createStyleManifest(createComponentStyleSelection(prepared.value));
    carriers.push(...appendStyleCarriers(document, styles));
    // `innerHTML` does not materialize Declarative Shadow DOM and Chromium
    // warns about the transport attribute. Keep it inert until the portable
    // materialization step below handles every nested root.
    canvasElement.innerHTML = prepared.html.replaceAll('<template shadowrootmode=', '<template data-gluon-shadowrootmode=');
    materializeDeclarativeShadowRoots(canvasElement);
    const hydration = await hydrateTemplate(prepared.value, canvasElement, {
      hydrateElements: true,
      onMismatch: (mismatch) => mismatches.push(`${mismatch.category} at ${mismatch.path}`),
      recovery: 'throw',
      styles,
      styleRoot: document,
    });
    if (!hydration.retained || hydration.recovered) {
      throw new Error(`Gluon SSR story hydration must retain the server-rendered DOM${mismatches.length ? ` (${mismatches.join(', ')})` : ''}.`);
    }
    canvasElement.dataset.gluonSsrHydration = 'retained';
    simulatePageLoad(canvasElement);
    return () => {
      delete canvasElement.dataset.gluonSsrHydration;
      unmount(canvasElement);
      for (const carrier of carriers) carrier.remove();
    };
  } catch (error) {
    delete canvasElement.dataset.gluonSsrHydration;
    unmount(canvasElement);
    for (const carrier of carriers) carrier.remove();
    context.showError({
      title: `SSR hydration failed for "${context.name}" of "${context.kind}".`,
      description: `${error instanceof Error ? error.message : String(error)}${mismatches.length ? ` (${mismatches.join(', ')})` : ''}`,
    });
    return () => unmount(canvasElement);
  }
}

function usesSsrHydration(parameters: unknown): boolean {
  const gluon = (parameters as GluonStoryParameters | undefined)?.gluon;
  if (!gluon) return false;
  const configured = gluon.ssrHydration;
  return configured === true || (typeof configured === 'object' && configured?.enabled === true);
}

function appendStyleCarriers(
  document: Document,
  manifest: ReturnType<typeof createStyleManifest>,
): HTMLStyleElement[] {
  const carriers = manifest.entries.map((entry) => {
    const carrier = document.createElement('style');
    carrier.dataset.gluonStyle = entry.id;
    carrier.dataset.gluonDigest = entry.digest;
    if (entry.scope) carrier.dataset.gluonStyleScope = entry.scope;
    carrier.textContent = entry.cssText;
    return carrier;
  });
  document.head.append(...carriers);
  return carriers;
}

function materializeDeclarativeShadowRoots(root: ParentNode): void {
  for (const template of [...root.querySelectorAll<HTMLTemplateElement>('template[data-gluon-shadowrootmode]')]) {
    const host = template.parentElement;
    if (!host) continue;
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    shadow.replaceChildren(template.content.cloneNode(true));
    template.remove();
    materializeDeclarativeShadowRoots(shadow);
  }
}
