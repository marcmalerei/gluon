import {
  Button,
  Icon,
  defineButtonPreset,
  defineIcon,
  type ButtonProps,
} from '@gluonjs/atoms';
import { html, svg, type TemplateResult } from '@gluonjs/core';
import { defineMolecule } from '@gluonjs/molecules';
import { defineOrganism } from '@gluonjs/organisms';

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

export const PurchaseRegion = defineOrganism((props: PurchaseActionProps): TemplateResult => html`
  <div class="checkout-purchase-region">${PurchaseAction(props)}</div>
`, 'PurchaseRegion');
