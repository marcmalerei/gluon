import { createComponentStyleDependency, css } from '@gluonjs/core';

export const megaMenuStyles = css`
  @layer organisms {
    :where(.gluon-mega-menu) { position: relative; min-inline-size: 0; }
    :where(.gluon-mega-menu-trigger) { display: inline-flex; align-items: center; gap: .5rem; min-block-size: 44px; min-inline-size: 44px; padding: .625rem .875rem; border: 0; background: transparent; color: inherit; font: inherit; cursor: pointer; }
    :where(.gluon-mega-menu-trigger:hover) { background: var(--gluon-mega-menu-trigger-hover-background, color-mix(in srgb, currentcolor 10%, transparent)); }
    :where(.gluon-mega-menu-chevron) { line-height: 1; transition: transform 120ms ease; }
    :where(.gluon-mega-menu.is-open .gluon-mega-menu-chevron) { transform: rotate(180deg); }
    :where(.gluon-mega-menu-panel) { position: absolute; inset-block-start: 100%; inset-inline: 0; z-index: 5; min-inline-size: min(60rem, calc(100vw - 2rem)); padding: var(--gluon-mega-menu-panel-padding, 1.25rem); border: 1px solid var(--gluon-mega-menu-border, var(--gluon-color-rule, #b8c9c6)); border-radius: var(--gluon-mega-menu-radius, var(--gluon-radius-panel, .875rem)); background: var(--gluon-mega-menu-background, var(--gluon-color-surface, #fff)); color: var(--gluon-mega-menu-color, inherit); box-shadow: var(--gluon-mega-menu-shadow, 0 18px 48px rgb(18 49 47 / 18%)); }
    :where(.gluon-mega-menu-panel[hidden]) { display: none; }
    :where(.gluon-mega-menu-groups) { display: grid; grid-template-columns: repeat(var(--gluon-mega-menu-columns, 3), minmax(0, 1fr)); gap: var(--gluon-mega-menu-gap, 1.25rem); }
    :where(.gluon-mega-menu-group) { min-inline-size: 0; }
    :where(.gluon-mega-menu-group-label) { margin: 0 0 .5rem; font-size: .8125rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
    :where(.gluon-mega-menu-links) { display: grid; gap: .25rem; margin: 0; padding: 0; list-style: none; }
    :where(.gluon-mega-menu-link) { display: grid; gap: .125rem; min-block-size: 44px; padding: .625rem .75rem; border-radius: var(--gluon-mega-menu-link-radius, .5rem); color: inherit; text-decoration: none; }
    :where(.gluon-mega-menu-link:hover, .gluon-mega-menu-link:focus-visible) { background: var(--gluon-mega-menu-link-hover-background, var(--gluon-color-action-soft, #e6f4f1)); color: var(--gluon-mega-menu-link-hover-color, var(--gluon-color-action-soft-text, #075e5b)); }
    :where(.gluon-mega-menu-link[aria-current='page']) { font-weight: 700; }
    :where(.gluon-mega-menu-link[aria-disabled='true']) { cursor: not-allowed; opacity: .55; }
    :where(.gluon-mega-menu-link-description, .gluon-mega-menu-description) { color: var(--gluon-mega-menu-muted-color, var(--gluon-color-muted, #526663)); font-size: .8125rem; }
    :where(.gluon-mega-menu-trigger:focus-visible, .gluon-mega-menu-link:focus-visible) { outline: var(--gluon-focus-width, 3px solid Highlight); outline-offset: 2px; }
    @media (max-width: 48rem) { :where(.gluon-mega-menu-panel) { position: static; min-inline-size: 0; border-inline: 0; border-radius: 0; box-shadow: none; } :where(.gluon-mega-menu-groups) { grid-template-columns: 1fr; } }
    @media (forced-colors: active) { :where(.gluon-mega-menu-panel) { border-color: ButtonText; background: Canvas; color: CanvasText; } :where(.gluon-mega-menu-link:focus-visible, .gluon-mega-menu-trigger:focus-visible) { outline-color: Highlight; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-mega-menu, .gluon-mega-menu *) { animation: none !important; transition: none !important; } }
  }
`;

export const megaMenuStyleDependency = createComponentStyleDependency({ id: 'gluon-organism-mega-menu', sheet: megaMenuStyles, layer: 'organism', order: 8, scope: 'gluon-component' });
