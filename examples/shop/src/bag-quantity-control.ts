import {
  css,
  defineGluonElement,
  elementEvent,
  elementProperty,
  html,
  type TemplateValue,
} from '@gluonjs/core';
import { QuantityRemoveAction, QuantityStepAction } from './ui-extensions.js';

const bagQuantityTag = 'gluon-bag-quantity';

export interface BagQuantityChange {
  readonly lineKey: string;
  readonly delta: -1 | 1;
  readonly quantity: number;
}

export interface BagQuantityRemove {
  readonly lineKey: string;
}

const bagQuantityStyles = css`
  :host { display: block; }
  .quantity-control { display: flex; align-items: center; gap: 8px; }
  button { min-width: 44px; min-height: 44px; font: inherit; color: inherit; cursor: pointer; }
  .step { width: 44px; padding: 12px; border: 1px solid var(--shop-rule, #d9d9d4); background: white; }
  output { min-width: 22px; text-align: center; }
  .remove-line { margin-left: auto; padding: 9px 0; border: 0; border-bottom: 1px solid; background: transparent; font-size: 12px; }
  button:focus-visible { outline: 2px solid var(--shop-blue, #1457d9); outline-offset: 2px; }
`;

function createBagQuantityControl() {
  return defineGluonElement({
    tagName: bagQuantityTag,
    properties: {
      lineKey: elementProperty<string>({ type: String, required: true }),
      productName: elementProperty<string>({ type: String, required: true }),
      quantity: { type: Number, default: 1 },
    },
    events: {
      'quantity-change': elementEvent<BagQuantityChange>({ cancelable: true }),
      remove: elementEvent<BagQuantityRemove>({ cancelable: true }),
    },
    styles: bagQuantityStyles,
    setup(context) {
      const optimisticQuantity = context.state('quantity', context.props.quantity);
      context.watch(
        () => context.props.quantity,
        (quantity) => { optimisticQuantity.value = quantity; },
      );
      const change = (delta: -1 | 1): void => {
        const previous = optimisticQuantity.value;
        const quantity = Math.max(0, previous + delta);
        if (quantity === previous) return;
        optimisticQuantity.value = quantity;
        if (!context.emit('quantity-change', { lineKey: context.props.lineKey, delta, quantity })) {
          optimisticQuantity.value = previous;
        }
      };
      return {
        expose: {
          focus: (options?: FocusOptions) => context.host.shadowRoot?.querySelector('button')?.focus(options),
        },
        render: () => html`
          <div class="quantity-control" role="group" aria-label=${`Quantity for ${context.props.productName}`}>
            ${QuantityStepAction({
              label: '−',
              attributes: { aria: { label: 'Decrease quantity' } },
              onClick: () => change(-1),
            })}
            <output aria-live="polite">${optimisticQuantity.value}</output>
            ${QuantityStepAction({
              label: '+',
              attributes: { aria: { label: 'Increase quantity' } },
              onClick: () => change(1),
            })}
            ${QuantityRemoveAction({
              label: 'Remove',
              onClick: () => {
                context.emit('remove', { lineKey: context.props.lineKey });
              },
            })}
          </div>
        `,
      };
    },
  });
}

type BagQuantityControlClass = ReturnType<typeof createBagQuantityControl>;
export type BagQuantityControlElement = InstanceType<BagQuantityControlClass>;

let bagQuantityControl: BagQuantityControlClass | undefined;

export function registerBagQuantityControl(): BagQuantityControlClass {
  bagQuantityControl ??= createBagQuantityControl();
  return bagQuantityControl;
}

export function BagQuantityControl(options: {
  readonly lineKey: string;
  readonly productName: string;
  readonly quantity: number;
  readonly onChange: (change: BagQuantityChange) => void;
  readonly onRemove: (remove: BagQuantityRemove) => void;
}): TemplateValue {
  registerBagQuantityControl();
  return html`
    <gluon-bag-quantity
      .lineKey=${options.lineKey}
      .productName=${options.productName}
      .quantity=${options.quantity}
      @quantity-change=${(event: Event) => options.onChange((event as CustomEvent<BagQuantityChange>).detail)}
      @remove=${(event: Event) => options.onRemove((event as CustomEvent<BagQuantityRemove>).detail)}
    ></gluon-bag-quantity>
  `;
}
