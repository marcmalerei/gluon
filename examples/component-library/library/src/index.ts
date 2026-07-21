import {
  css,
  defineAtom,
  defineGluonElement,
  elementEvent,
  elementProperty,
  html,
  type TemplateResult,
} from '@gluonjs/core';
import { q } from '@gluonjs/quarks';

/** A library atom: only public Gluon package entry points are used. */
export const ProductBadge = defineAtom((label: string): TemplateResult => q.span({
  class: 'example-product-badge',
  children: label,
}), 'ProductBadge');

export const productPickerStyles = css`
  :host { display: inline-flex; align-items: center; gap: 0.5rem; }
  button { min-width: 44px; min-height: 44px; }
`;

export interface ProductPickerChange { readonly quantity: number; }
export interface ProductPickerElement extends HTMLElement { value: number; }

/** A stateful library boundary with an explicit public element tag. */
export const ProductPicker: CustomElementConstructor & { new(): ProductPickerElement; } = defineGluonElement({
  tagName: 'example-product-picker',
  properties: { value: elementProperty<number>({ type: Number, reflect: true, default: 1 }) },
  events: { change: elementEvent<ProductPickerChange>() },
  styles: productPickerStyles,
  setup(context) {
    const quantity = context.state('quantity', () => context.props.value);
    context.watch(() => context.props.value, (value) => { quantity.value = value ?? 1; });
    const change = (next: number): void => {
      quantity.value = Math.max(1, next);
      context.emit('change', { quantity: quantity.value });
    };
    return { render: () => html`
      <button type="button" aria-label="Decrease quantity" @click=${() => change(quantity.value - 1)}>−</button>
      <output aria-live="polite">${quantity.value}</output>
      <button type="button" aria-label="Increase quantity" @click=${() => change(quantity.value + 1)}>+</button>
    ` };
  },
}) as CustomElementConstructor & { new(): ProductPickerElement; };
