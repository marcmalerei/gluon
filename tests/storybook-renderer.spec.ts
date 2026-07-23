import {
  createComponentStyleDependency,
  css,
  event,
  html,
  type TemplateResult,
} from '@gluonjs/core';
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

  it('renders, updates, and exactly tears down templates and styles', () => {
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

    const cleanup = renderToCanvas(first.value, canvas);
    expect(first.showMain).toHaveBeenCalledOnce();
    expect(first.showError).not.toHaveBeenCalled();
    expect(canvas.querySelector('button')?.textContent).toBe('First');
    expect(document.adoptedStyleSheets).toContain(sheet);
    canvas.querySelector('button')?.click();
    expect(click).toHaveBeenCalledOnce();

    label = 'Second';
    renderToCanvas(context(storyFn).value, canvas);
    expect(canvas.querySelector('button')?.textContent).toBe('Second');

    cleanup();
    expect(canvas.childNodes).toHaveLength(0);
    expect(document.adoptedStyleSheets).not.toContain(sheet);
    canvas.remove();
  });

  it('clears a previous root on forced remount', () => {
    const canvas = document.createElement('div');
    const firstButton = html`<button>First</button>`;
    renderToCanvas(context(() => firstButton).value, canvas);
    const previous = canvas.querySelector('button');

    renderToCanvas(context(() => html`<button>Second</button>`, true).value, canvas);

    expect(canvas.querySelector('button')?.textContent).toBe('Second');
    expect(canvas.querySelector('button')).not.toBe(previous);
  });

  it('reports non-Gluon story values and leaves the canvas empty', () => {
    const canvas = document.createElement('div');
    canvas.append(document.createElement('span'));
    const invalid = context(() => 'not a Gluon template' as unknown as TemplateResult);

    const cleanup = renderToCanvas(invalid.value, canvas);

    expect(invalid.showMain).toHaveBeenCalledOnce();
    expect(invalid.showError).toHaveBeenCalledWith({
      title: 'Expected a Gluon template from "Example" of "Components".',
      description: 'Return html`...` or svg`...` from the story render function.',
    });
    expect(canvas.childNodes).toHaveLength(0);
    cleanup();
  });
});

function context(
  storyFn: () => TemplateResult,
  forceRemount = false,
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
    } as unknown as RenderContext<GluonRenderer>,
    showMain,
    showError,
  };
}
