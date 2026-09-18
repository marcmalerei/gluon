import {
  createComponentStyleDependency,
  css,
  defineElement,
  event,
  GluonElement,
  html,
  type TemplateResult,
} from '@gluonjs/core';
import { renderElement } from '@gluonjs/ssr';
import {
  type GluonRenderer,
} from '@gluonjs/gluon-components-vite';
import {
  parameters,
  render as renderStory,
  renderToCanvas,
} from '../packages/gluon-components-vite/src/entry-preview.js';
import type {
  Args,
  RenderContext,
  StoryContext,
} from 'storybook/internal/types';
import { describe, expect, it, vi } from 'vitest';

describe('@gluonjs/gluon-components-vite', () => {
  it('identifies the native renderer and invokes component metadata', () => {
    expect(parameters).toEqual({ renderer: 'gluon' });
    const component = vi.fn((args: Args) => html`<p>${String(args.label)}</p>`);
    const result = renderStory(
      { label: 'Available' },
      { id: 'stock--available', component } as unknown as StoryContext<GluonRenderer>,
    );

    expect(component).toHaveBeenCalledOnce();
    expect(result).toBeInstanceOf(Object);
  });

  it('requires component metadata when no story render function exists', () => {
    expect(() => renderStory(
      {},
      { id: 'missing--component' } as StoryContext<GluonRenderer>,
    )).toThrow('requires a Gluon component function or an explicit render function');
  });

  it('renders, updates, and exactly tears down templates and styles', async () => {
    const canvas = document.createElement('div');
    document.body.append(canvas);
    const sheet = css`button { color: rgb(1 2 3); }`;
    const styles = createComponentStyleDependency({
      id: 'storybook-renderer-test',
      sheet,
      layer: 'atom',
      order: 0,
    });
    const click = vi.fn();
    let label = 'First';
    const storyFn = () => html`
      <button @click=${event(click)}>${label}</button>
    `.withStyleDependencies([styles]);
    const first = context(storyFn);

    const cleanup = await renderToCanvas(first.value, canvas);
    expect(first.showMain).toHaveBeenCalledOnce();
    expect(first.showError).not.toHaveBeenCalled();
    expect(canvas.querySelector('button')?.textContent).toBe('First');
    expect(document.adoptedStyleSheets).toContain(sheet);
    canvas.querySelector('button')?.click();
    expect(click).toHaveBeenCalledOnce();

    label = 'Second';
    await renderToCanvas(context(storyFn).value, canvas);
    expect(canvas.querySelector('button')?.textContent).toBe('Second');

    cleanup();
    expect(canvas.childNodes).toHaveLength(0);
    expect(document.adoptedStyleSheets).not.toContain(sheet);
    canvas.remove();
  });

  it('clears a previous root on forced remount', async () => {
    const canvas = document.createElement('div');
    const firstButton = html`<button>First</button>`;
    await renderToCanvas(context(() => firstButton).value, canvas);
    const previous = canvas.querySelector('button');

    await renderToCanvas(context(() => html`<button>Second</button>`, true).value, canvas);

    expect(canvas.querySelector('button')?.textContent).toBe('Second');
    expect(canvas.querySelector('button')).not.toBe(previous);
  });

  it('reports non-Gluon story values and leaves the canvas empty', async () => {
    const canvas = document.createElement('div');
    canvas.append(document.createElement('span'));
    const invalid = context(() => 'not a Gluon template' as unknown as TemplateResult);

    const cleanup = await renderToCanvas(invalid.value, canvas);

    expect(invalid.showMain).toHaveBeenCalledOnce();
    expect(invalid.showError).toHaveBeenCalledWith({
      title: 'Expected a Gluon template from "Example" of "Components".',
      description: 'Return html`...` or svg`...` from the story render function.',
    });
    expect(canvas.childNodes).toHaveLength(0);
    cleanup();
  });

  it('strictly retains, hydrates, and tears down a styled SSR template story', async () => {
    const canvas = document.createElement('div');
    document.body.append(canvas);
    const sheet = css`button { color: rgb(1 2 3); }`;
    const styles = createComponentStyleDependency({
      id: 'storybook-ssr-template-test',
      sheet,
      layer: 'atom',
      order: 0,
    });
    const click = vi.fn();
    const story = context(
      () => html`<button @click=${event(click)}>Hydrated</button>`.withStyleDependencies([styles]),
      false,
      true,
    );

    const cleanup = await renderToCanvas(story.value, canvas);

    expect(story.showError).not.toHaveBeenCalled();
    expect(canvas.dataset.gluonSsrHydration).toBe('retained');
    expect(canvas.querySelector('button')?.textContent).toBe('Hydrated');
    expect(document.adoptedStyleSheets).toContain(sheet);
    expect(document.head.querySelector('[data-gluon-style]')).toBeNull();
    canvas.querySelector('button')?.click();
    expect(click).toHaveBeenCalledOnce();

    cleanup();
    expect(canvas.childNodes).toHaveLength(0);
    expect(canvas.dataset.gluonSsrHydration).toBeUndefined();
    expect(document.adoptedStyleSheets).not.toContain(sheet);
    canvas.remove();
  });

  it('hydrates nested server-rendered Gluon elements in a story canvas', async () => {
    const canvas = document.createElement('div');
    document.body.append(canvas);
    const story = context(
      () => html`<section>${renderElement(StorybookHydratedElement, { properties: { count: 0 } })}</section>`,
      false,
      true,
    );

    const cleanup = await renderToCanvas(story.value, canvas);
    const host = canvas.querySelector<StorybookHydratedElement>('storybook-hydrated-element');
    const button = host?.shadowRoot?.querySelector<HTMLButtonElement>('button');
    const output = host?.shadowRoot?.querySelector('output');

    expect(story.showError).not.toHaveBeenCalled();
    expect(host?.hasAttribute('data-gluon-hydration')).toBe(false);
    expect(output?.textContent).toBe('0');
    button?.click();
    await host?.updateComplete;
    expect(output?.textContent).toBe('1');

    cleanup();
    canvas.remove();
  });
});

class StorybookHydratedElement extends GluonElement {
  static override readonly properties = {
    count: { type: Number, default: 0, reflect: true },
  };

  declare count: number;

  protected override render(): TemplateResult {
    return html`<button type="button" @click=${() => { this.count += 1; }}>Increase</button><output>${this.count}</output>`;
  }
}

defineElement('storybook-hydrated-element', StorybookHydratedElement);

function context(
  storyFn: () => TemplateResult,
  forceRemount = false,
  ssrHydration = false,
): {
  value: RenderContext<GluonRenderer>;
  showMain: ReturnType<typeof vi.fn>;
  showError: ReturnType<typeof vi.fn>;
} {
  const showMain = vi.fn();
  const showError = vi.fn();
  return {
    value: {
      storyFn,
      showMain,
      showError,
      forceRemount,
      kind: 'Components',
      name: 'Example',
      storyContext: {
        parameters: ssrHydration ? { gluon: { ssrHydration: true } } : {},
      },
    } as unknown as RenderContext<GluonRenderer>,
    showMain,
    showError,
  };
}
