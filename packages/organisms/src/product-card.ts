import { defineOrganism, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { productCardStyleDependency } from './product-card-styles.js';

export type ProductCardAttributes = Omit<QuarkProps<HTMLElement>, 'children'>;

export interface ProductCardProduct {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
}

export interface ProductCardProps {
  readonly product: ProductCardProduct;
  readonly href?: string;
  readonly media?: TemplateValue;
  readonly price?: TemplateValue;
  readonly availability?: TemplateValue;
  readonly actions?: TemplateValue;
  readonly attributes?: ProductCardAttributes;
}

function renderProductCard({ product, href, media, price, availability, actions, attributes = {} }: ProductCardProps): TemplateResult {
  const title = href ? q.a({ href, children: product.title }) : product.title;
  return q.article({
    ...attributes,
    class: [{ gluon: true, organism: true, 'gluon-product-card': true }, attributes.class],
    'data-product-id': product.id,
    children: [
      media === undefined ? nothing : q.div({ class: { 'gluon-product-card-media': true }, part: 'media', children: media }),
      q.div({ class: { 'gluon-product-card-content': true }, part: 'content', children: [
        q.h3({ class: { 'gluon-product-card-title': true }, part: 'title', children: title }),
        product.description ? q.p({ class: { 'gluon-product-card-description': true }, part: 'description', children: product.description }) : nothing,
        price === undefined ? nothing : q.div({ class: { 'gluon-product-card-price': true }, part: 'price', children: price }),
        availability === undefined ? nothing : q.div({ class: { 'gluon-product-card-availability': true }, part: 'availability', children: availability }),
        actions === undefined ? nothing : q.div({ class: { 'gluon-product-card-actions': true }, part: 'actions', children: actions }),
      ] }),
    ],
  });
}

export const ProductCard = defineOrganism(renderProductCard, 'ProductCard', [productCardStyleDependency]);
