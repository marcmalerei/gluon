import { createComponentStyleDependency, css } from '@gluonjs/core';

export const filterBarStyles = css`
  @layer molecules {
    :where(.gluon-filter-bar) { display: grid; gap: var(--gluon-filter-bar-gap, 1rem); padding: var(--gluon-filter-bar-padding, 1rem); border: 1px solid var(--gluon-filter-bar-border, var(--gluon-color-rule, #b8c9c6)); border-radius: var(--gluon-filter-bar-radius, var(--gluon-radius-surface, 1rem)); background: var(--gluon-filter-bar-background, var(--gluon-color-surface, #fff)); color: var(--gluon-color-text, #12312f); }
    :where(.gluon-filter-bar-controls) { display: flex; flex-wrap: wrap; gap: var(--gluon-filter-control-gap, .75rem 1rem); align-items: end; }
    :where(.gluon-filter-bar-summary, .gluon-filter-bar-count) { margin: 0; color: var(--gluon-color-muted, #526663); font-size: .875rem; }
    :where(.gluon-filter-bar-summary) { grid-row: 2; }
    :where(.gluon-filter-bar-clear) { justify-self: start; }
    @media (max-width: 40rem) { :where(.gluon-filter-bar-controls) { display: grid; grid-template-columns: 1fr; } :where(.gluon-filter-bar-controls > *) { min-inline-size: 0; } }
    @media (forced-colors: active) { :where(.gluon-filter-bar) { border-color: CanvasText; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-filter-bar) { scroll-behavior: auto; } }
  }
`;

export const filterBarStyleDependency = createComponentStyleDependency({ id: 'gluon-molecule-filter-bar', sheet: filterBarStyles, layer: 'molecule', order: 44, scope: 'gluon-component' });
