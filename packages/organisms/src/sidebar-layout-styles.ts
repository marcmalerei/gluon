import { createComponentStyleDependency, css } from '@gluonjs/core';

export const sidebarLayoutStyles = css`
  @layer organisms {
    :where(.gluon-sidebar-layout) { display: grid; min-block-size: var(--gluon-sidebar-layout-min-block-size, 100dvb); grid-template-rows: auto auto minmax(0, 1fr) auto; background: var(--gluon-sidebar-layout-background, var(--gluon-color-canvas, #fff)); color: var(--gluon-sidebar-layout-color, var(--gluon-color-text, #12312f)); }
    :where(.gluon-sidebar-layout-layout) { display: grid; grid-template-columns: minmax(var(--gluon-sidebar-layout-sidebar-min, 14rem), var(--gluon-sidebar-layout-sidebar-size, 18rem)) minmax(0, 1fr); min-inline-size: 0; }
    :where(.gluon-sidebar-layout-header, .gluon-sidebar-layout-footer) { min-inline-size: 0; padding-block: var(--gluon-sidebar-layout-chrome-padding-block, 1rem); padding-inline: var(--gluon-sidebar-layout-chrome-padding-inline, 1.25rem); }
    :where(.gluon-sidebar-layout-sidebar, .gluon-sidebar-layout-main) { min-inline-size: 0; padding-block: var(--gluon-sidebar-layout-content-padding-block, 1.25rem); padding-inline: var(--gluon-sidebar-layout-content-padding-inline, 1.25rem); }
    :where(.gluon-sidebar-layout-sidebar) { border-inline-end: 1px solid var(--gluon-sidebar-layout-border, var(--gluon-color-rule, #b8c9c6)); }
    :where(.gluon-sidebar-layout-main) { overflow: auto; }
    :where(.gluon-sidebar-layout-mobile-button) { display: none; }
    :where(.gluon-sidebar-layout a:focus-visible, .gluon-sidebar-layout button:focus-visible) { outline: var(--gluon-focus-width, 3px solid Highlight); outline-offset: 2px; }
    @media (max-width: 48rem) { :where(.gluon-sidebar-layout-mobile-button) { display: inline-flex; min-block-size: 44px; align-items: center; justify-content: center; justify-self: start; margin-inline: var(--gluon-sidebar-layout-content-padding-inline, 1.25rem); padding-inline: 1rem; border: 1px solid var(--gluon-sidebar-layout-border, var(--gluon-color-rule, #b8c9c6)); background: transparent; color: inherit; font: inherit; } :where(.gluon-sidebar-layout-layout) { grid-template-columns: 1fr; } :where(.gluon-sidebar-layout-sidebar) { display: none; border-block-end: 1px solid var(--gluon-sidebar-layout-border, var(--gluon-color-rule, #b8c9c6)); border-inline-end: 0; } :where(.gluon-sidebar-layout.is-mobile-open .gluon-sidebar-layout-sidebar) { display: block; } }
    @media (forced-colors: active) { :where(.gluon-sidebar-layout-sidebar, .gluon-sidebar-layout-mobile-button) { border-color: CanvasText; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-sidebar-layout, .gluon-sidebar-layout *) { animation: none !important; transition: none !important; } }
  }
`;

export const sidebarLayoutStyleDependency = createComponentStyleDependency({ id: 'gluon-organism-sidebar-layout', sheet: sidebarLayoutStyles, layer: 'organism', order: 13, scope: 'gluon-component' });
