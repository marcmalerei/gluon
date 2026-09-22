import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  html,
  isTemplateResult,
  nothing,
  render,
  suspendRender,
  svg,
  unmount,
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

  it('skips stable spread writes and applies an isolated scalar change once', () => {
    const root = document.createElement('div');
    const click = vi.fn();
    const ref = { value: undefined as Element | undefined };
    const view = (title: string, label: string) => html`<button ...=${{
      class: ['action', { active: true }],
      style: { color: 'red', '--accent': 'blue' },
      data: { trackId: 'stable' },
      aria: { label: 'Stable action' },
      title,
      draggable: undefined,
      '?disabled': false,
      '.tabIndex': 0,
      onClick: click,
      ref,
    }}>${label}</button>`;

    render(view('Stable', 'First'), root);
    const button = root.querySelector('button') as HTMLButtonElement;
    const setAttribute = vi.spyOn(button, 'setAttribute');
    const removeAttribute = vi.spyOn(button, 'removeAttribute');

    render(view('Stable', 'Second'), root);
    expect(button.textContent).toBe('Second');
    expect(setAttribute).not.toHaveBeenCalled();
    expect(removeAttribute).not.toHaveBeenCalled();

    render(view('Changed', 'Third'), root);
    expect(setAttribute).toHaveBeenCalledOnce();
    expect(setAttribute).toHaveBeenLastCalledWith('title', 'Changed');
    expect(removeAttribute).not.toHaveBeenCalled();
  });

  it('detects in-place class, style, data, and ARIA map mutations', () => {
    const root = document.createElement('div');
    const classState = { active: true, quiet: false };
    const classNames = ['action', classState];
    const styles: Record<string, unknown> = { color: 'red', padding: '4px' };
    const data: Record<string, unknown> = { trackId: 'alpha', removeMe: 'yes' };
    const aria: Record<string, unknown> = { label: 'Initial', expanded: false };
    const props = { class: classNames, style: styles, data, aria };
    const view = () => html`<button ...=${props}>Save</button>`;

    render(view(), root);
    const button = root.querySelector('button') as HTMLButtonElement;
    classState.active = false;
    classState.quiet = true;
    styles.color = 'blue';
    delete styles.padding;
    data.trackId = 'beta';
    delete data.removeMe;
    aria.label = 'Changed';
    delete aria.expanded;
    render(view(), root);

    expect(button.className).toBe('action quiet');
    expect(button.style.color).toBe('blue');
    expect(button.style.padding).toBe('');
    expect(button.dataset.trackId).toBe('beta');
    expect(button.dataset.removeMe).toBeUndefined();
    expect(button.getAttribute('aria-label')).toBe('Changed');
    expect(button.hasAttribute('aria-expanded')).toBe(false);
  });

  it('preserves last-write ordering for overlapping spread aliases', () => {
    const root = document.createElement('div');
    const view = (className: string, dataValue: string) => html`<button ...=${{
      class: className,
      className: 'last-class',
      data: { track: dataValue },
      'data-track': 'last-data',
      '?disabled': true,
      disabled: false,
    }}>Save</button>`;

    render(view('first-class', 'first-data'), root);
    const button = root.querySelector('button') as HTMLButtonElement;
    render(view('changed-class', 'changed-data'), root);

    expect(button.className).toBe('last-class');
    expect(button.dataset.track).toBe('last-data');
    expect(button.hasAttribute('disabled')).toBe(false);
  });

  it('restores controlled properties and native booleans when spread values stay stable', () => {
    const root = document.createElement('div');
    const props = {
      hidden: false,
      '.tabIndex': 0,
    };
    const view = () => html`<button ...=${props}>Save</button>`;

    render(view(), root);
    const button = root.querySelector('button') as HTMLButtonElement;
    button.hidden = true;
    button.tabIndex = 3;
    render(view(), root);

    expect(button.hidden).toBe(false);
    expect(button.tabIndex).toBe(0);
  });

  it('updates spread event listeners in place and releases cached values on suspend and disconnect', () => {
    const root = document.createElement('div');
    const first = vi.fn();
    const second = vi.fn();
    const ref = { value: undefined as Element | undefined };
    const view = (listener: EventListener) => html`<button ...=${{
      title: 'Stable',
      onClick: listener,
      ref,
    }}>Save</button>`;

    render(view(first), root);
    const button = root.querySelector('button') as HTMLButtonElement;
    const addEventListener = vi.spyOn(button, 'addEventListener');
    const removeEventListener = vi.spyOn(button, 'removeEventListener');
    render(view(second), root);
    button.click();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    expect(addEventListener).not.toHaveBeenCalled();
    expect(removeEventListener).not.toHaveBeenCalled();

    suspendRender(root);
    expect(ref.value).toBeUndefined();
    expect(removeEventListener).toHaveBeenCalledOnce();
    render(view(second), root);
    expect(ref.value).toBe(button);
    expect(addEventListener).toHaveBeenCalledOnce();

    unmount(root);
    button.click();
    expect(second).toHaveBeenCalledOnce();
    expect(ref.value).toBeUndefined();
    expect(removeEventListener).toHaveBeenCalledTimes(2);
  });

  it('rejects raw-text and RCDATA child expressions with targeted diagnostics', () => {
    const root = document.createElement('div');

    const cases = [
      { label: 'textarea', view: (value: string) => html`<textarea>${value}</textarea>`, pattern: /textarea/i },
      { label: 'title', view: (value: string) => html`<title>${value}</title>`, pattern: /title/i },
      { label: 'script', view: (value: string) => html`<script>${value}</script>`, pattern: /script/i },
      { label: 'style', view: (value: string) => html`<style>${value}</style>`, pattern: /style/i },
    ] as const;

    for (const { view, pattern } of cases) {
      expect(() => render(view('content'), root)).toThrow(pattern);
    }
  });

  it('keeps mixed attribute diagnostics for partial attribute strings', () => {
    const root = document.createElement('div');

    expect(() => render(html`<p class="prefix ${'value'}"></p>`, root)).toThrow(/complete child or attribute value/i);
    expect(() => render(html`<template>${'value'}</template>`, root)).toThrow(/complete child or attribute value/i);
  });

  it('ignores markup-like text and only exits raw-text content on the matching close tag', () => {
    const root = document.createElement('div');

    expect(() => render(html`<textarea>${'<div>'}${"'script'"}${'<!-- comment -->'}${'<TITLE>'}${'</not-the-tag>'}</textarea><p>${'after'}</p>`, root)).toThrow(
      /textarea/i,
    );
    expect(() => render(html`<textarea>Before ${'<div>'}${'</textarea>'}</textarea><p>${'after'}</p>`, root)).toThrow(/textarea/i);
  });

  it('treats malformed closing fragments as inert raw-text content', () => {
    const root = document.createElement('div');

    expect(() => render(html`<textarea>${'</text'}${'area'}${'>'}</textarea>`, root)).toThrow(/textarea/i);
    expect(() => render(html`<script>${'</scr'}${'ipt'}${'>'}</script>`, root)).toThrow(/script/i);
  });

  it('preserves state across template literal chunks before the diagnostic fires', () => {
    const root = document.createElement('div');
    const value = 'content';

    expect(() => render(html`<textarea>${'first'}${'<div>'}${value}</textarea>`, root)).toThrow(/textarea/i);
    expect(() => render(html`<style>${'a'}${'/* comment */'}${value}</style>`, root)).toThrow(/style/i);
  });

  it('allows a valid expression after the matching close tag', () => {
    const root = document.createElement('div');

    expect(() => render(html`<textarea>Static</textarea><p>${'after'}</p>`, root)).not.toThrow();
    expect(root.querySelector('p')?.textContent).toBe('after');
  });

  it('keeps literal renderer-like markers distinct from generated expression markers', () => {
    const root = document.createElement('div');

    expect(() => render(html`<textarea>Literal <!--gluon:0--></textarea><p>${'after'}</p>`, root)).not.toThrow();
    expect(root.querySelector('textarea')?.value).toContain('<!--gluon:0-->');
    expect(root.querySelector('p')?.textContent).toBe('after');
    expect(() => render(html`<textarea>Literal <!--gluon:0--> ${'dynamic'}</textarea>`, root)).toThrow(/textarea/i);
  });
});
