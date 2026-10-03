import { createComponentStyleDependency, css } from '@gluonjs/core';

export const sortControlStyles = css`
  @layer molecules {
    :where(.gluon-sort-control) { display: grid; gap: var(--gluon-sort-control-gap, .375rem); min-inline-size: var(--gluon-sort-control-min-inline-size, 12rem); color: var(--gluon-sort-control-color, var(--gluon-color-text, inherit)); }
    :where(.gluon-sort-control-label) { font-size: var(--gluon-sort-control-label-size, .875rem); font-weight: var(--gluon-sort-control-label-weight, 650); }
    :where(.gluon-sort-control-helper, .gluon-sort-control-error) { color: var(--gluon-sort-control-helper-color, var(--gluon-color-muted, #526663)); font-size: .8125rem; line-height: 1.4; overflow-wrap: anywhere; }
    :where(.gluon-sort-control-error) { color: var(--gluon-sort-control-error-color, var(--gluon-color-danger, #a52222)); font-weight: 650; }
    @media (max-width: 30rem) { :where(.gluon-sort-control) { min-inline-size: 0; inline-size: 100%; } }
    @media (forced-colors: active) { :where(.gluon-sort-control-label) { color: CanvasText; } :where(.gluon-sort-control-error) { color: Mark; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-sort-control) { scroll-behavior: auto; } }
  }
`;

export const sortControlStyleDependency = createComponentStyleDependency({ id: 'gluon-molecule-sort-control', sheet: sortControlStyles, layer: 'molecule', order: 46, scope: 'gluon-component' });
