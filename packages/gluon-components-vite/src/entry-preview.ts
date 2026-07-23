import {
  isTemplateResult,
  render as renderGluon,
  unmount,
  type TemplateResult,
} from '@gluonjs/core';
import { simulatePageLoad } from 'storybook/preview-api';
import type {
  Args,
  RenderContext,
  StoryContext,
} from 'storybook/internal/types';
import type { GluonRenderer } from './index.js';

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
export function renderToCanvas(
  {
    storyFn,
    showMain,
    showError,
    forceRemount,
    kind,
    name,
  }: RenderContext<GluonRenderer>,
  canvasElement: HTMLElement,
): () => void {
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

  renderGluon(result, canvasElement);
  simulatePageLoad(canvasElement);
  return () => unmount(canvasElement);
}
