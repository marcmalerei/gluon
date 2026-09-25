import {
  css,
  defineGluonElement,
  elementEvent,
  html,
} from '@gluonjs/core';

export const QuantityChanged = elementEvent<{ readonly quantity: number }>({
  bubbles: true,
});

export const QuantityControl = defineGluonElement({
  tagName: 'quantity-control',
  properties: {
    label: { type: String, reflect: true, default: 'Quantity' },
  },
  events: { change: QuantityChanged },
  styles: css`
    :host { display: block; }
    button { min-block-size: 44px; font: inherit; }
  `,
  setup(context) {
    const quantity = context.state('quantity', 1);
    const controller = new AbortController();

    context.onConnected(() => {
      context.host.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowUp') quantity.value += 1;
      }, { signal: controller.signal });
      context.host.shadowRoot?.querySelector('button')?.focus({ preventScroll: true });
    });
    context.onUpdated(() => {
      context.host.shadowRoot?.querySelector('output')?.setAttribute('data-rendered', 'true');
    });
    context.onCleanup(() => controller.abort());

    return {
      render: () => html`
        <label>${context.props.label}</label>
        <button type="button" @click=${() => { quantity.value += 1; }}>
          Add one
        </button>
        <output aria-live="polite">${quantity.value}</output>
        <button type="button" @click=${() => context.emit('change', { quantity: quantity.value })}>
          Apply
        </button>
      `,
    };
  },
});

export const parentUsage = html`
  <quantity-control
    label="Seats"
    @change=${(event: Event) => console.info((event as CustomEvent).detail.quantity)}
  ></quantity-control>
`;
