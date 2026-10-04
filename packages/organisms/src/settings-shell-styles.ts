import { createComponentStyleDependency, css } from '@gluonjs/core';

export const settingsShellStyles = css`
  @layer organisms {
    :where(.gluon-settings-shell) { display: grid; min-block-size: var(--gluon-settings-shell-min-block-size, 100dvb); grid-template-rows: auto minmax(0, 1fr) auto; background: var(--gluon-settings-shell-background, var(--gluon-color-canvas, #fff)); color: var(--gluon-settings-shell-color, var(--gluon-color-text, #12312f)); }
    :where(.gluon-settings-shell-title, .gluon-settings-shell-footer) { padding-block: var(--gluon-settings-shell-chrome-padding-block, 1rem); padding-inline: var(--gluon-settings-shell-chrome-padding-inline, 1.25rem); }
    :where(.gluon-settings-shell-layout) { display: grid; grid-template-columns: minmax(var(--gluon-settings-shell-navigation-min, 13rem), var(--gluon-settings-shell-navigation-size, 17rem)) minmax(0, 1fr); min-inline-size: 0; }
    :where(.gluon-settings-shell-navigation, .gluon-settings-shell-content) { min-inline-size: 0; padding-block: var(--gluon-settings-shell-content-padding-block, 1.25rem); padding-inline: var(--gluon-settings-shell-content-padding-inline, 1.25rem); }
    :where(.gluon-settings-shell-navigation) { border-inline-end: 1px solid var(--gluon-settings-shell-border, var(--gluon-color-rule, #b8c9c6)); }
    :where(.gluon-settings-shell-content) { overflow: auto; }
    :where(.gluon-settings-shell-mobile-button) { display: none; }
    :where(.gluon-settings-shell a:focus-visible, .gluon-settings-shell button:focus-visible) { outline: var(--gluon-focus-width, 3px solid Highlight); outline-offset: 2px; }
    @media (max-width: 48rem) { :where(.gluon-settings-shell-mobile-button) { display: inline-flex; min-block-size: 44px; align-items: center; justify-content: center; justify-self: start; padding-inline: 1rem; border: 1px solid var(--gluon-settings-shell-border, var(--gluon-color-rule, #b8c9c6)); background: transparent; color: inherit; font: inherit; } :where(.gluon-settings-shell-layout) { grid-template-columns: 1fr; } :where(.gluon-settings-shell-navigation) { display: none; border-block-end: 1px solid var(--gluon-settings-shell-border, var(--gluon-color-rule, #b8c9c6)); border-inline-end: 0; } :where(.gluon-settings-shell.is-mobile-open .gluon-settings-shell-navigation) { display: block; } }
    @media (forced-colors: active) { :where(.gluon-settings-shell-navigation) { border-color: CanvasText; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-settings-shell, .gluon-settings-shell *) { animation: none !important; transition: none !important; } }
  }
`;

export const settingsShellStyleDependency = createComponentStyleDependency({ id: 'gluon-organism-settings-shell', sheet: settingsShellStyles, layer: 'organism', order: 12, scope: 'gluon-component' });
