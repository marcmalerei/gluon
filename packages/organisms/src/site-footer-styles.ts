import { createComponentStyleDependency, css } from '@gluonjs/core';

export const siteFooterStyles = css`
  @layer organisms {
    :where(.gluon-site-footer) {
      display: block;
      min-inline-size: 0;
      border-block-start: 1px solid var(--gluon-site-footer-border, var(--gluon-color-rule, #b8c9c6));
      background: var(--gluon-site-footer-background, var(--gluon-color-canvas, #fff));
      color: var(--gluon-site-footer-color, var(--gluon-color-text, #12312f));
    }
    :where(.gluon-site-footer-inner) {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: var(--gluon-site-footer-gap, 1.5rem);
      max-inline-size: var(--gluon-site-footer-max-inline-size, 80rem);
      margin-inline: auto;
      padding-block: var(--gluon-site-footer-padding-block, 2rem);
      padding-inline: var(--gluon-site-footer-padding-inline, 1rem);
    }
    :where(.gluon-site-footer-brand) { flex: 1 1 var(--gluon-site-footer-brand-basis, 12rem); min-inline-size: 0; color: inherit; font-weight: 700; }
    :where(.gluon-site-footer-navigation) { display: grid; flex: 2 1 var(--gluon-site-footer-navigation-basis, 20rem); grid-template-columns: repeat(auto-fit, minmax(var(--gluon-site-footer-navigation-column-min, 8rem), 1fr)); gap: var(--gluon-site-footer-navigation-gap, 1rem); min-inline-size: 0; }
    :where(.gluon-site-footer-navigation > *) { min-inline-size: 0; }
    :where(.gluon-site-footer-legal, .gluon-site-footer-meta) { display: flex; flex: 1 1 var(--gluon-site-footer-region-basis, 10rem); flex-wrap: wrap; align-items: center; gap: .5rem 1rem; min-inline-size: 0; }
    :where(.gluon-site-footer a:focus-visible) { outline: var(--gluon-focus-width, 3px solid Highlight); outline-offset: 2px; }
    @media (max-width: 48rem) {
      :where(.gluon-site-footer-inner) { display: grid; grid-template-columns: 1fr; }
      :where(.gluon-site-footer-navigation) { grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); }
    }
    @media (forced-colors: active) { :where(.gluon-site-footer) { border-color: CanvasText; background: Canvas; color: CanvasText; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-site-footer, .gluon-site-footer *) { animation: none !important; transition: none !important; } }
  }
`;

export const siteFooterStyleDependency = createComponentStyleDependency({ id: 'gluon-organism-site-footer', sheet: siteFooterStyles, layer: 'organism', order: 10, scope: 'gluon-component' });
