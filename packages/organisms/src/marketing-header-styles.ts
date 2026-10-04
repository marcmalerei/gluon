import { createComponentStyleDependency, css } from '@gluonjs/core';

export const marketingHeaderStyles = css`
  @layer organisms {
    :where(.gluon-marketing-header) { display: block; min-inline-size: 0; border-block-end: 1px solid var(--gluon-marketing-header-border, var(--gluon-color-rule, #b8c9c6)); background: var(--gluon-marketing-header-background, var(--gluon-color-canvas, #fff)); color: var(--gluon-marketing-header-color, var(--gluon-color-text, #12312f)); }
    :where(.gluon-marketing-header-announcement) { padding: .5rem var(--gluon-marketing-header-padding-inline, 1rem); background: var(--gluon-marketing-header-announcement-background, var(--gluon-color-ink, #12312f)); color: var(--gluon-marketing-header-announcement-color, var(--gluon-color-inverse, #fff)); text-align: center; font-size: .8125rem; }
    :where(.gluon-marketing-header-row) { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: var(--gluon-marketing-header-gap, 1rem); min-block-size: var(--gluon-marketing-header-min-block-size, 4.5rem); padding-inline: var(--gluon-marketing-header-padding-inline, 1rem); }
    :where(.gluon-marketing-header-brand) { min-inline-size: 0; color: inherit; font-weight: 750; letter-spacing: .02em; }
    :where(.gluon-marketing-header-navigation) { min-inline-size: 0; }
    :where(.gluon-marketing-header-actions) { display: inline-flex; align-items: center; justify-content: end; gap: .5rem; min-inline-size: 0; }
    :where(.gluon-marketing-header-mobile-trigger) { display: none; min-block-size: 44px; min-inline-size: 44px; padding: .625rem .75rem; border: 1px solid var(--gluon-marketing-header-trigger-border, currentcolor); border-radius: var(--gluon-marketing-header-trigger-radius, .5rem); background: var(--gluon-marketing-header-trigger-background, transparent); color: inherit; font: inherit; cursor: pointer; }
    :where(.gluon-marketing-header-mobile-trigger:hover, .gluon-marketing-header-mobile-trigger:focus-visible) { background: var(--gluon-marketing-header-trigger-hover-background, color-mix(in srgb, currentcolor 10%, transparent)); }
    :where(.gluon-marketing-header-mobile-panel) { display: none; padding: var(--gluon-marketing-header-mobile-padding, 1rem); border-block-start: 1px solid var(--gluon-marketing-header-border, var(--gluon-color-rule, #b8c9c6)); background: var(--gluon-marketing-header-mobile-background, var(--gluon-marketing-header-background, #fff)); }
    :where(.gluon-marketing-header-mobile-panel:not([hidden])) { display: block; }
    :where(.gluon-marketing-header-mobile-navigation) { display: grid; gap: .5rem; }
    :where(.gluon-marketing-header-mobile-trigger:focus-visible) { outline: var(--gluon-focus-width, 3px solid Highlight); outline-offset: 2px; }
    @media (max-width: 48rem) { :where(.gluon-marketing-header-row) { grid-template-columns: minmax(0, 1fr) auto; } :where(.gluon-marketing-header-navigation) { display: none; } :where(.gluon-marketing-header-mobile-trigger) { display: inline-flex; align-items: center; justify-content: center; } }
    @media (forced-colors: active) { :where(.gluon-marketing-header) { border-color: CanvasText; background: Canvas; color: CanvasText; } :where(.gluon-marketing-header-announcement) { border-block-end: 1px solid CanvasText; background: Canvas; color: CanvasText; } :where(.gluon-marketing-header-mobile-trigger) { border-color: ButtonText; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-marketing-header, .gluon-marketing-header *) { animation: none !important; transition: none !important; } }
  }
`;

export const marketingHeaderStyleDependency = createComponentStyleDependency({ id: 'gluon-organism-marketing-header', sheet: marketingHeaderStyles, layer: 'organism', order: 10, scope: 'gluon-component' });
