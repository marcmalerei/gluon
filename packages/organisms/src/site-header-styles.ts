import { createComponentStyleDependency, css } from '@gluonjs/core';

export const siteHeaderStyles = css`
  @layer organisms {
    :where(.gluon-site-header) { display: block; min-inline-size: 0; border-block-end: 1px solid var(--gluon-site-header-border, var(--gluon-color-rule, #b8c9c6)); background: var(--gluon-site-header-background, var(--gluon-color-canvas, #fff)); color: var(--gluon-site-header-color, var(--gluon-color-text, #12312f)); }
    :where(.gluon-site-header-row) { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: var(--gluon-site-header-gap, 1rem); min-block-size: var(--gluon-site-header-min-block-size, 4rem); padding-inline: var(--gluon-site-header-padding-inline, 1rem); }
    :where(.gluon-site-header-brand) { min-inline-size: 0; color: inherit; font-weight: 700; }
    :where(.gluon-site-header-navigation) { min-inline-size: 0; }
    :where(.gluon-site-header-navigation > *) { max-inline-size: 100%; }
    :where(.gluon-site-header-actions) { display: inline-flex; align-items: center; justify-content: end; gap: .5rem; min-inline-size: 0; }
    :where(.gluon-site-header-mobile-trigger) { display: none; min-block-size: 44px; min-inline-size: 44px; padding: .625rem .75rem; border: 1px solid var(--gluon-site-header-trigger-border, currentcolor); border-radius: var(--gluon-site-header-trigger-radius, .5rem); background: var(--gluon-site-header-trigger-background, transparent); color: inherit; font: inherit; cursor: pointer; }
    :where(.gluon-site-header-mobile-trigger:hover, .gluon-site-header-mobile-trigger:focus-visible) { background: var(--gluon-site-header-trigger-hover-background, color-mix(in srgb, currentcolor 10%, transparent)); }
    :where(.gluon-site-header-mobile-panel) { display: none; padding: var(--gluon-site-header-mobile-padding, 1rem); border-block-start: 1px solid var(--gluon-site-header-border, var(--gluon-color-rule, #b8c9c6)); background: var(--gluon-site-header-mobile-background, var(--gluon-site-header-background, #fff)); }
    :where(.gluon-site-header-mobile-panel:not([hidden])) { display: block; }
    :where(.gluon-site-header-mobile-navigation) { display: grid; gap: .5rem; }
    :where(.gluon-site-header-mobile-trigger:focus-visible) { outline: var(--gluon-focus-width, 3px solid Highlight); outline-offset: 2px; }
    @media (max-width: 48rem) {
      :where(.gluon-site-header-row) { grid-template-columns: minmax(0, 1fr) auto; }
      :where(.gluon-site-header-navigation) { display: none; }
      :where(.gluon-site-header-mobile-trigger) { display: inline-flex; align-items: center; justify-content: center; }
    }
    @media (forced-colors: active) { :where(.gluon-site-header) { border-color: CanvasText; background: Canvas; color: CanvasText; } :where(.gluon-site-header-mobile-trigger) { border-color: ButtonText; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-site-header, .gluon-site-header *) { animation: none !important; transition: none !important; } }
  }
`;

export const siteHeaderStyleDependency = createComponentStyleDependency({ id: 'gluon-organism-site-header', sheet: siteHeaderStyles, layer: 'organism', order: 9, scope: 'gluon-component' });
