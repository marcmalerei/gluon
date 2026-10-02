import { defineMolecule, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { tooltipStyleDependency } from './tooltip-styles.js';

export type TooltipPlacement = 'block-start' | 'block-end' | 'inline-start' | 'inline-end';
export type TooltipAttributes = Omit<QuarkProps<HTMLSpanElement>, 'children' | 'id'>;

export interface TooltipProps {
  readonly id: string;
  readonly content: TemplateValue;
  readonly children: TemplateValue;
  readonly placement?: TooltipPlacement;
  readonly disabled?: boolean;
  readonly attributes?: TooltipAttributes;
}

function renderTooltip({ id, content, children, placement = 'block-end', disabled = false, attributes = {} }: TooltipProps): TemplateResult {
  assertId(id);
  const contentId = `${id}-content`;
  return q.span({
    ...attributes,
    id,
    class: [{ gluon: true, molecule: true, 'gluon-tooltip': true, [`is-${placement}`]: true }, attributes.class],
    data: { ...attributes.data, disabled: disabled || undefined, placement },
    tabindex: disabled ? undefined : 0,
    aria: { ...attributes.aria, describedby: disabled ? undefined : contentId },
    children: [
      q.span({ class: 'gluon-tooltip-trigger', 'aria-hidden': 'true', children }),
      disabled ? undefined : q.span({ id: contentId, class: 'gluon-tooltip-content', role: 'tooltip', children: content }),
    ],
  });
}

function assertId(value: string): void {
  if (!value.trim() || /\s/u.test(value)) throw new TypeError('Tooltip.id must be a non-empty DOM id without whitespace.');
}

export const Tooltip = defineMolecule(renderTooltip, 'Tooltip', [tooltipStyleDependency]);
