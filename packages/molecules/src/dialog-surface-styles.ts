import { createComponentStyleDependency, css } from '@gluonjs/core';

export const dialogSurfaceStyles = css`
  @layer molecules {
    :where(.gluon-dialog-surface-overlay) { position: fixed; inset: 0; z-index: var(--gluon-dialog-z-index, 100); display: grid; place-items: center; overflow: auto; padding: var(--gluon-dialog-overlay-padding, 1rem); background: var(--gluon-dialog-overlay-background, rgb(15 23 42 / 45%)); }
    :where(.gluon-dialog-surface) { display: flex; flex-direction: column; inline-size: min(100%, var(--gluon-dialog-inline-size, 38rem)); max-block-size: min(calc(100dvh - 2rem), var(--gluon-dialog-max-block-size, 48rem)); overflow: hidden; border: var(--gluon-dialog-border, 1px solid var(--gluon-color-rule, #d9e4e2)); border-radius: var(--gluon-dialog-radius, var(--gluon-radius-surface, 0.75rem)); background: var(--gluon-dialog-background, var(--gluon-color-surface, #fff)); color: var(--gluon-dialog-color, inherit); box-shadow: var(--gluon-dialog-shadow, 0 1.5rem 4rem rgb(15 23 42 / 24%)); }
    :where(.gluon-dialog-surface.is-end) { margin-inline-start: auto; block-size: 100%; max-block-size: none; border-radius: 0; }
    :where(.gluon-dialog-surface.is-full) { inline-size: 100%; block-size: 100%; max-block-size: none; border-radius: 0; }
    :where(.gluon-dialog-surface-header) { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: var(--gluon-dialog-header-padding, 1rem 1.25rem); border-block-end: var(--gluon-dialog-section-border, 1px solid var(--gluon-color-rule, #d9e4e2)); }
    :where(.gluon-dialog-surface-title) { margin: 0; font: inherit; font-size: var(--gluon-dialog-title-size, 1.25rem); font-weight: 700; }
    :where(.gluon-dialog-surface-description) { margin: 0; padding: var(--gluon-dialog-description-padding, 0.75rem 1.25rem 0); color: var(--gluon-dialog-description-color, var(--gluon-color-muted, #53605e)); }
    :where(.gluon-dialog-surface-content) { min-block-size: 0; overflow: auto; padding: var(--gluon-dialog-content-padding, 1.25rem); }
    :where(.gluon-dialog-surface-footer) { padding: var(--gluon-dialog-footer-padding, 1rem 1.25rem); border-block-start: var(--gluon-dialog-section-border, 1px solid var(--gluon-color-rule, #d9e4e2)); }
    :where(.gluon-dialog-surface:focus-visible) { outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #173f91); outline-offset: -3px; }
    @media (max-width: 30rem) { :where(.gluon-dialog-surface-overlay) { padding: var(--gluon-dialog-mobile-overlay-padding, 0); } :where(.gluon-dialog-surface) { inline-size: 100%; max-block-size: 100dvh; border-radius: var(--gluon-dialog-mobile-radius, 0); } }
    @media (forced-colors: active) { :where(.gluon-dialog-surface-overlay) { background: Canvas; } :where(.gluon-dialog-surface) { border: 2px solid CanvasText; box-shadow: none; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-dialog-surface-overlay, .gluon-dialog-surface) { animation: none !important; transition: none !important; } }
  }
`;

export const dialogSurfaceStyleDependency = createComponentStyleDependency({
  id: 'gluon-molecule-dialog-surface',
  sheet: dialogSurfaceStyles,
  layer: 'molecule',
  order: 9,
  scope: 'gluon-component',
});
