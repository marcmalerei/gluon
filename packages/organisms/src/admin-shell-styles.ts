import { createComponentStyleDependency, css } from '@gluonjs/core';

export const adminShellStyles = css`
  @layer organisms {
    :where(.gluon-admin-shell) {
      display: grid;
      min-block-size: var(--gluon-admin-shell-min-block-size, 100dvb);
      grid-template-rows: auto minmax(0, 1fr) auto;
      background: var(--gluon-admin-shell-background, var(--gluon-color-canvas, #fff));
      color: var(--gluon-admin-shell-color, var(--gluon-color-text, #12312f));
    }
    :where(.gluon-admin-shell-layout) {
      display: grid;
      grid-template-columns: minmax(var(--gluon-admin-shell-sidebar-min, 14rem), var(--gluon-admin-shell-sidebar-size, 18rem)) minmax(0, 1fr);
      min-inline-size: 0;
    }
    :where(.gluon-admin-shell-header, .gluon-admin-shell-sidebar, .gluon-admin-shell-main, .gluon-admin-shell-footer) {
      min-inline-size: 0;
    }
    :where(.gluon-admin-shell-header, .gluon-admin-shell-footer) {
      padding-block: var(--gluon-admin-shell-chrome-padding-block, 1rem);
      padding-inline: var(--gluon-admin-shell-chrome-padding-inline, 1.25rem);
    }
    :where(.gluon-admin-shell-sidebar, .gluon-admin-shell-main) {
      padding-block: var(--gluon-admin-shell-content-padding-block, 1.25rem);
      padding-inline: var(--gluon-admin-shell-content-padding-inline, 1.25rem);
    }
    :where(.gluon-admin-shell-sidebar) {
      border-inline-end: 1px solid var(--gluon-admin-shell-border, var(--gluon-color-rule, #b8c9c6));
    }
    :where(.gluon-admin-shell-main) { overflow: auto; }
    :where(.gluon-admin-shell a:focus-visible, .gluon-admin-shell button:focus-visible) {
      outline: var(--gluon-focus-width, 3px solid Highlight);
      outline-offset: 2px;
    }
    @media (max-width: 48rem) {
      :where(.gluon-admin-shell-layout) { grid-template-columns: 1fr; }
      :where(.gluon-admin-shell-sidebar) {
        border-block-end: 1px solid var(--gluon-admin-shell-border, var(--gluon-color-rule, #b8c9c6));
        border-inline-end: 0;
      }
    }
    @media (forced-colors: active) {
      :where(.gluon-admin-shell-sidebar) { border-color: CanvasText; }
    }
    @media (prefers-reduced-motion: reduce) {
      :where(.gluon-admin-shell, .gluon-admin-shell *) { animation: none !important; transition: none !important; }
    }
  }
`;

export const adminShellStyleDependency = createComponentStyleDependency({ id: 'gluon-organism-admin-shell', sheet: adminShellStyles, layer: 'organism', order: 11, scope: 'gluon-component' });
