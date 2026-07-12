import { defineGluonElement, elementEvent, html } from '@gluonjs/core';

export const StarterQuantityControl = defineGluonElement({
  tagName: 'starter-quantity-control',
  formAssociated: true,
  properties: {
    value: { type: Number, reflect: true, default: 1 },
    required: { type: Boolean, reflect: true, default: false },
  },
  events: {
    'quantity-change': elementEvent<{ quantity: number }>({ cancelable: true }),
  },
  slots: { default: { required: true }, help: { fallback: true } },
  setup(context) {
    const quantity = context.state('quantity', context.props.value);
    const change = (next: number) => {
      const previous = quantity.value;
      quantity.value = Math.max(0, next);
      if (!context.emit('quantity-change', { quantity: quantity.value })) quantity.value = previous;
    };
    context.onUpdated(() => {
      context.form.setValue(String(quantity.value), String(quantity.value));
      const invalid = context.props.required && quantity.value < 1;
      context.form.setValidity(invalid ? { rangeUnderflow: true } : {}, invalid ? 'Choose at least one item.' : '');
    });
    return { render: () => html`
      <label><slot></slot></label>
      <button type="button" aria-label="Decrease quantity" @click=${() => change(quantity.value - 1)}>−</button>
      <output aria-live="polite">${quantity.value}</output>
      <button type="button" aria-label="Increase quantity" @click=${() => change(quantity.value + 1)}>+</button>
      <slot name="help">Choose a quantity.</slot>
    ` };
  },
});
