import { createComponentStyleDependency, css } from '@gluonjs/core';

export const tableRegionStyles = css`
  @layer molecules {
    :where(.gluon-table-region) { display: grid; gap: var(--gluon-table-region-gap, 0.75rem); min-inline-size: 0; }
    :where(.gluon-table-region-summary) { margin: 0; color: var(--gluon-table-region-summary-color, var(--gluon-color-muted, #53605e)); line-height: 1.5; }
    :where(.gluon-table-region-scroll-hint) { margin: 0; color: var(--gluon-table-region-hint-color, var(--gluon-color-muted, #53605e)); font-size: 0.8125rem; }
    :where(.gluon-table-region-viewport) { max-inline-size: 100%; overflow-x: auto; overscroll-behavior-inline: contain; scrollbar-gutter: stable; }
    :where(.gluon-table-region-viewport:focus-visible) { outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #173f91); outline-offset: 3px; }
    :where(.gluon-table-region-content) { min-inline-size: var(--gluon-table-region-content-min-inline-size, 100%); }
    :where(.gluon-table-region-content > table) { inline-size: 100%; border-collapse: collapse; }
    :where(.gluon-table-region-empty) { min-inline-size: 0; }
    @media (forced-colors: active) { :where(.gluon-table-region) { color: CanvasText; } :where(.gluon-table-region-summary, .gluon-table-region-scroll-hint) { color: CanvasText; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-table-region-viewport) { scroll-behavior: auto; } }
  }
`;

export const tableRegionStyleDependency = createComponentStyleDependency({
  id: 'gluon-molecule-table-region',
  sheet: tableRegionStyles,
  layer: 'molecule',
  order: 14,
  scope: 'gluon-component',
});
