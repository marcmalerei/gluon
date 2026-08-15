import { createComponentStyleDependency, css } from '@gluonjs/core';

export const scrollAreaStyles = css`
  @layer atoms {
    :where(.gluon-scroll-area) {
      box-sizing: border-box;
      display: block;
      min-block-size: 44px;
      max-inline-size: var(--gluon-scroll-area-max-inline-size, 100%);
      max-block-size: var(--gluon-scroll-area-max-block-size, 16rem);
      overscroll-behavior: contain;
      scrollbar-gutter: stable;
      scroll-behavior: var(--gluon-scroll-area-scroll-behavior, auto);
    }

    :where(.gluon-scroll-area.is-vertical) {
      overflow-x: hidden;
      overflow-y: auto;
    }

    :where(.gluon-scroll-area.is-horizontal) {
      overflow-x: auto;
      overflow-y: hidden;
    }

    :where(.gluon-scroll-area.is-both) {
      overflow: auto;
    }

    :where(.gluon-scroll-area:focus-visible) {
      outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #173f91);
      outline-offset: 3px;
    }

    @media (prefers-reduced-motion: reduce) {
      :where(.gluon-scroll-area) {
        scroll-behavior: auto !important;
      }
    }

    @media (forced-colors: active) {
      :where(.gluon-scroll-area:focus-visible) {
        outline-color: Highlight;
      }
    }
  }
`;

export const scrollAreaStyleDependency = createComponentStyleDependency({
  id: 'gluon-atom-scroll-area',
  sheet: scrollAreaStyles,
  layer: 'atom',
  order: 14,
  scope: 'gluon-component',
});
