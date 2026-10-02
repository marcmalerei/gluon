import { createComponentStyleDependency, css, defineOrganism, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { ProductCard, type ProductCardProduct } from './product-card.js';

export type ProductGridAttributes = Omit<QuarkProps<HTMLElement>, 'children'>;
export type ProductGridColumns = 1 | 2 | 3 | 4;

export interface ProductGridProps {
  readonly items: readonly ProductCardProduct[];
  readonly columns?: ProductGridColumns;
  readonly renderCard?: (product: ProductCardProduct, index: number) => TemplateValue;
  readonly emptyContent?: TemplateValue;
  readonly attributes?: ProductGridAttributes;
}

function renderProductGrid({ items, columns = 3, renderCard, emptyContent, attributes = {} }: ProductGridProps): TemplateResult {
  const content = items.length === 0
    ? emptyContent === undefined ? nothing : q.div({ class: { 'gluon-product-grid-empty': true }, part: 'empty', children: emptyContent })
    : q.div({ class: { 'gluon-product-grid-list': true }, part: 'list', children: items.map((product, index) => renderCard?.(product, index) ?? ProductCard({ product })) });
  return q.section({
    ...attributes,
    class: [{ gluon: true, organism: true, 'gluon-product-grid': true }, attributes.class],
    'data-columns': String(columns),
    children: content,
  });
}

export const productGridStyles = css`
  @layer organisms {
    :where(.gluon-product-grid-list) { display: grid; grid-template-columns: repeat(var(--gluon-product-grid-columns, 3), minmax(0, 1fr)); gap: var(--gluon-product-grid-gap, 1rem); min-inline-size: 0; }
    :where(.gluon-product-grid[data-columns='1']) { --gluon-product-grid-columns: 1; }
    :where(.gluon-product-grid[data-columns='2']) { --gluon-product-grid-columns: 2; }
    :where(.gluon-product-grid[data-columns='3']) { --gluon-product-grid-columns: 3; }
    :where(.gluon-product-grid[data-columns='4']) { --gluon-product-grid-columns: 4; }
    :where(.gluon-product-grid-empty) { padding: var(--gluon-product-grid-empty-padding, 2rem); border: var(--gluon-product-grid-empty-border, 1px dashed currentColor); text-align: center; }
    @media (max-width: 48rem) { :where(.gluon-product-grid-list) { grid-template-columns: repeat(min(var(--gluon-product-grid-columns, 3), 2), minmax(0, 1fr)); } }
    @media (max-width: 32rem) { :where(.gluon-product-grid-list) { grid-template-columns: 1fr; } }
  }
`;

const productGridStyleDependency = createComponentStyleDependency({ id: 'gluon-organism-product-grid', sheet: productGridStyles, layer: 'organism', order: 5, scope: 'gluon-component' });

export const ProductGrid = defineOrganism(renderProductGrid, 'ProductGrid', [productGridStyleDependency]);
