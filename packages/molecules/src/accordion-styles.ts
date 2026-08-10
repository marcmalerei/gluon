import { createComponentStyleDependency, css } from '@gluonjs/core';

export const accordionStyles = css`
  @layer molecules {
    :where(.gluon-accordion) { display: grid; inline-size: 100%; min-inline-size: 0; }
    :where(.gluon-accordion-heading) { font: inherit; font-weight: inherit; }
    :where(.gluon-accordion .gluon-disclosure-content) { overflow-wrap: anywhere; }
    @media (forced-colors: active) { :where(.gluon-accordion) { color: CanvasText; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-accordion) { scroll-behavior: auto; } }
  }
`;

export const accordionStyleDependency = createComponentStyleDependency({
  id: 'gluon-molecule-accordion',
  sheet: accordionStyles,
  layer: 'molecule',
  order: 11,
  scope: 'gluon-component',
});
