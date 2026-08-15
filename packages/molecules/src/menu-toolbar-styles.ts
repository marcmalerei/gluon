import { createComponentStyleDependency, css } from '@gluonjs/core';
export const menuToolbarStyles = css`
  @layer molecules {
    :where(.gluon-menu, .gluon-context-menu-target) { position: relative; display: inline-block; min-inline-size: 0; }
    :where(.gluon-menu-trigger, .gluon-menu-item) { min-block-size: 44px; min-inline-size: 44px; border: 0; background: var(--gluon-menu-background, transparent); color: inherit; font: inherit; text-align: start; cursor: pointer; }
    :where(.gluon-menu-trigger) { padding: .5rem .75rem; }
    :where(.gluon-menu [role="menu"]) { position: absolute; z-index: 20; inset-block-start: 100%; inset-inline-start: 0; min-inline-size: 12rem; margin: .25rem 0 0; padding: .25rem; border: 1px solid var(--gluon-menu-border, #d9e4e2); background: var(--gluon-menu-surface, white); box-shadow: 0 .75rem 2rem rgb(0 0 0 / 15%); list-style: none; }
    :where(.gluon-menu [role="menu"] [role="menu"]) { inset-block-start: 0; inset-inline-start: 100%; margin: 0; }
    :where(.gluon-menu-item) { display: block; inline-size: 100%; padding: .5rem .75rem; }
    :where(.gluon-menu-item:hover, .gluon-menu-item:focus-visible) { background: var(--gluon-menu-hover, #eef5f3); outline: none; }
    :where(.gluon-menu-item[aria-disabled="true"]) { cursor: not-allowed; opacity: .5; }
    :where(.gluon-menu-item[aria-checked="true"])::before { content: '✓'; display: inline-block; inline-size: 1.25rem; }
    :where(.gluon-menu-separator) { block-size: 1px; margin: .25rem 0; background: var(--gluon-menu-border, #d9e4e2); }
    :where(.gluon-toolbar) { display: inline-flex; align-items: center; gap: .25rem; min-inline-size: 0; }
    :where(.gluon-toolbar.is-vertical) { flex-direction: column; align-items: stretch; }
    @media (forced-colors: active) { :where(.gluon-menu-item:focus-visible) { outline: 2px solid Highlight; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-menu *) { transition: none !important; } }
  }
`;
export const menuToolbarStyleDependency = createComponentStyleDependency({ id: 'gluon-molecule-menu-toolbar', sheet: menuToolbarStyles, layer: 'molecule', order: 8, scope: 'gluon-component' });
