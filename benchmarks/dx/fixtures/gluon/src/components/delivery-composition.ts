import {
  createStyleSheetOwner,
  createStyleSheetSelection,
  css,
  type StyleTarget,
} from '@gluonjs/core';
import { Button } from '@gluonjs/atoms';
import { defineMolecule } from '@gluonjs/molecules';
import { q } from '@gluonjs/quarks';

export interface DeliveryCompositionProps {
  readonly title: string;
  readonly actionLabel: string;
  readonly onAction?: (event: MouseEvent) => void;
}

export const DeliveryCompositionStyles = css`
  @layer app.components {
    .app-delivery-composition { min-height: 44px; }
  }
`;

export const DeliveryCompositionStyleSelection = createStyleSheetSelection([
  { id: 'app-delivery-composition', scope: 'app-components', sheet: DeliveryCompositionStyles },
]);

/** Installs this app-owned sheet on one Document or ShadowRoot owner. */
export function installDeliveryCompositionStyles(target: StyleTarget = document) {
  const owner = createStyleSheetOwner(target);
  owner.retain(DeliveryCompositionStyles);
  return owner;
}

export const DeliveryComposition = defineMolecule((props: DeliveryCompositionProps) => q.section({
  class: 'app-delivery-composition',
  data: { component: 'delivery-composition' },
  aria: { label: props.title },
  children: [
    q.h2({ children: props.title }),
    Button({ label: props.actionLabel, onClick: props.onAction }),
  ],
}), 'DeliveryComposition');
