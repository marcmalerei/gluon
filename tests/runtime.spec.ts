import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  directive,
  html,
  render,
  type PartController,
} from '../src/index.js';

describe('template runtime', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('mounts a template and reuses an unchanged text node on update', () => {
    const root = document.createElement('div');
    const view = (name: string) => html`<h1>Hello ${name}</h1>`;

    render(view('Ada'), root);
    const text = root.querySelector('h1')?.firstChild;

    render(view('Grace'), root);

    expect(root.textContent).toBe('Hello Grace');
    expect(root.querySelector('h1')?.firstChild).toBe(text);
  });

  it('updates nested templates and arrays without replacing cached elements', () => {
    const root = document.createElement('div');
    const item = (label: string) => html`<li>${label}</li>`;
    const view = (labels: readonly string[]) => html`<ul>${labels.map(item)}</ul>`;

    render(view(['one', 'two']), root);
    const first = root.querySelector('li');

    render(view(['ONE', 'two', 'three']), root);

    expect([...root.querySelectorAll('li')].map((node) => node.textContent)).toEqual([
      'ONE',
      'two',
      'three',
    ]);
    expect(root.querySelector('li')).toBe(first);
  });

  it('supports attribute, property, boolean, and event bindings with cleanup', () => {
    const root = document.createElement('div');
    const firstHandler = vi.fn();
    const secondHandler = vi.fn();
    const payload = { id: 1 };
    const view = (
      title: string | null,
      disabled: boolean,
      handler: EventListener | null,
    ) => html`
      <button
        title=${title}
        .payload=${payload}
        ?disabled=${disabled}
        @click=${handler}
      >Run</button>
    `;

    render(view('First', true, firstHandler), root);
    const button = root.querySelector('button') as HTMLButtonElement & { payload?: unknown };
    button.dispatchEvent(new MouseEvent('click'));

    expect(button.title).toBe('First');
    expect(button.disabled).toBe(true);
    expect(button.payload).toBe(payload);
    expect(firstHandler).toHaveBeenCalledTimes(1);

    render(view(null, false, secondHandler), root);
    button.click();

    expect(button.hasAttribute('title')).toBe(false);
    expect(button.disabled).toBe(false);
    expect(firstHandler).toHaveBeenCalledTimes(1);
    expect(secondHandler).toHaveBeenCalledTimes(1);
  });

  it('spreads and reconciles classes, styles, data, aria, refs, and events', () => {
    const root = document.createElement('div');
    const firstClick = vi.fn();
    const secondClick = vi.fn();
    const firstRef: { value?: Element } = {};
    const secondRef: { value?: Element } = {};
    const view = (props: Readonly<Record<string, unknown>>) => html`
      <button data-external="keep" ...=${props}>Save</button>
    `;

    render(view({
      class: { action: true, inactive: false },
      style: { color: 'red', fontWeight: 700 },
      data: { trackId: 'alpha', stale: 'remove-me' },
      aria: { label: 'Save', expanded: false },
      ref: firstRef,
      onClick: firstClick,
    }), root);

    const button = root.querySelector('button') as HTMLButtonElement;
    button.click();
    expect(button.className).toBe('action');
    expect(button.style.color).toBe('red');
    expect(button.dataset.trackId).toBe('alpha');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(firstRef.value).toBe(button);

    render(view({
      class: ['action', 'is-ready'],
      style: { color: 'blue' },
      data: { trackId: 'beta' },
      aria: { label: 'Save now' },
      ref: secondRef,
      onClick: secondClick,
    }), root);
    button.click();

    expect(button.className).toBe('action is-ready');
    expect(button.style.color).toBe('blue');
    expect(button.style.fontWeight).toBe('');
    expect(button.dataset.trackId).toBe('beta');
    expect(button.dataset.stale).toBeUndefined();
    expect(button.getAttribute('data-external')).toBe('keep');
    expect(button.hasAttribute('aria-expanded')).toBe(false);
    expect(firstRef.value).toBeUndefined();
    expect(secondRef.value).toBe(button);
    expect(firstClick).toHaveBeenCalledTimes(1);
    expect(secondClick).toHaveBeenCalledTimes(1);
  });

  it('runs custom directives against a part controller', () => {
    const root = document.createElement('div');
    const upper = directive((value: string) => (part: PartController) => {
      part.setValue(value.toUpperCase());
    });

    render(html`<p>${upper('gluon')}</p>`, root);

    expect(root.textContent).toBe('GLUON');
  });

  it('disconnects refs when the root template shape changes', () => {
    const root = document.createElement('div');
    const ref: { value?: Element } = {};

    render(html`<button ...=${{ ref }}>Save</button>`, root);
    expect(ref.value).toBe(root.querySelector('button'));

    render(html`<p>Replaced</p>`, root);
    expect(ref.value).toBeUndefined();
  });

  it('rejects partial attribute interpolation with an actionable error', () => {
    const root = document.createElement('div');
    const invalid = (value: string) => html`<div class="prefix ${value}"></div>`;

    expect(() => render(invalid('active'), root)).toThrow(/complete child or attribute value/i);
  });
});
