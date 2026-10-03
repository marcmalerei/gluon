import { createComponentStyleDependency, css } from '@gluonjs/core';

export const splitPaneStyles = css`
  @layer organisms {
    :where(.gluon-split-pane) { --gluon-split-pane-gap: .75rem; --gluon-split-pane-secondary-size: minmax(14rem, 24rem); display: grid; min-inline-size: 0; min-block-size: 0; gap: var(--gluon-split-pane-gap); color: var(--gluon-split-pane-color, var(--gluon-color-text, #12312f)); background: var(--gluon-split-pane-background, transparent); }
    :where(.gluon-split-pane.is-horizontal) { grid-template-columns: minmax(0, 1fr) var(--gluon-split-pane-secondary-size); }
    :where(.gluon-split-pane.is-vertical) { grid-template-rows: minmax(0, 1fr) var(--gluon-split-pane-secondary-size); }
    :where(.gluon-split-pane.is-horizontal.is-secondary-collapsed) { grid-template-columns: minmax(0, 1fr) auto; }
    :where(.gluon-split-pane.is-vertical.is-secondary-collapsed) { grid-template-rows: minmax(0, 1fr) auto; }
    :where(.gluon-split-pane-primary, .gluon-split-pane-secondary) { min-inline-size: 0; min-block-size: 0; }
    :where(.gluon-split-pane-primary) { overflow: auto; }
    :where(.gluon-split-pane-secondary) { overflow: auto; border: 1px solid var(--gluon-split-pane-border, var(--gluon-color-rule, #b8c9c6)); border-radius: var(--gluon-split-pane-radius, .5rem); background: var(--gluon-split-pane-secondary-background, var(--gluon-color-canvas, #fff)); }
    :where(.gluon-split-pane.is-secondary-collapsed .gluon-split-pane-secondary) { align-self: start; }
    :where(.gluon-split-pane-secondary-header) { display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding: .625rem .75rem; border-block-end: 1px solid var(--gluon-split-pane-border, var(--gluon-color-rule, #b8c9c6)); }
    :where(.gluon-split-pane-secondary-label) { font-weight: 650; }
    :where(.gluon-split-pane-toggle) { min-block-size: 2.75rem; min-inline-size: 2.75rem; padding: .5rem .625rem; border: 1px solid var(--gluon-split-pane-border, currentColor); border-radius: var(--gluon-split-pane-control-radius, .375rem); color: inherit; background: transparent; cursor: pointer; }
    :where(.gluon-split-pane-toggle:focus-visible) { outline: var(--gluon-focus-width, 3px solid Highlight); outline-offset: 2px; }
    :where(.gluon-split-pane-secondary-content) { padding: var(--gluon-split-pane-secondary-padding, 1rem); }
    @media (max-width: 48rem) { :where(.gluon-split-pane.is-horizontal, .gluon-split-pane.is-vertical) { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto; } :where(.gluon-split-pane.is-horizontal.is-secondary-collapsed, .gluon-split-pane.is-vertical.is-secondary-collapsed) { grid-template-rows: minmax(0, 1fr) auto; } :where(.gluon-split-pane-secondary) { max-block-size: var(--gluon-split-pane-mobile-secondary-max-block-size, 22rem); } }
    @media (forced-colors: active) { :where(.gluon-split-pane-secondary, .gluon-split-pane-secondary-header, .gluon-split-pane-toggle) { border-color: CanvasText; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-split-pane, .gluon-split-pane *) { animation: none !important; transition: none !important; } }
  }
`;

export const splitPaneStyleDependency = createComponentStyleDependency({ id: 'gluon-organism-split-pane', sheet: splitPaneStyles, layer: 'organism', order: 2, scope: 'gluon-component' });
