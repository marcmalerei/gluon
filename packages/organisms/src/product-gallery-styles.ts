import { createComponentStyleDependency, css } from '@gluonjs/core';

export const productGalleryStyles = css`
  @layer organisms {
    :where(.gluon-product-gallery) {
      position: relative;
      display: grid;
      grid-template-columns: var(--gluon-product-gallery-primary-columns, 1.6fr) var(--gluon-product-gallery-detail-columns, .8fr);
      grid-template-rows: repeat(2, minmax(0, 1fr));
      gap: var(--gluon-product-gallery-gap, .625rem);
      min-inline-size: 0;
      background: var(--gluon-product-gallery-background, transparent);
    }
    :where(.gluon-product-gallery-item) {
      min-inline-size: 0;
      margin: 0;
      overflow: hidden;
      background: var(--gluon-product-gallery-surface, var(--gluon-color-surface, #f6f6f4));
      aspect-ratio: var(--gluon-product-gallery-detail-ratio, 1.35);
    }
    :where(.gluon-product-gallery-primary) {
      grid-row: 1 / 3;
      aspect-ratio: var(--gluon-product-gallery-primary-ratio, 1.05);
    }
    :where(.gluon-product-gallery img) {
      display: block;
      inline-size: 100%;
      block-size: 100%;
      object-fit: var(--gluon-product-gallery-object-fit, contain);
    }
    :where(.gluon-product-gallery:focus-visible) {
      outline: var(--gluon-focus-width, 3px solid Highlight);
      outline-offset: var(--gluon-product-gallery-focus-offset, -3px);
    }
    @media (max-width: 48rem) {
      :where(.gluon-product-gallery) {
        display: flex;
        gap: var(--gluon-product-gallery-mobile-gap, 1px);
        overflow-inline: auto;
        scroll-snap-type: inline mandatory;
        background: var(--gluon-product-gallery-mobile-background, var(--gluon-color-rule, #b8c9c6));
        overscroll-behavior-inline: contain;
      }
      :where(.gluon-product-gallery-item, .gluon-product-gallery-primary) {
        flex: 0 0 var(--gluon-product-gallery-mobile-item-size, 88%);
        aspect-ratio: var(--gluon-product-gallery-mobile-ratio, 1 / .72);
        scroll-snap-align: center;
      }
      :where(.gluon-product-gallery-primary) { grid-row: auto; }
    }
    @media (forced-colors: active) { :where(.gluon-product-gallery) { background: Canvas; } }
    @media (prefers-reduced-motion: reduce) {
      :where(.gluon-product-gallery) { scroll-behavior: auto; scroll-snap-type: none; }
      :where(.gluon-product-gallery, .gluon-product-gallery *) { animation: none !important; transition: none !important; }
    }
  }
`;

export const productGalleryStyleDependency = createComponentStyleDependency({
  id: 'gluon-organism-product-gallery',
  sheet: productGalleryStyles,
  layer: 'organism',
  order: 12,
  scope: 'gluon-component',
});
