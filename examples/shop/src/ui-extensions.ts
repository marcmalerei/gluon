import {
  Button,
  Icon,
  defineButtonPreset,
  defineIcon,
  defineUiAtom,
  type ButtonProps,
} from '@gluonjs/atoms';
import { html, svg, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { FormField, defineMolecule } from '@gluonjs/molecules';
import { defineOrganism } from '@gluonjs/organisms';
import { q } from '@gluonjs/quarks';

const checkoutLock = defineIcon({
  name: 'checkout-lock',
  viewBox: '0 0 24 24',
  body: svg`<path d="M7 11V8a5 5 0 0 1 10 0v3m-11 0h12v10H6V11z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"></path>`,
});

const PurchaseButton = defineButtonPreset({
  displayName: 'PurchaseButton',
  class: ['primary-button', 'place-order', 'shop-purchase-button'],
  type: 'submit',
  attributes: { data: { checkoutAction: 'place-order' } },
});

export const ShopTextAction = defineButtonPreset({
  displayName: 'ShopTextAction',
  variant: 'ghost',
  size: 'small',
  class: 'text-action',
});

export interface ShopEditorialLinkProps {
  readonly href?: string;
  readonly children?: TemplateValue;
  readonly onClick?: (event: MouseEvent) => void;
}

export const ShopEditorialLink = defineUiAtom<ShopEditorialLinkProps, 'a' | 'span'>({
  displayName: 'ShopEditorialLink',
  tag: ({ href }) => href ? 'a' : 'span',
  nativeProps: ({ href, children, onClick }, tag) => ({
    children,
    onClick,
    ...(tag === 'a' ? { href } : {}),
  }),
});

export const ShopIconAction = defineButtonPreset({
  displayName: 'ShopIconAction',
  variant: 'ghost',
  size: 'small',
  class: 'icon-button',
});

export const ShopMenuAction = defineButtonPreset({
  displayName: 'ShopMenuAction',
  variant: 'ghost',
  class: 'menu-search-action',
});

export const InventoryRetryAction = defineButtonPreset({
  displayName: 'InventoryRetryAction',
  variant: 'ghost',
  size: 'small',
  class: 'inventory-retry',
});

export const QuantityStepAction = defineButtonPreset({
  displayName: 'QuantityStepAction',
  variant: 'secondary',
  size: 'small',
  class: ['quantity-action', 'step'],
});

export const QuantityRemoveAction = defineButtonPreset({
  displayName: 'QuantityRemoveAction',
  variant: 'ghost',
  size: 'small',
  class: ['quantity-action', 'remove-line'],
});

export interface PurchaseActionProps extends Omit<ButtonProps, 'type'> {
  readonly totalLabel: string;
}

export const PurchaseAction = defineMolecule(({
  totalLabel,
  ...button
}: PurchaseActionProps): TemplateResult => PurchaseButton({
  ...button,
  children: [
    Icon({ icon: checkoutLock, label: 'Secure checkout', size: 19 }),
    ` Place order — ${totalLabel}`,
  ],
}), 'PurchaseAction');

export type CheckoutFieldName = 'email' | 'name' | 'address' | 'postalCode' | 'city' | 'deliveryInstructions';

export interface CheckoutExperienceProps {
  readonly values: Readonly<Record<CheckoutFieldName, string>>;
  readonly totalLabel: string;
  readonly summary: TemplateResult;
  readonly onFieldInput: (name: CheckoutFieldName, value: string) => void;
  readonly onSubmit: (event: Event) => void;
}

const checkoutFields = Object.freeze([
  { name: 'email', label: 'Email', type: 'email', autocomplete: 'email' },
  { name: 'name', label: 'Full name', type: 'text', autocomplete: 'name' },
  { name: 'address', label: 'Address', type: 'text', autocomplete: 'street-address' },
] as const);

export const CheckoutExperience = defineOrganism((props: CheckoutExperienceProps): TemplateResult => html`
  <section class="checkout-page" aria-labelledby="checkout-title">
    <div>
      <p class="eyebrow">Secure checkout</p>
      <h1 id="checkout-title">Delivery details</h1>
      <form class="checkout-delivery-form" @submit=${props.onSubmit}>
        ${checkoutFields.map((field) => checkoutField(props, field))}
        <div class="checkout-row">
          ${checkoutField(props, {
            name: 'postalCode',
            label: 'Postal code',
            type: 'text',
            autocomplete: 'postal-code',
          })}
          ${checkoutField(props, {
            name: 'city',
            label: 'City',
            type: 'text',
            autocomplete: 'address-level2',
          })}
        </div>
        ${q.label({
          class: 'checkout-field',
          children: [
            'Delivery instructions (optional)',
            q.textarea({
              class: ['checkout-input', 'checkout-textarea'],
              name: 'deliveryInstructions',
              rows: 3,
              '.value': props.values.deliveryInstructions,
              onInput: (event) => props.onFieldInput(
                'deliveryInstructions',
                (event.currentTarget as HTMLTextAreaElement).value,
              ),
            }),
          ],
        })}
        ${PurchaseAction({ totalLabel: props.totalLabel })}
      </form>
    </div>
    ${props.summary}
  </section>
`, 'CheckoutExperience');

function checkoutField(
  props: CheckoutExperienceProps,
  field: {
    readonly name: CheckoutFieldName;
    readonly label: string;
    readonly type: string;
    readonly autocomplete: 'email' | 'name' | 'street-address' | 'postal-code' | 'address-level2';
  },
): TemplateResult {
  return FormField({
    label: field.label,
    name: field.name,
    type: field.type,
    value: props.values[field.name],
    onInput: (event) => props.onFieldInput(
      field.name,
      (event.currentTarget as HTMLInputElement).value,
    ),
    attributes: {
      class: 'checkout-input',
      required: true,
      autocomplete: field.autocomplete,
    },
    fieldAttributes: { class: 'checkout-field' },
  });
}
