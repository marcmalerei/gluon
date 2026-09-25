import { describe, expect, it } from 'vitest';
import {
  LitCompatElement,
  type LitChangedProperties,
} from '@gluonjs/core/compat/lit';
import {
  defineElement,
  html,
  type PropertyDeclarations,
} from '@gluonjs/core';

let sequence = 0;

describe('Lit lifecycle compatibility', () => {
  it('maps lifecycle names onto native rendering and changed-property state', async () => {
    const tagName = `gluon-lit-compat-${sequence += 1}` as `${string}-${string}`;
    class CompatElement extends LitCompatElement {
      static override readonly properties: PropertyDeclarations = {
        label: { type: String, default: 'A' },
      };

      declare label: string;
      readonly calls: string[] = [];

      override connectedCallback(): void {
        this.calls.push('connected');
        super.connectedCallback();
      }

      override disconnectedCallback(): void {
        this.calls.push('disconnected');
        super.disconnectedCallback();
      }

      protected override willUpdate(changed: LitChangedProperties): void {
        this.calls.push(`will:${changed.get('label') ?? 'none'}`);
      }

      protected override firstUpdated(changed: LitChangedProperties): void {
        this.calls.push(`first:${changed.get('label') ?? 'none'}`);
      }

      protected override updated(changed: LitChangedProperties): void {
        this.calls.push(`updated:${changed.get('label') ?? 'none'}`);
      }

      protected override render() {
        this.calls.push('render');
        return html`<output>${this.label}</output>`;
      }
    }

    defineElement(tagName, CompatElement);
    const element = document.createElement(tagName) as CompatElement;
    document.body.append(element);
    await element.updateComplete;

    expect(element.shadowRoot?.textContent).toBe('A');
    expect(element.calls).toEqual([
      'connected',
      'will:none',
      'render',
      'first:none',
      'updated:none',
    ]);

    element.label = 'B';
    await element.updateComplete;
    expect(element.shadowRoot?.textContent).toBe('B');
    expect(element.calls.slice(-3)).toEqual(['will:A', 'render', 'updated:A']);

    await element.requestUpdate('label', 'A');
    expect(element.calls.slice(-3)).toEqual(['will:none', 'render', 'updated:none']);

    element.remove();
    expect(element.calls.at(-1)).toBe('disconnected');

    document.body.append(element);
    await element.updateComplete;
    expect(element.calls.slice(-5)).toEqual([
      'connected',
      'will:none',
      'render',
      'first:none',
      'updated:none',
    ]);
  });
});
