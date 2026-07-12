import {
  css,
  defineGluonElement,
  elementEvent,
  elementProperty,
  html,
} from '@gluonjs/core';
import type { ProductInput, QuantityChange } from './shared.js';
import { quantityControlCss } from './shared.js';

export const gluonFunctionalTag = 'dx-functional-quantity';
export const gluonFunctionalLifecycleEvidence = { cleanups: 0 };

// DX_COMPONENT_START
export const FunctionalQuantityControl = defineGluonElement({
  tagName: gluonFunctionalTag,
  formAssociated: true,
  properties: {
    product: elementProperty<ProductInput>({ attribute: false, required: true }),
    value: { type: Number, reflect: true, default: 1 },
    required: { type: Boolean, reflect: true, default: false },
  },
  events: {
    'quantity-change': elementEvent<QuantityChange>({ cancelable: true }),
  },
  slots: {
    default: { required: true },
    help: { fallback: true },
  },
  styles: css`${quantityControlCss}`,
  setup(context) {
    const draft = context.state('quantity', context.props.value);
    const initial = context.state('initial', context.props.value);
    const total = context.computed(() => draft.value * context.props.product.price);
    context.watch(() => context.props.value, (value) => { draft.value = value; });
    const abort = new AbortController();
    if (typeof globalThis.addEventListener === 'function') {
      globalThis.addEventListener('dx-quantity-refresh', () => void context.requestUpdate(), { signal: abort.signal });
    }
    context.onCleanup(() => { abort.abort(); gluonFunctionalLifecycleEvidence.cleanups += 1; });
    context.form.onReset(() => { draft.value = initial.value; });
    context.form.onRestore((state) => {
      if (typeof state === 'string') draft.value = Number(state);
    });
    context.onUpdated(() => {
      context.form.setValue(String(draft.value), String(draft.value));
      const invalid = context.props.required && draft.value < 1;
      context.form.setValidity(invalid ? { rangeUnderflow: true } : {}, invalid ? 'Choose at least one item.' : '');
    });
    const setQuantity = (quantity: number): boolean => {
      const previous = draft.value;
      draft.value = Math.max(0, quantity);
      const accepted = context.emit('quantity-change', {
        productId: context.props.product.id,
        quantity: draft.value,
      });
      if (!accepted) draft.value = previous;
      return accepted;
    };
    return {
      expose: {
        focus: (options?: FocusOptions) => context.host.shadowRoot?.querySelector<HTMLButtonElement>('button')?.focus(options),
        setQuantity,
        get quantity() { return draft.value; },
      },
      render: () => html`
        <section class="control" aria-label=${`${context.props.product.name} quantity`}>
          <slot></slot>
          <div class="stepper">
            <button type="button" aria-label="Decrease quantity" @click=${() => setQuantity(draft.value - 1)}>−</button>
            <output aria-live="polite">${draft.value}</output>
            <button type="button" aria-label="Increase quantity" @click=${() => setQuantity(draft.value + 1)}>+</button>
            <strong>Total €${total.value.toFixed(2)}</strong>
          </div>
          <slot name="help">Choose a quantity.</slot>
        </section>
      `,
    };
  },
});
// DX_COMPONENT_END
