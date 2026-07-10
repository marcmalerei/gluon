import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GluonElement,
  css,
  defineElement,
  html,
  type PropertyDeclarations,
} from '../src/index.js';

let advancedElementSequence = 0;

describe('advanced GluonElement behavior', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('inherits declarations and styles, converts values, reflects aliases, and emits events', async () => {
    const baseStyle = css`:host { display: block; }`;
    const childStyle = css`:host { color: blue; }`;
    const tagName = `gluon-advanced-${advancedElementSequence += 1}` as `${string}-${string}`;

    class BaseElement extends GluonElement {
      static override readonly properties: PropertyDeclarations = {
        titleText: String,
        settings: { type: Object, reflect: true, default: () => ({ ready: true }) },
        items: { type: Array, reflect: true, default: () => ['first'] },
        internalOnly: { attribute: false, reflect: true, default: 'secret' },
      };

      static override readonly styles: CSSStyleSheet | readonly CSSStyleSheet[] = baseStyle;
      declare titleText: string | null;
      declare settings: unknown;
      declare items: unknown[] | null;
      declare internalOnly: string;

      protected override render() {
        return html`<span>${this.titleText ?? ''}</span>`;
      }
    }

    class AdvancedElement extends BaseElement {
      static override readonly properties: PropertyDeclarations = {
        count: { type: Number, reflect: true, default: 1 },
        active: { type: Boolean, reflect: true, default: false },
        aliased: { attribute: 'data-label', reflect: true, default: 'initial' },
        custom: {
          reflect: true,
          default: 'initial',
          converter: {
            fromAttribute: (value) => value?.replace(/^external:/, '') ?? null,
            toAttribute: (value) => value == null ? null : `external:${String(value)}`,
          },
        },
        stable: {
          default: 'ready',
          hasChanged: (value, oldValue) => value !== oldValue && value !== 'skip',
        },
      };

      static override readonly styles: CSSStyleSheet | readonly CSSStyleSheet[] = [
        baseStyle,
        childStyle,
      ];

      declare count: number | null;
      declare active: boolean;
      declare aliased: string;
      declare custom: string | null;
      declare stable: string;
      renders = 0;

      fire(detail: { id: number }): boolean {
        return this.emit('advance', detail, { cancelable: true });
      }

      protected override render() {
        this.renders += 1;
        return html`
          <output>${this.count}:${this.active}:${this.custom}:${this.stable}</output>
          ${super.render()}
        `;
      }
    }

    defineElement(tagName, AdvancedElement);
    const element = document.createElement(tagName) as AdvancedElement;
    document.body.append(element);
    await element.updateComplete;

    expect(element.shadowRoot?.adoptedStyleSheets).toEqual([baseStyle, childStyle]);
    expect(element.settings).toEqual({ ready: true });
    expect(element.items).toEqual(['first']);
    expect(element.getAttribute('settings')).toBe('{"ready":true}');
    expect(element.getAttribute('items')).toBe('["first"]');
    expect(element.hasAttribute('internal-only')).toBe(false);
    expect(element.getAttribute('data-label')).toBe('initial');
    expect(element.getAttribute('custom')).toBe('external:initial');

    element.settings = { mode: 'set' };
    element.items = ['second'];
    element.active = true;
    element.custom = 'property';
    await element.updateComplete;
    expect(element.getAttribute('settings')).toBe('{"mode":"set"}');
    expect(element.getAttribute('items')).toBe('["second"]');
    expect(element.getAttribute('active')).toBe('');
    expect(element.getAttribute('custom')).toBe('external:property');

    element.setAttribute('settings', '{"mode":"attribute"}');
    element.setAttribute('items', '[1,2]');
    element.setAttribute('count', '4');
    element.setAttribute('custom', 'external:converted');
    await element.updateComplete;
    expect(element.settings).toEqual({ mode: 'attribute' });
    expect(element.items).toEqual([1, 2]);
    expect(element.count).toBe(4);
    expect(element.custom).toBe('converted');

    element.setAttribute('settings', 'invalid-json');
    element.removeAttribute('items');
    element.removeAttribute('count');
    element.removeAttribute('active');
    await element.updateComplete;
    expect(element.settings).toBe('invalid-json');
    expect(element.items).toBeNull();
    expect(element.count).toBeNull();
    expect(element.active).toBe(false);

    const renders = element.renders;
    element.stable = 'skip';
    await Promise.resolve();
    expect(element.renders).toBe(renders);

    const listener = vi.fn((event: Event) => event.preventDefault());
    element.addEventListener('advance', listener);
    expect(element.fire({ id: 7 })).toBe(false);
    expect(listener).toHaveBeenCalledOnce();
    const event = listener.mock.calls[0]?.[0] as CustomEvent<{ id: number }>;
    expect(event.detail).toEqual({ id: 7 });
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);

    const rendersBeforeDisconnect = element.renders;
    element.remove();
    element.count = 9;
    await Promise.resolve();
    expect(element.renders).toBe(rendersBeforeDisconnect);
    document.body.append(element);
    await element.updateComplete;
    expect(element.shadowRoot?.textContent).toContain('9::converted:ready');
    expect(element.active).toBe(false);
    expect(element.getAttribute('count')).toBe('9');
  });

  it('captures properties assigned before upgrade and rejects conflicting definitions', async () => {
    const tagName = `gluon-preupgrade-${advancedElementSequence += 1}` as `${string}-${string}`;
    const element = document.createElement(tagName) as HTMLElement & { value?: string };
    element.value = 'captured';
    document.body.append(element);

    class PreUpgradeElement extends GluonElement {
      static override readonly properties: PropertyDeclarations = {
        value: { reflect: true, default: 'default' },
      };

      declare value: string;

      protected override render() {
        return html`<span>${this.value}</span>`;
      }
    }

    class ConflictingElement extends GluonElement {
      protected override render() {
        return html`<span>conflict</span>`;
      }
    }

    expect(defineElement(tagName, PreUpgradeElement)).toBe(PreUpgradeElement);
    expect(defineElement(tagName, PreUpgradeElement)).toBe(PreUpgradeElement);
    await (element as unknown as PreUpgradeElement).updateComplete;
    expect((element as unknown as PreUpgradeElement).value).toBe('captured');
    expect(element.getAttribute('value')).toBe('captured');
    expect(element.shadowRoot?.textContent).toBe('captured');
    expect(() => defineElement(tagName, ConflictingElement)).toThrow(/already defined/i);
  });
});
