import { createComponentStyleDependency, css } from '@gluonjs/core';

export const dataTableStyles = css`
  @layer molecules {
    :where(.gluon-data-table) { display: grid; min-inline-size: 0; border: 1px solid var(--gluon-data-table-border-color, var(--gluon-color-border, #d6dfdc)); background: var(--gluon-data-table-background, transparent); }
    :where(.gluon-data-table-viewport) { max-inline-size: 100%; overflow-x: auto; overscroll-behavior-inline: contain; }
    :where(.gluon-data-table-table) { inline-size: 100%; min-inline-size: var(--gluon-data-table-min-inline-size, 36rem); border-collapse: collapse; text-align: start; }
    :where(.gluon-data-table th, .gluon-data-table td) { padding: var(--gluon-data-table-cell-padding, .75rem); border-block-end: 1px solid var(--gluon-data-table-row-border-color, var(--gluon-color-border, #d6dfdc)); vertical-align: middle; }
    :where(.gluon-data-table th) { background: var(--gluon-data-table-header-background, var(--gluon-color-surface-soft, #f3f7f5)); color: var(--gluon-data-table-header-color, inherit); font-size: .8125rem; font-weight: 700; }
    :where(.gluon-data-table tbody tr:last-child td) { border-block-end: 0; }
    :where(.gluon-data-table tbody tr.is-selected) { background: var(--gluon-data-table-selected-background, color-mix(in srgb, var(--gluon-color-action-soft, #e6f4f1) 55%, transparent)); }
    :where(.gluon-data-table tbody tr.is-disabled) { opacity: .58; }
    :where(.gluon-data-table-selection-cell) { inline-size: 2.75rem; text-align: center; }
    :where(.gluon-data-table-selection-cell input) { inline-size: 1.125rem; block-size: 1.125rem; accent-color: var(--gluon-data-table-selection-color, var(--gluon-color-action, #075e5b)); }
    :where(.gluon-data-table-sort) { display: inline-flex; min-block-size: 2.75rem; align-items: center; gap: .35rem; margin: -.375rem; padding: .375rem; border: 0; background: transparent; color: inherit; font: inherit; text-align: start; cursor: pointer; }
    :where(.gluon-data-table-sort:focus-visible, .gluon-data-table-selection-cell input:focus-visible) { outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #173f91); outline-offset: 2px; }
    :where(.gluon-data-table-state) { padding-block: 2rem; color: var(--gluon-data-table-state-color, var(--gluon-color-muted, #53605e)); text-align: center; }
    @media (forced-colors: active) { :where(.gluon-data-table) { border-color: CanvasText; } :where(.gluon-data-table th, .gluon-data-table td) { border-color: CanvasText; } :where(.gluon-data-table tbody tr.is-selected) { background: Highlight; color: HighlightText; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-data-table *) { scroll-behavior: auto; transition: none; } }
  }
`;

export const dataTableStyleDependency = createComponentStyleDependency({
  id: 'gluon-molecule-data-table',
  sheet: dataTableStyles,
  layer: 'molecule',
  order: 30,
  scope: 'gluon-component',
});
