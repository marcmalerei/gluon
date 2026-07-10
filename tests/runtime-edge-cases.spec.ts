import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  html,
  isTemplateResult,
  nothing,
  render,
  svg,
  type TemplateResult,
  type TemplateValue,
} from '../src/index.js';

describe('template runtime edge cases', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('renders empty values, DOM nodes, nested arrays, and SVG templates', () => {
    const root = document.createElement('div');
    const view = (value: TemplateValue) => html`<section>${value}</section>`;

    render(view('same'), root);
    const text = root.querySelector('section')?.firstChild;
    render(view('same'), root);
    expect(root.querySelector('section')?.firstChild).toBe(text);

    render(view(false), root);
    expect(root.querySelector('section')?.textContent).toBe('');

    const strong = document.createElement('strong');
    strong.textContent = 'node';
    render(view(strong), root);
    expect(root.querySelector('strong')).toBe(strong);

    render(view(['a', [1, true, null, nothing, strong]]), root);
    expect(root.querySelector('section')?.textContent).toBe('a1truenode');
    expect(root.querySelector('strong')).toBe(strong);

    const graphic = svg`<svg viewBox="0 0 10 10"><circle cx=${5} cy=${5} r=${4}></circle></svg>`;
    expect(isTemplateResult(graphic)).toBe(true);
    expect(isTemplateResult({})).toBe(false);
    render(graphic, root);
    expect(root.querySelector('circle')?.namespaceURI).toBe('http://www.w3.org/2000/svg');
  });

  it('renders into document fragments, ignores null containers, and rejects invalid input', () => {
    const fragment = document.createDocumentFragment();

    render(html`<p>${'fragment'}</p>`, fragment);
    expect(fragment.textContent).toBe('fragment');

    expect(() => render({} as TemplateResult, fragment)).toThrow(/expects a TemplateResult/i);
    expect(() => render(html`<p>ignored</p>`, null)).not.toThrow();
  });

  it('disconnects attribute and array event listeners when their templates leave the tree', () => {
    const root = document.createElement('div');
    const rootListener = { handleEvent: vi.fn() };
    const itemListener = vi.fn();
    const item = (label: string) => html`<button @click=${itemListener}>${label}</button>`;
    const list = (labels: readonly string[]) => html`<div>${labels.map(item)}</div>`;

    render(html`<button @click=${rootListener}>Root</button>`, root);
    const rootButton = root.querySelector('button') as HTMLButtonElement;
    rootButton.click();
    render(html`<p>replacement</p>`, root);
    rootButton.click();
    expect(rootListener.handleEvent).toHaveBeenCalledOnce();

    render(list(['one', 'two']), root);
    const buttons = [...root.querySelectorAll('button')] as HTMLButtonElement[];
    buttons[1]?.click();
    render(list(['one']), root);
    buttons[1]?.click();
    expect(itemListener).toHaveBeenCalledOnce();
  });

  it('reconciles every spread binding category across value and removal transitions', () => {
    const root = document.createElement('div');
    const callbackRef = vi.fn<(element: Element | undefined) => void>();
    const objectRef: { value?: Element } = {};
    const firstListener = { handleEvent: vi.fn() };
    const secondListener = vi.fn();
    const view = (props: Readonly<Record<string, unknown>>) => html`<button ...=${props}>Save</button>`;
    const initial = {
      className: ['action', { active: true }, false],
      style: 'color: red; font-weight: 700;',
      dataset: { trackId: 'alpha', removeMe: 'yes' },
      aria: { label: 'Save', hidden: null },
      ref: callbackRef,
      '@click': firstListener,
      '.value': 'first',
      '?disabled': true,
      title: 'Initial',
    };

    render(view(initial), root);
    const button = root.querySelector('button') as HTMLButtonElement & { value?: unknown };
    button.dispatchEvent(new MouseEvent('click'));
    render(view(initial), root);
    expect(callbackRef).toHaveBeenCalledTimes(1);
    expect(firstListener.handleEvent).toHaveBeenCalledOnce();
    expect(button.className).toBe('action active');
    expect(button.style.color).toBe('red');
    expect(button.dataset.trackId).toBe('alpha');
    expect(button.getAttribute('aria-hidden')).toBeNull();
    expect(button.value).toBe('first');
    expect(button.disabled).toBe(true);

    render(view({
      class: null,
      style: {
        '--accent': 'blue',
        'font-size': '12px',
        opacity: 0.5,
        color: null,
      },
      data: { trackId: 'beta', ignored: null },
      aria: { expanded: false, label: null },
      ref: objectRef,
      onClick: secondListener,
      '.value': 'second',
      '?disabled': false,
      title: false,
    }), root);
    button.click();

    expect(callbackRef).toHaveBeenLastCalledWith(undefined);
    expect(objectRef.value).toBe(button);
    expect(firstListener.handleEvent).toHaveBeenCalledOnce();
    expect(secondListener).toHaveBeenCalledOnce();
    expect(button.hasAttribute('class')).toBe(false);
    expect(button.style.getPropertyValue('--accent')).toBe('blue');
    expect(button.style.fontSize).toBe('12px');
    expect(button.style.opacity).toBe('0.5');
    expect(button.dataset.trackId).toBe('beta');
    expect(button.dataset.removeMe).toBeUndefined();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.hasAttribute('aria-label')).toBe(false);
    expect(button.value).toBe('second');
    expect(button.disabled).toBe(false);
    expect(button.hasAttribute('title')).toBe(false);

    render(view({}), root);
    button.click();
    expect(objectRef.value).toBeUndefined();
    expect(secondListener).toHaveBeenCalledOnce();
    expect(button.style.length).toBe(0);
    expect(button.hasAttribute('data-track-id')).toBe(false);
    expect(button.hasAttribute('aria-expanded')).toBe(false);
    expect(button.value).toBe('undefined');
  });

  it('rejects expressions that the HTML parser cannot represent as parts', () => {
    const root = document.createElement('div');
    const invalid = (value: string) => html`<textarea>${value}</textarea>`;

    expect(() => render(invalid('content'), root)).toThrow(/complete child or attribute value/i);
  });
});
