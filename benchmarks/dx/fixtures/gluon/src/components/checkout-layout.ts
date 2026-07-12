import {
  createStyleSheetOwner,
  createStyleSheetSelection,
  css,
  type StyleTarget,
} from '@gluonjs/core';
import { Button } from '@gluonjs/atoms';
import { Card } from '@gluonjs/molecules';
import { defineOrganism } from '@gluonjs/organisms';
import { q } from '@gluonjs/quarks';

export interface CheckoutLayoutProps {
  readonly heading: string;
  readonly summary: string;
  readonly continueLabel: string;
  readonly onContinue?: (event: MouseEvent) => void;
}

export const CheckoutLayoutStyles = css`
  @layer app.components {
    .app-checkout-layout { min-height: 44px; }
  }
`;

export const CheckoutLayoutStyleSelection = createStyleSheetSelection([
  { id: 'app-checkout-layout', scope: 'app-components', sheet: CheckoutLayoutStyles },
]);

/** Installs this app-owned sheet on one Document or ShadowRoot owner. */
export function installCheckoutLayoutStyles(target: StyleTarget = document) {
  const owner = createStyleSheetOwner(target);
  owner.retain(CheckoutLayoutStyles);
  return owner;
}

export const CheckoutLayout = defineOrganism((props: CheckoutLayoutProps) => q.main({
  class: 'app-checkout-layout',
  data: { component: 'checkout-layout' },
  aria: { label: props.heading },
  children: Card({
    title: props.heading,
    actions: Button({ label: props.continueLabel, onClick: props.onContinue }),
    children: q.p({ children: props.summary }),
  }),
}), 'CheckoutLayout');
