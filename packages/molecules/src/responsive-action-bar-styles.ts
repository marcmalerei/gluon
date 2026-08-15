import { createComponentStyleDependency, css } from '@gluonjs/core';

export const responsiveActionBarStyles = css`
  @layer molecules {
    :where(.gluon-responsive-action-bar) {
      position: sticky;
      inset-block-end: 0;
      z-index: var(--gluon-responsive-action-bar-z-index, 10);
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: var(--gluon-responsive-action-bar-gap, 0.75rem 1rem);
      min-inline-size: 0;
      padding-block: var(--gluon-responsive-action-bar-padding-block, 0.75rem);
      padding-inline: max(var(--gluon-responsive-action-bar-padding-inline, 1rem), env(safe-area-inset-left));
      padding-inline-end: max(var(--gluon-responsive-action-bar-padding-inline, 1rem), env(safe-area-inset-right));
      padding-block-end: max(var(--gluon-responsive-action-bar-padding-block, 0.75rem), env(safe-area-inset-bottom));
      border-block-start: var(--gluon-responsive-action-bar-border, 1px solid var(--gluon-color-rule, #d9e4e2));
      background: var(--gluon-responsive-action-bar-background, Canvas);
      color: var(--gluon-responsive-action-bar-color, CanvasText);
      overflow-wrap: anywhere;
      scroll-margin-block-end: var(--gluon-responsive-action-bar-scroll-margin, 1rem);
    }
    :where(.gluon-responsive-action-bar.is-inline) { position: static; }
    :where(.gluon-responsive-action-bar-summary) { min-inline-size: 0; }
    :where(.gluon-responsive-action-bar-status) { min-inline-size: 0; color: var(--gluon-responsive-action-bar-status-color, inherit); }
    :where(.gluon-responsive-action-bar-status[role="alert"]) { color: var(--gluon-responsive-action-bar-error-color, #a52222); font-weight: 650; }
    :where(.gluon-responsive-action-bar-action) { display: flex; min-inline-size: 0; justify-content: end; }
    :where(.gluon-responsive-action-bar-action > *) { min-inline-size: min(12rem, 100%); min-block-size: 44px; }
    :where(.gluon-responsive-action-bar-compact) { display: none; min-block-size: 44px; }
    :where(.gluon-responsive-action-bar[data-state="loading"]) { cursor: wait; }
    :where(.gluon-responsive-action-bar[data-state="disabled"]) { cursor: not-allowed; }
    @media (min-width: 48rem) {
      :where(.gluon-responsive-action-bar) { position: static; grid-template-columns: minmax(0, 1fr) auto auto auto; }
      :where(.gluon-responsive-action-bar-compact) { display: flex; }
    }
    @media (max-height: 32rem) and (max-width: 47.99rem) {
      :where(.gluon-responsive-action-bar) { position: static; padding-block-start: 0.5rem; }
      :where(.gluon-responsive-action-bar-summary) { max-block-size: 3.5rem; overflow: auto; }
    }
    @media (forced-colors: active) {
      :where(.gluon-responsive-action-bar) { border-block-start: 2px solid CanvasText; background: Canvas; color: CanvasText; }
      :where(.gluon-responsive-action-bar-action > *) { forced-color-adjust: auto; }
    }
    @media (prefers-reduced-motion: reduce) {
      :where(.gluon-responsive-action-bar, .gluon-responsive-action-bar *) { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
    }
  }
`;

export const responsiveActionBarStyleDependency = createComponentStyleDependency({
  id: 'gluon-molecule-responsive-action-bar',
  sheet: responsiveActionBarStyles,
  layer: 'molecule',
  order: 15,
  scope: 'gluon-component',
});
