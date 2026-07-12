import {
  createStyleSheetOwner,
  createStyleSheetSelection,
  css,
  type StyleTarget,
} from '@gluonjs/core';
import { defineAtom } from '@gluonjs/atoms';
import { q, type QuarkRef } from '@gluonjs/quarks';

export interface PurchasePrimitiveProps {
  readonly label: string;
  readonly pressed?: boolean;
  readonly ref?: QuarkRef<HTMLButtonElement>;
  readonly onPress?: (event: MouseEvent) => void;
}

export const PurchasePrimitiveStyles = css`
  @layer app.components {
    .app-purchase-primitive { min-height: 44px; }
  }
`;

export const PurchasePrimitiveStyleSelection = createStyleSheetSelection([
  { id: 'app-purchase-primitive', scope: 'app-components', sheet: PurchasePrimitiveStyles },
]);

/** Installs this app-owned sheet on one Document or ShadowRoot owner. */
export function installPurchasePrimitiveStyles(target: StyleTarget = document) {
  const owner = createStyleSheetOwner(target);
  owner.retain(PurchasePrimitiveStyles);
  return owner;
}

export const PurchasePrimitive = defineAtom((props: PurchasePrimitiveProps) => q.button({
  type: 'button',
  class: 'app-purchase-primitive',
  data: { component: 'purchase-primitive' },
  aria: { pressed: props.pressed ?? false },
  ref: props.ref,
  onClick: props.onPress,
  children: props.label,
}), 'PurchasePrimitive');
