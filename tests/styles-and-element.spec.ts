import { beforeEach, describe, expect, it } from 'vitest';
import {
  GluonElement,
  adoptStyles,
  createStyleSheetOwner,
  css,
  defineElement,
  html,
  unadoptStyles,
} from '../src/index.js';

let elementSequence = 0;

describe('adopted stylesheets', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    document.adoptedStyleSheets = [];
  });

  it('adopts constructable sheets once and removes only requested sheets', () => {
    const first = css`:root { --first: 1; }`;
    const second = css`:root { --second: 2; }`;

    adoptStyles(document, first, first, second);
    expect(document.adoptedStyleSheets).toHaveLength(2);
    expect(document.adoptedStyleSheets[0]).toBe(first);
    expect(document.adoptedStyleSheets[1]).toBe(second);

    unadoptStyles(document, first);
    expect(document.adoptedStyleSheets).toHaveLength(1);
    expect(document.adoptedStyleSheets[0]).toBe(second);
    expect(document.querySelector('style[data-gluon]')).toBeNull();
  });

  it('reference-counts target owners and preserves externally adopted sheet order', () => {
    const before = css`:root { --before: 1; }`;
    const shared = css`:root { --shared: 1; }`;
    const after = css`:root { --after: 1; }`;
    adoptStyles(document, before, shared);
    const first = createStyleSheetOwner(document);
    const second = createStyleSheetOwner(document);
    first.retain(shared);
    second.retain(shared);
    first.retain(after);
    expect(document.adoptedStyleSheets).toHaveLength(3);
    expect(document.adoptedStyleSheets[0]).toBe(before);
    expect(document.adoptedStyleSheets[1]).toBe(shared);
    expect(document.adoptedStyleSheets[2]).toBe(after);
    expect(first.sheets).toHaveLength(2);
    expect(first.sheets[0]).toBe(shared);
    expect(first.sheets[1]).toBe(after);

    first.dispose();
    first.dispose();
    expect(document.adoptedStyleSheets).toHaveLength(2);
    expect(document.adoptedStyleSheets[0]).toBe(before);
    expect(document.adoptedStyleSheets[1]).toBe(shared);
    second.dispose();
    expect(document.adoptedStyleSheets).toHaveLength(2);
    expect(document.adoptedStyleSheets[0]).toBe(before);
    expect(document.adoptedStyleSheets[1]).toBe(shared);
    expect(() => first.retain(after)).toThrow('disposed');
  });

  it('renders reactive custom elements and adopts sheets without a style fallback', async () => {
    const elementStyles = css`:host { display: block; }`;
    const tagName = `gluon-counter-${elementSequence += 1}` as `${string}-${string}`;

    class CounterElement extends GluonElement {
      static override readonly properties = {
        count: { type: Number, reflect: true, default: 0 },
        active: { type: Boolean, reflect: true, default: false },
      };

      static override readonly styles = elementStyles;
      declare count: number;
      declare active: boolean;

      protected override render() {
        return html`<output data-active=${this.active}>${this.count}</output>`;
      }
    }

    defineElement(tagName, CounterElement);
    const element = document.createElement(tagName) as CounterElement;
    document.body.append(element);
    await element.updateComplete;

    expect(element.shadowRoot?.textContent).toBe('0');
    expect(element.shadowRoot?.adoptedStyleSheets).toContain(elementStyles);
    expect(element.shadowRoot?.querySelector('style')).toBeNull();

    element.count = 2;
    element.active = true;
    await element.updateComplete;

    expect(element.shadowRoot?.textContent).toBe('2');
    expect(element.getAttribute('count')).toBe('2');
    expect(element.hasAttribute('active')).toBe(true);

    element.setAttribute('count', '3');
    await element.updateComplete;
    expect(element.count).toBe(3);
    expect(element.shadowRoot?.textContent).toBe('3');
  });
});
