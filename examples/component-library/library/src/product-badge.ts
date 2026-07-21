import { css, defineAtom, type TemplateResult } from '@gluonjs/core';
import { q } from '@gluonjs/quarks';

export const productBadgeStyles = css`
  .example-product-badge { font-weight: 700; }
`;

/** A library atom: only public Gluon package entry points are used. */
export const ProductBadge = defineAtom((label: string): TemplateResult => q.span({
  class: 'example-product-badge',
  children: label,
}), 'ProductBadge');
