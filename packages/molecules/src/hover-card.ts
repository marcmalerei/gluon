import { defineMolecule, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { HoverCard as HeadlessHoverCard, type AnchoredOverlayContentAttributes, type AnchoredOverlayHostAttributes, type AnchoredOverlayTriggerAttributes, type OverlayPlacement } from '@gluonjs/quarks';
import { hoverCardStyleDependency } from './hover-card-styles.js';

export type HoverCardPlacement = OverlayPlacement;
export type HoverCardAttributes = AnchoredOverlayHostAttributes;
export type HoverCardContentAttributes = AnchoredOverlayContentAttributes;
export type HoverCardTriggerAttributes = AnchoredOverlayTriggerAttributes;
export interface HoverCardProps {
  readonly id: string;
  readonly label: string;
  readonly trigger: (attributes: HoverCardTriggerAttributes) => TemplateValue;
  readonly content: TemplateValue;
  readonly placement?: HoverCardPlacement;
  readonly delay?: number;
  readonly attributes?: HoverCardAttributes;
  readonly contentAttributes?: HoverCardContentAttributes;
}

function renderHoverCard({ id, label, trigger, content, placement = 'block-end', delay = 300, attributes = {}, contentAttributes = {} }: HoverCardProps): TemplateResult {
  if (!label.trim()) throw new TypeError('HoverCard.label must be non-empty.');
  return HeadlessHoverCard({
    id,
    label,
    trigger,
    content,
    placement,
    delay,
    hostAttributes: { ...attributes, class: [{ gluon: true, molecule: true, 'gluon-hover-card': true }, attributes.class], data: { ...attributes.data, placement }, part: 'root' },
    contentAttributes: { ...contentAttributes, class: [{ 'gluon-hover-card-content': true }, contentAttributes.class], part: 'content' },
  });
}

export const HoverCard = defineMolecule(renderHoverCard, 'HoverCard', [hoverCardStyleDependency]);
