import {
  Button,
  defineUiAtom,
} from '@gluonjs/atoms';
import {
  css,
  html,
} from '@gluonjs/core';
import { defineMolecule } from '@gluonjs/molecules';
import { defineOrganism } from '@gluonjs/organisms';

export const StockBadge = defineUiAtom<
  { readonly status: 'available' | 'back-order' },
  'span'
>({
  displayName: 'StockBadge',
  tag: 'span',
  nativeProps: ({ status }) => ({
    class: `stock-badge stock-badge--${status}`,
    children: status === 'available' ? 'In stock' : 'Back order',
  }),
  style: {
    id: 'example-stock-badge',
    sheet: css`
      .stock-badge { font-weight: 700; }
      .stock-badge--available { color: #315d19; }
      .stock-badge--back-order { color: #815400; }
    `,
  },
});

export const ProductSummary = defineMolecule((props: Readonly<{
  name: string;
  price: string;
  status: 'available' | 'back-order';
}>) => html`
  <article>
    <h2>${props.name}</h2>
    <p>${props.price}</p>
    ${StockBadge({ status: props.status })}
  </article>
`, 'ProductSummary');

export const CatalogSection = defineOrganism((props: Readonly<{
  heading: string;
}>) => html`
  <section aria-labelledby="catalog-heading">
    <h1 id="catalog-heading">${props.heading}</h1>
    ${ProductSummary({
      name: 'Orbit Lamp',
      price: '$128',
      status: 'available',
    })}
    ${Button({ label: 'View all products' })}
  </section>
`, 'CatalogSection');
