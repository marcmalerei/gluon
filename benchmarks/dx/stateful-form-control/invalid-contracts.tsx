import { defineGluonElement, elementEvent, elementProperty, html } from '@gluonjs/core';
import { h } from 'vue';
import { ReactQuantityView } from './react.js';
import type { ProductInput, QuantityChange } from './shared.js';
import { VueQuantityView } from './vue.js';

defineGluonElement({
  tagName: 'dx-invalid-contract-proof',
  properties: { product: elementProperty<ProductInput>({ attribute: false, required: true }) },
  events: { 'quantity-change': elementEvent<QuantityChange>() },
  slots: { default: { required: true }, help: { fallback: true } },
  setup(context) {
    // @ts-expect-error quantity-change requires the retained structured detail.
    context.emit('quantity-change', { productId: 'orbit-lamp', quantity: 'two' });
    return { render: () => html`<p>${context.props.product.name}</p>` };
  },
}, { register: false });

html`<dx-invalid-contract-proof><span slot="shipping">Invalid slot</span></dx-invalid-contract-proof>`;

// @ts-expect-error React rejects an invalid structured product input.
ReactQuantityView({ product: { id: 'orbit-lamp', name: 'Orbit Lamp', price: '249' }, value: 1, requestChange: () => true });

// @ts-expect-error Vue rejects an invalid structured product input.
h(VueQuantityView, { product: { id: 'orbit-lamp', name: 'Orbit Lamp', price: '249' }, value: 1, requestChange: () => true });
