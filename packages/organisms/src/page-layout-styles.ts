import { createComponentStyleDependency, css } from '@gluonjs/core';

export const pageLayoutStyles = css`
  @layer organisms {
    :where(.gluon-page-layout) { --gluon-page-layout-max-inline-size: 90rem; --gluon-page-layout-gutter: 1.25rem; --gluon-page-layout-gap: 1.5rem; display: grid; min-block-size: 100%; grid-template-rows: auto 1fr auto; background: var(--gluon-page-layout-background, var(--gluon-color-canvas, white)); color: var(--gluon-page-layout-color, var(--gluon-color-text, #12312f)); font-family: var(--gluon-font-family, ui-sans-serif, system-ui, sans-serif); }
    :where(.gluon-page-layout-header, .gluon-page-layout-body, .gluon-page-layout-footer) { inline-size: min(100%, var(--gluon-page-layout-max-inline-size)); margin-inline: auto; padding-inline: var(--gluon-page-layout-gutter); }
    :where(.gluon-page-layout-header) { display: grid; gap: .75rem; padding-block: var(--gluon-page-layout-gutter); border-block-end: 1px solid var(--gluon-page-layout-divider, color-mix(in srgb, currentColor 18%, transparent)); }
    :where(.gluon-page-layout-breadcrumbs) { color: var(--gluon-page-layout-muted, color-mix(in srgb, currentColor 68%, transparent)); font-size: .875rem; }
    :where(.gluon-page-layout-heading-row) { display: flex; flex-wrap: wrap; align-items: end; justify-content: space-between; gap: var(--gluon-page-layout-gap); }
    :where(.gluon-page-layout-heading-row > :first-child) { margin: 0; font-size: clamp(1.5rem, 2vw, 2.25rem); line-height: 1.1; }
    :where(.gluon-page-layout-actions) { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
    :where(.gluon-page-layout-body) { display: grid; grid-template-columns: minmax(0, 1fr) minmax(12rem, 20rem); gap: var(--gluon-page-layout-gap); align-items: start; padding-block: calc(var(--gluon-page-layout-gutter) * 1.5); }
    :where(.gluon-page-layout-main) { min-inline-size: 0; }
    :where(.gluon-page-layout-aside) { min-inline-size: 0; padding: var(--gluon-page-layout-gutter); border: 1px solid var(--gluon-page-layout-divider, color-mix(in srgb, currentColor 18%, transparent)); border-radius: var(--gluon-page-layout-radius, .5rem); }
    :where(.gluon-page-layout-footer) { padding-block: var(--gluon-page-layout-gutter); border-block-start: 1px solid var(--gluon-page-layout-divider, color-mix(in srgb, currentColor 18%, transparent)); color: var(--gluon-page-layout-muted, color-mix(in srgb, currentColor 68%, transparent)); }
    @media (max-width: 48rem) { :where(.gluon-page-layout-body) { grid-template-columns: 1fr; } :where(.gluon-page-layout-actions) { inline-size: 100%; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-page-layout *) { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; } }
    @media (forced-colors: active) { :where(.gluon-page-layout-aside) { border: 1px solid CanvasText; } :where(.gluon-page-layout-header, .gluon-page-layout-footer) { border-color: CanvasText; } }
  }
`;

export const pageLayoutStyleDependency = createComponentStyleDependency({ id: 'gluon-organism-page-layout', sheet: pageLayoutStyles, layer: 'organism', order: 2, scope: 'gluon-component' });
