import { createComponentStyleDependency, css } from '@gluonjs/core';

export const sheetStyles = css`
  @layer molecules {
    :where(.gluon-sheet-overlay) { position: fixed; inset: 0; z-index: var(--gluon-sheet-z-index, 120); display: grid; overflow: auto; background: var(--gluon-sheet-overlay-background, rgb(15 23 42 / 45%)); }
    :where(.gluon-sheet-overlay.is-inline-start) { place-items: stretch start; }
    :where(.gluon-sheet-overlay.is-inline-end) { place-items: stretch end; }
    :where(.gluon-sheet-overlay.is-block-start) { place-items: start stretch; }
    :where(.gluon-sheet-overlay.is-block-end) { place-items: end stretch; }
    :where(.gluon-sheet) { display: flex; flex-direction: column; inline-size: min(var(--gluon-sheet-inline-size, 28rem), 100%); block-size: 100%; max-block-size: 100dvh; overflow: hidden; border: var(--gluon-sheet-border, 1px solid var(--gluon-color-rule, #d9e4e2)); background: var(--gluon-sheet-background, var(--gluon-color-surface, #fff)); color: var(--gluon-sheet-color, var(--gluon-color-text, #12312f)); box-shadow: var(--gluon-sheet-shadow, 0 1.5rem 4rem rgb(15 23 42 / 24%)); }
    :where(.gluon-sheet.is-block-start, .gluon-sheet.is-block-end) { inline-size: 100%; block-size: min(var(--gluon-sheet-block-size, 28rem), 100%); max-block-size: 80dvh; }
    :where(.gluon-sheet-header) { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: var(--gluon-sheet-header-padding, 1rem 1.25rem); border-block-end: var(--gluon-sheet-section-border, 1px solid var(--gluon-color-rule, #d9e4e2)); }
    :where(.gluon-sheet-title) { margin: 0; font: inherit; font-size: var(--gluon-sheet-title-size, 1.25rem); font-weight: 700; }
    :where(.gluon-sheet-description) { margin: 0; padding: .75rem 1.25rem 0; color: var(--gluon-sheet-description-color, var(--gluon-color-muted, #53605e)); }
    :where(.gluon-sheet-content) { min-block-size: 0; overflow: auto; padding: var(--gluon-sheet-content-padding, 1.25rem); }
    :where(.gluon-sheet-footer) { padding: var(--gluon-sheet-footer-padding, 1rem 1.25rem); border-block-start: var(--gluon-sheet-section-border, 1px solid var(--gluon-color-rule, #d9e4e2)); }
    :where(.gluon-sheet:focus-visible) { outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #173f91); outline-offset: -3px; }
    @media (max-width: 30rem) { :where(.gluon-sheet) { inline-size: 100%; } :where(.gluon-sheet.is-block-start, .gluon-sheet.is-block-end) { block-size: min(var(--gluon-sheet-mobile-block-size, 85dvh), 100%); } }
    @media (forced-colors: active) { :where(.gluon-sheet-overlay) { background: Canvas; } :where(.gluon-sheet) { border: 2px solid CanvasText; box-shadow: none; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-sheet-overlay, .gluon-sheet) { transition: none !important; animation: none !important; } }
  }
`;

export const sheetStyleDependency = createComponentStyleDependency({
  id: 'gluon-molecule-sheet',
  sheet: sheetStyles,
  layer: 'molecule',
  order: 44,
  scope: 'gluon-component',
});
