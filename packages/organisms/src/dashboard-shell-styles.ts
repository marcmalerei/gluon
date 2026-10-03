import { createComponentStyleDependency, css } from '@gluonjs/core';

export const dashboardShellStyles = css`
  @layer organisms {
    :where(.gluon-dashboard-shell) { display: grid; min-block-size: var(--gluon-dashboard-shell-min-block-size, 100dvb); grid-template-rows: auto auto minmax(0, 1fr) auto; background: var(--gluon-dashboard-shell-background, var(--gluon-color-canvas, #fff)); color: var(--gluon-dashboard-shell-color, var(--gluon-color-text, #12312f)); }
    :where(.gluon-dashboard-shell-header, .gluon-dashboard-shell-footer) { padding-block: var(--gluon-dashboard-shell-chrome-padding-block, 1rem); padding-inline: var(--gluon-dashboard-shell-chrome-padding-inline, 1.25rem); }
    :where(.gluon-dashboard-shell-layout) { display: grid; grid-template-columns: minmax(var(--gluon-dashboard-shell-sidebar-min, 14rem), var(--gluon-dashboard-shell-sidebar-size, 18rem)) minmax(0, 1fr) minmax(0, var(--gluon-dashboard-shell-utility-size, 18rem)); min-inline-size: 0; }
    :where(.gluon-dashboard-shell-sidebar, .gluon-dashboard-shell-main, .gluon-dashboard-shell-utility) { min-inline-size: 0; padding-block: var(--gluon-dashboard-shell-content-padding-block, 1.25rem); padding-inline: var(--gluon-dashboard-shell-content-padding-inline, 1.25rem); }
    :where(.gluon-dashboard-shell-sidebar, .gluon-dashboard-shell-utility) { border-inline-end: 1px solid var(--gluon-dashboard-shell-border, var(--gluon-color-rule, #b8c9c6)); }
    :where(.gluon-dashboard-shell-utility) { border-inline: 1px solid var(--gluon-dashboard-shell-border, var(--gluon-color-rule, #b8c9c6)); }
    :where(.gluon-dashboard-shell-main) { overflow: auto; }
    :where(.gluon-dashboard-shell-mobile-button) { display: none; }
    :where(.gluon-dashboard-shell a:focus-visible, .gluon-dashboard-shell button:focus-visible) { outline: var(--gluon-focus-width, 3px solid Highlight); outline-offset: 2px; }
    @media (max-width: 64rem) { :where(.gluon-dashboard-shell-layout) { grid-template-columns: minmax(var(--gluon-dashboard-shell-sidebar-min, 14rem), var(--gluon-dashboard-shell-sidebar-size, 16rem)) minmax(0, 1fr); } :where(.gluon-dashboard-shell-utility) { grid-column: 1 / -1; border-block-start: 1px solid var(--gluon-dashboard-shell-border, var(--gluon-color-rule, #b8c9c6)); border-inline: 0; } }
    @media (max-width: 48rem) { :where(.gluon-dashboard-shell-mobile-button) { display: inline-flex; min-block-size: 44px; align-items: center; justify-content: center; justify-self: start; padding-inline: 1rem; border: 1px solid var(--gluon-dashboard-shell-border, var(--gluon-color-rule, #b8c9c6)); background: transparent; color: inherit; font: inherit; } :where(.gluon-dashboard-shell-layout) { grid-template-columns: 1fr; } :where(.gluon-dashboard-shell-sidebar) { display: none; border-block-end: 1px solid var(--gluon-dashboard-shell-border, var(--gluon-color-rule, #b8c9c6)); border-inline-end: 0; } :where(.gluon-dashboard-shell.is-mobile-open .gluon-dashboard-shell-sidebar) { display: block; } :where(.gluon-dashboard-shell-utility) { grid-column: auto; } }
    @media (forced-colors: active) { :where(.gluon-dashboard-shell-sidebar, .gluon-dashboard-shell-utility) { border-color: CanvasText; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-dashboard-shell, .gluon-dashboard-shell *) { animation: none !important; transition: none !important; } }
  }
`;

export const dashboardShellStyleDependency = createComponentStyleDependency({ id: 'gluon-organism-dashboard-shell', sheet: dashboardShellStyles, layer: 'organism', order: 12, scope: 'gluon-component' });
