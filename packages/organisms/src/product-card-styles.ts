import { createComponentStyleDependency, css } from '@gluonjs/core';

export const productCardStyles = css`
  @layer organisms {
    :where(.gluon-product-card) { display: grid; min-inline-size: 0; overflow: clip; border: var(--gluon-product-card-border, 1px solid color-mix(in srgb, currentColor 18%, transparent)); border-radius: var(--gluon-product-card-radius, .75rem); background: var(--gluon-product-card-surface, Canvas); color: var(--gluon-product-card-color, CanvasText); }
    :where(.gluon-product-card-media) { aspect-ratio: var(--gluon-product-card-media-ratio, 4 / 3); overflow: hidden; background: var(--gluon-product-card-media-surface, color-mix(in srgb, currentColor 8%, transparent)); }
    :where(.gluon-product-card-media > *) { block-size: 100%; inline-size: 100%; object-fit: cover; }
    :where(.gluon-product-card-content) { display: grid; gap: var(--gluon-product-card-gap, .5rem); padding: var(--gluon-product-card-padding, 1rem); min-inline-size: 0; }
    :where(.gluon-product-card-title, .gluon-product-card-description) { margin: 0; overflow-wrap: anywhere; }
    :where(.gluon-product-card-title) { font-size: var(--gluon-product-card-title-size, 1rem); }
    :where(.gluon-product-card-title a) { color: inherit; text-decoration: none; }
    :where(.gluon-product-card-title a:focus-visible) { outline: var(--gluon-product-card-focus-outline, 2px solid Highlight); outline-offset: 2px; }
    :where(.gluon-product-card-description, .gluon-product-card-availability) { color: var(--gluon-product-card-muted, color-mix(in srgb, currentColor 70%, transparent)); }
    :where(.gluon-product-card-price) { font-weight: var(--gluon-product-card-price-weight, 700); }
    :where(.gluon-product-card-actions) { display: flex; flex-wrap: wrap; gap: var(--gluon-product-card-action-gap, .5rem); }
    :where(.gluon-product-card-actions > *) { min-block-size: var(--gluon-product-card-target-size, 2.75rem); }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-product-card *) { transition: none !important; animation: none !important; } }
    @media (forced-colors: active) { :where(.gluon-product-card) { border-color: CanvasText; } }
  }
`;

export const productCardStyleDependency = createComponentStyleDependency({ id: 'gluon-organism-product-card', sheet: productCardStyles, layer: 'organism', order: 4, scope: 'gluon-component' });
