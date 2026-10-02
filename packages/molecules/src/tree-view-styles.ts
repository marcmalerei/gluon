import { createComponentStyleDependency, css } from '@gluonjs/core';

export const treeViewStyles = css`
  @layer molecules {
    :where(.gluon-tree-view) { display: grid; gap: .125rem; min-inline-size: 0; margin: 0; padding: var(--gluon-tree-view-padding, .375rem); border: 1px solid var(--gluon-tree-view-border, var(--gluon-color-rule, #b8c9c6)); border-radius: var(--gluon-tree-view-radius, var(--gluon-radius-control, .625rem)); background: var(--gluon-tree-view-background, var(--gluon-color-surface, #fff)); color: var(--gluon-tree-view-color, inherit); list-style: none; }
    :where(.gluon-tree-view [role="treeitem"]) { display: grid; grid-template-columns: var(--gluon-tree-view-toggle-size, 2rem) minmax(0, 1fr); align-items: center; min-block-size: 44px; padding-inline-start: var(--gluon-tree-view-indent, .25rem); border-radius: var(--gluon-tree-view-item-radius, .375rem); }
    :where(.gluon-tree-view [role="group"]) { grid-column: 1 / -1; display: grid; gap: .125rem; margin-inline-start: var(--gluon-tree-view-group-indent, 1.25rem); padding: 0; list-style: none; }
    :where(.gluon-tree-view [role="treeitem"][aria-selected="true"]) { background: var(--gluon-tree-view-selected-background, var(--gluon-color-action-soft, #e6f4f1)); color: var(--gluon-tree-view-selected-color, var(--gluon-color-action-soft-text, #075e5b)); font-weight: 650; }
    :where(.gluon-tree-view [role="treeitem"].is-disabled) { color: var(--gluon-tree-view-disabled-color, var(--gluon-color-muted, #526663)); opacity: .62; }
    :where(.gluon-tree-view-toggle) { display: inline-grid; min-inline-size: 32px; min-block-size: 32px; place-items: center; border: 0; background: transparent; color: inherit; font: inherit; }
    :where(.gluon-tree-view [role="treeitem"]:focus-visible, .gluon-tree-view-toggle:focus-visible) { outline: var(--gluon-focus-width, 3px solid Highlight); outline-offset: 2px; }
    @media (forced-colors: active) { :where(.gluon-tree-view) { border-color: ButtonText; background: Canvas; color: CanvasText; } :where(.gluon-tree-view [role="treeitem"][aria-selected="true"]) { background: Highlight; color: HighlightText; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-tree-view, .gluon-tree-view *) { animation: none !important; transition: none !important; } }
  }
`;

export const treeViewStyleDependency = createComponentStyleDependency({ id: 'gluon-molecule-tree-view', sheet: treeViewStyles, layer: 'molecule', order: 46, scope: 'gluon-component' });
