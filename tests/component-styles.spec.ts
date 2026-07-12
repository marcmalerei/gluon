import { afterEach, describe, expect, it } from 'vitest';
import {
  GluonElement,
  KeepAlive,
  Suspense,
  Teleport,
  Transition,
  TransitionGroup,
  adoptStyles,
  createApp,
  compareComponentStyles,
  createComponentStyleDependency,
  createComponentStyleOwner,
  css,
  defineMolecule,
  defineElement,
  directive,
  html,
  nothing,
  render,
  unmount,
} from '@gluonjs/core';
import {
  Button,
  atomStyles,
  buttonStyles,
  iconStyles,
  inputStyles,
  labelStyles,
} from '@gluonjs/atoms';
import { Card, cardStyles, formFieldStyles } from '@gluonjs/molecules';
import { appShellStyles } from '@gluonjs/organisms';
import { nextTick } from '@gluonjs/reactivity';

const allComponentSheets = [
  buttonStyles,
  iconStyles,
  inputStyles,
  labelStyles,
  cardStyles,
  formFieldStyles,
  appShellStyles,
];

afterEach(() => {
  unmount(document.body);
  document.body.replaceChildren();
  document.adoptedStyleSheets = [];
});

describe('usage-driven component styles', () => {
  it('adopts only the exact rendered sheet and releases it on unmount', () => {
    render(Button({ label: 'Add to bag' }), document.body);
    expect(document.adoptedStyleSheets).toContain(buttonStyles);
    expect(document.adoptedStyleSheets.filter((sheet) => allComponentSheets.includes(sheet)))
      .toEqual([buttonStyles]);

    unmount(document.body);
    expect(document.adoptedStyleSheets).not.toContain(buttonStyles);
  });

  it('rejects deprecated aggregate coexistence instead of double-styling silently', () => {
    adoptStyles(document, atomStyles);
    expect(() => render(Button({ label: 'Conflicting path' }), document.body)).toThrowError(
      expect.objectContaining({ code: 'GLUON_LEGACY_COMPONENT_STYLE_CONFLICT' }),
    );
    expect(document.adoptedStyleSheets).toHaveLength(1);
    expect(document.adoptedStyleSheets[0]).toBe(atomStyles);
  });

  it('validates component metadata and covers exact owner edge cases', () => {
    const sheet = css`.edge { display: block; }`;
    expect(() => createComponentStyleDependency({
      id: 'Invalid ID', sheet, layer: 'atom', order: 0,
    })).toThrow('Invalid component stylesheet id');
    expect(() => createComponentStyleDependency({
      id: 'edge-negative', sheet, layer: 'atom', order: -1,
    })).toThrow('non-negative integer order');
    expect(() => defineMolecule(() => html`<p>Wrong layer</p>`, 'WrongLayer', [
      createComponentStyleDependency({ id: 'wrong-layer', sheet, layer: 'atom', order: 0 }),
    ])).toThrow('instead of molecule');

    const dependency = createComponentStyleDependency({
      id: 'edge-owner', sheet, layer: 'atom', order: 2,
    });
    const other = createComponentStyleDependency({
      id: 'edge-other', sheet, layer: 'atom', order: 3,
    });
    const first = createComponentStyleOwner(document);
    const second = createComponentStyleOwner(document);
    expect(first.dependencies).toEqual([]);
    expect(first.disposed).toBe(false);
    first.retain(dependency, dependency);
    second.retain(dependency);
    expect(first.dependencies).toEqual([dependency]);
    first.release(other);
    first.dispose();
    first.dispose();
    expect(document.adoptedStyleSheets).toContain(sheet);
    expect(() => first.retain(dependency)).toThrow('disposed');
    expect(() => createComponentStyleOwner(document).retain(other)).toThrow('identity collision');
    second.dispose();
    expect(document.adoptedStyleSheets).not.toContain(sheet);

    const later = createComponentStyleDependency({ id: 'z-style', sheet: css`.z {}`, layer: 'atom', order: 2 });
    const earlier = createComponentStyleDependency({ id: 'a-style', sheet: css`.a {}`, layer: 'atom', order: 2 });
    const molecule = createComponentStyleDependency({ id: 'm-style', sheet: css`.m {}`, layer: 'molecule', order: 0 });
    expect(compareComponentStyles(earlier, later)).toBeLessThan(0);
    expect(compareComponentStyles(molecule, later)).toBeGreaterThan(0);
  });

  it('reference-counts multiple render roots and conditional instances', () => {
    const first = document.createElement('section');
    const second = document.createElement('section');
    document.body.append(first, second);
    render(html`${Button({ label: 'First' })}${Button({ label: 'Second' })}`, first);
    render(Button({ label: 'Third' }), second);
    expect(document.adoptedStyleSheets.filter((sheet) => sheet === buttonStyles)).toHaveLength(1);

    render(html`${nothing}${Button({ label: 'Second' })}`, first);
    unmount(second);
    expect(document.adoptedStyleSheets).toContain(buttonStyles);
    render(html`${nothing}${nothing}`, first);
    expect(document.adoptedStyleSheets).not.toContain(buttonStyles);
  });

  it('keeps deterministic layer order and unrelated sheet order', () => {
    const before = new CSSStyleSheet();
    const after = new CSSStyleSheet();
    document.adoptedStyleSheets = [before, after];
    render(html`${Card({ title: 'Card' })}${Button({ label: 'Button' })}`, document.body);
    expect(document.adoptedStyleSheets).toHaveLength(4);
    expect(document.adoptedStyleSheets[0]).toBe(before);
    expect(document.adoptedStyleSheets[1]).toBe(after);
    expect(document.adoptedStyleSheets[2]).toBe(buttonStyles);
    expect(document.adoptedStyleSheets[3]).toBe(cardStyles);
  });

  it('owns createApp and GluonElement sheets through unmount and reconnection', async () => {
    const container = document.createElement('main');
    document.body.append(container);
    const mount = createApp(() => Button({ label: 'Application button' })).mount(container);
    expect(document.adoptedStyleSheets).toContain(buttonStyles);
    mount.unmount();
    expect(document.adoptedStyleSheets).not.toContain(buttonStyles);

    class StyledElement extends GluonElement {
      protected override render() { return Card({ title: 'Shadow card' }); }
    }
    const tag = `gluon-style-owner-${Date.now()}` as `${string}-${string}`;
    defineElement(tag, StyledElement);
    const element = document.createElement(tag) as StyledElement;
    document.body.append(element);
    await element.updateComplete;
    expect(element.shadowRoot!.adoptedStyleSheets).toContain(cardStyles);
    element.remove();
    expect(element.shadowRoot!.adoptedStyleSheets).not.toContain(cardStyles);
    document.body.append(element);
    await element.updateComplete;
    expect(element.shadowRoot!.adoptedStyleSheets).toContain(cardStyles);
    element.remove();
  });

  it('targets Teleport destinations and releases moved content', () => {
    const host = document.createElement('section');
    const target = host.attachShadow({ mode: 'open' });
    document.body.append(host);
    render(html`${Teleport({ to: target, children: Button({ label: 'Teleported' }) })}`, document.body);
    expect(target.adoptedStyleSheets).toContain(buttonStyles);
    expect(document.adoptedStyleSheets).not.toContain(buttonStyles);
    unmount(document.body);
    expect(target.adoptedStyleSheets).not.toContain(buttonStyles);
  });

  it('retains KeepAlive styles until eviction and Transition styles through leave', () => {
    const keepAliveView = (cacheKey: string, max: number, children: Parameters<typeof KeepAlive>[0]['children']) => html`${KeepAlive({ cacheKey, max, children })}`;
    render(keepAliveView('button', 2, Button({ label: 'Cached' })), document.body);
    render(keepAliveView('card', 2, Card({ title: 'Current' })), document.body);
    expect(document.adoptedStyleSheets).toContain(buttonStyles);
    expect(document.adoptedStyleSheets).toContain(cardStyles);
    render(keepAliveView('card', 1, Card({ title: 'Current' })), document.body);
    expect(document.adoptedStyleSheets).not.toContain(buttonStyles);

    const transitionView = (transitionKey: string, children: Parameters<typeof Transition>[0]['children']) => html`${Transition({ transitionKey, reducedMotion: true, children })}`;
    render(transitionView('button', Button({ label: 'Before' })), document.body);
    expect(document.adoptedStyleSheets).toContain(buttonStyles);
    render(transitionView('empty', nothing), document.body);
    expect(document.adoptedStyleSheets).not.toContain(buttonStyles);
  });

  it('switches Suspense sheets before the resolved content is committed', async () => {
    let resolve!: (value: string) => void;
    const source = new Promise<string>((complete) => { resolve = complete; });
    render(html`${Suspense({
      source,
      fallback: Button({ label: 'Loading' }),
      children: (title) => Card({ title }),
    })}`, document.body);
    expect(document.adoptedStyleSheets).toContain(buttonStyles);
    resolve('Ready');
    await source;
    await nextTick();
    expect(document.body.textContent).toBe('Ready');
    expect(document.adoptedStyleSheets).not.toContain(buttonStyles);
    expect(document.adoptedStyleSheets).toContain(cardStyles);
  });

  it('releases sheets after failed renders and TransitionGroup removal', () => {
    const fail = directive({
      mount() { throw new Error('render failed'); },
      update() {},
    });
    expect(() => render(html`${Button({ label: 'Claimed first' })}${fail()}`, document.body))
      .toThrow('render failed');
    expect(document.adoptedStyleSheets).not.toContain(buttonStyles);

    const group = (items: readonly ('button' | 'card')[]) => html`${TransitionGroup({
      items,
      key: (item) => item,
      reducedMotion: true,
      children: (item) => item === 'button'
        ? Button({ label: 'Grouped' })
        : Card({ title: 'Grouped' }),
    })}`;
    render(group(['button', 'card']), document.body);
    expect(document.adoptedStyleSheets).toContain(buttonStyles);
    expect(document.adoptedStyleSheets).toContain(cardStyles);
    render(group(['card']), document.body);
    expect(document.adoptedStyleSheets).not.toContain(buttonStyles);
    expect(document.adoptedStyleSheets).toContain(cardStyles);
  });
});
