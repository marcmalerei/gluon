import { css, markLegacyComponentStyleSheet } from '@gluonjs/core';

/** @deprecated Components now adopt their exact stylesheet dependencies during rendering. */
export const moleculeStyles = css`
  @layer molecules {
    :where(.gluon-card) {
      background: var(--gluon-color-surface, white);
      border: 1px solid var(--gluon-color-rule, #d9e4e2);
      border-radius: var(--gluon-radius-surface, 1rem);
      color: var(--gluon-color-text, #12312f);
      overflow: clip;
    }

    :where(.gluon-card-header) {
      align-items: start;
      display: flex;
      gap: 1rem;
      justify-content: space-between;
      padding-block: 1rem 0;
      padding-inline: 1rem;
    }

    :where(.gluon-card-title, .gluon-card-subtitle) { margin: 0; }
    :where(.gluon-card-subtitle) { color: var(--gluon-color-muted, #526663); margin-block-start: 0.25rem; }
    :where(.gluon-card-body) { padding: 1rem; }
    :where(.gluon-card.is-success) { border-color: #34876e; }
    :where(.gluon-card.is-warning) { border-color: #a66c00; }
    :where(.gluon-card.is-danger) { border-color: var(--gluon-color-danger, #a52222); }

    :where(.gluon-button-group) { display: flex; min-inline-size: 0; align-items: stretch; gap: var(--gluon-button-group-gap, 0.75rem); }
    :where(.gluon-button-group.is-horizontal) { flex-direction: row; }
    :where(.gluon-button-group.is-horizontal.can-wrap) { flex-wrap: wrap; }
    :where(.gluon-button-group.is-vertical) { flex-direction: column; }
    :where(.gluon-button-group.is-attached) { gap: 0; }
    :where(.gluon-button-group.is-attached) > :where(button) { border-color: var(--gluon-button-group-border-color, currentcolor); border-radius: 0; }
    :where(.gluon-button-group.is-horizontal.is-attached) > :where(button + button) { margin-inline-start: -1px; }
    :where(.gluon-button-group.is-horizontal.is-attached) > :where(button:first-child) { border-start-start-radius: var(--gluon-button-group-radius, var(--gluon-radius-control, 0.625rem)); border-end-start-radius: var(--gluon-button-group-radius, var(--gluon-radius-control, 0.625rem)); }
    :where(.gluon-button-group.is-horizontal.is-attached) > :where(button:last-child) { border-start-end-radius: var(--gluon-button-group-radius, var(--gluon-radius-control, 0.625rem)); border-end-end-radius: var(--gluon-button-group-radius, var(--gluon-radius-control, 0.625rem)); }
    :where(.gluon-button-group.is-vertical.is-attached) > :where(button + button) { margin-block-start: -1px; }
    :where(.gluon-button-group.is-vertical.is-attached) > :where(button:first-child) { border-start-start-radius: var(--gluon-button-group-radius, var(--gluon-radius-control, 0.625rem)); border-start-end-radius: var(--gluon-button-group-radius, var(--gluon-radius-control, 0.625rem)); }
    :where(.gluon-button-group.is-vertical.is-attached) > :where(button:last-child) { border-end-start-radius: var(--gluon-button-group-radius, var(--gluon-radius-control, 0.625rem)); border-end-end-radius: var(--gluon-button-group-radius, var(--gluon-radius-control, 0.625rem)); }

    :where(.gluon-choice-group) { min-inline-size: 0; margin: 0; border: 0; padding: 0; }
    :where(.gluon-choice-group-legend) { padding: 0; font-size: 0.875rem; font-weight: 650; }
    :where(.gluon-choice-group-options) { display: flex; min-inline-size: 0; gap: var(--gluon-choice-group-gap, 0.75rem); margin-block-start: 0.5rem; }
    :where(.gluon-choice-group.is-vertical > .gluon-choice-group-options) { flex-direction: column; align-items: stretch; }
    :where(.gluon-choice-group.is-horizontal > .gluon-choice-group-options) { flex-flow: row wrap; align-items: center; }
    :where(.gluon-choice-group-helper, .gluon-choice-group-error) { display: block; margin-block-start: 0.5rem; color: var(--gluon-choice-group-helper-color, var(--gluon-color-muted, #51625f)); font-size: 0.8125rem; line-height: 1.4; overflow-wrap: anywhere; }
    :where(.gluon-choice-group-error) { color: var(--gluon-choice-group-error-color, var(--gluon-color-danger, #a52222)); font-weight: 650; }
    :where(.gluon-choice-group:disabled) { opacity: 0.6; }

    :where(.gluon-segmented-control) { display: inline-flex; min-inline-size: 0; align-items: stretch; gap: 0; }
    :where(.gluon-segmented-control.is-horizontal) { flex-direction: row; }
    :where(.gluon-segmented-control.is-vertical) { flex-direction: column; }
    :where(.gluon-segmented-control-option) { position: relative; flex: 1 1 auto; min-inline-size: 44px; border-color: var(--gluon-segmented-control-border-color, currentcolor); border-radius: 0; background: var(--gluon-segmented-control-background, transparent); }
    :where(.gluon-segmented-control.is-horizontal > .gluon-segmented-control-option + .gluon-segmented-control-option) { margin-inline-start: -1px; }
    :where(.gluon-segmented-control.is-horizontal > .gluon-segmented-control-option:first-child) { border-start-start-radius: var(--gluon-segmented-control-radius, var(--gluon-radius-control, 0.625rem)); border-end-start-radius: var(--gluon-segmented-control-radius, var(--gluon-radius-control, 0.625rem)); }
    :where(.gluon-segmented-control.is-horizontal > .gluon-segmented-control-option:last-child) { border-start-end-radius: var(--gluon-segmented-control-radius, var(--gluon-radius-control, 0.625rem)); border-end-end-radius: var(--gluon-segmented-control-radius, var(--gluon-radius-control, 0.625rem)); }
    :where(.gluon-segmented-control.is-vertical > .gluon-segmented-control-option + .gluon-segmented-control-option) { margin-block-start: -1px; }
    :where(.gluon-segmented-control.is-vertical > .gluon-segmented-control-option:first-child) { border-start-start-radius: var(--gluon-segmented-control-radius, var(--gluon-radius-control, 0.625rem)); border-start-end-radius: var(--gluon-segmented-control-radius, var(--gluon-radius-control, 0.625rem)); }
    :where(.gluon-segmented-control.is-vertical > .gluon-segmented-control-option:last-child) { border-end-start-radius: var(--gluon-segmented-control-radius, var(--gluon-radius-control, 0.625rem)); border-end-end-radius: var(--gluon-segmented-control-radius, var(--gluon-radius-control, 0.625rem)); }
    :where(.gluon-segmented-control-option[aria-pressed="true"]) { z-index: 1; background: var(--gluon-segmented-control-selected-background, var(--gluon-color-action-soft, #e6f4f1)); color: var(--gluon-segmented-control-selected-color, var(--gluon-color-action-soft-text, #075e5b)); }

    :where(.gluon-tabs) { min-inline-size: 0; }
    :where(.gluon-tabs-list) { display: flex; min-inline-size: 0; overflow: auto hidden; scrollbar-width: thin; border-block-end: 1px solid var(--gluon-tabs-border-color, var(--gluon-color-rule, #d9e4e2)); }
    :where(.gluon-tabs.is-horizontal > .gluon-tabs-list) { flex-direction: row; }
    :where(.gluon-tabs.is-vertical) { display: grid; grid-template-columns: minmax(10rem, auto) minmax(0, 1fr); align-items: start; }
    :where(.gluon-tabs.is-vertical > .gluon-tabs-list) { flex-direction: column; overflow: visible; border-block-end: 0; border-inline-end: 1px solid var(--gluon-tabs-border-color, var(--gluon-color-rule, #d9e4e2)); }
    :where(.gluon-tabs-tab) { appearance: none; min-block-size: 44px; flex: 0 0 auto; padding: 0.75rem 1rem; border: 0; border-block-end: 3px solid transparent; background: var(--gluon-tabs-background, transparent); color: var(--gluon-tabs-color, inherit); font: inherit; font-weight: 650; cursor: pointer; white-space: nowrap; }
    :where(.gluon-tabs-tab[aria-selected="true"]) { border-color: var(--gluon-tabs-selected-border-color, var(--gluon-color-action, #087f7b)); color: var(--gluon-tabs-selected-color, var(--gluon-color-action-soft-text, #075e5b)); }
    :where(.gluon-tabs.is-vertical .gluon-tabs-tab) { border-block-end: 0; border-inline-end: 3px solid transparent; text-align: start; }
    :where(.gluon-tabs.is-vertical .gluon-tabs-tab[aria-selected="true"]) { border-inline-end-color: var(--gluon-tabs-selected-border-color, var(--gluon-color-action, #087f7b)); }
    :where(.gluon-tabs-tab:disabled) { cursor: not-allowed; opacity: 0.55; }
    :where(.gluon-tabs-tab:focus-visible) { outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #173f91); outline-offset: -3px; }
    :where(.gluon-tabs-panel) { min-inline-size: 0; padding: var(--gluon-tabs-panel-padding, 1rem 0); }
    :where(.gluon-tabs-panel:focus-visible) { outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #173f91); outline-offset: 3px; }

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

    :where(.gluon-disclosure) { border-block: var(--gluon-disclosure-border, 1px solid var(--gluon-color-rule, #d9e4e2)); }
    :where(.gluon-disclosure + .gluon-disclosure) { border-block-start: 0; }
    :where(.gluon-disclosure-summary) { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: var(--gluon-disclosure-summary-gap, 0.5rem 1rem); min-block-size: 44px; padding: var(--gluon-disclosure-summary-padding, 0.875rem 0); color: var(--gluon-disclosure-summary-color, inherit); font-weight: var(--gluon-disclosure-summary-weight, 650); cursor: pointer; list-style: none; }
    :where(.gluon-disclosure-summary::-webkit-details-marker) { display: none; }
    :where(.gluon-disclosure-summary)::after { content: var(--gluon-disclosure-marker, "›"); grid-column: 2; grid-row: 1; color: var(--gluon-disclosure-marker-color, currentColor); font-size: var(--gluon-disclosure-marker-size, 1.25rem); transform: rotate(0deg); transform-origin: center; transition: transform var(--gluon-disclosure-motion-duration, 140ms) ease; }
    :where(.gluon-disclosure[open] > .gluon-disclosure-summary)::after { transform: rotate(90deg); }
    :where(.gluon-disclosure-summary:focus-visible) { outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #173f91); outline-offset: 3px; }
    :where(.gluon-disclosure-summary[aria-disabled="true"]) { cursor: not-allowed; opacity: 0.65; }
    :where(.gluon-disclosure-unavailable) { grid-column: 1; color: var(--gluon-disclosure-unavailable-color, var(--gluon-color-muted, #53605e)); font-size: 0.8125rem; font-weight: 400; }
    :where(.gluon-disclosure-content) { padding: var(--gluon-disclosure-content-padding, 0 0 1rem); }

    :where(.gluon-accordion) { display: grid; inline-size: 100%; min-inline-size: 0; }
    :where(.gluon-accordion-heading) { font: inherit; font-weight: inherit; }
    :where(.gluon-accordion .gluon-disclosure-content) { overflow-wrap: anywhere; }

    :where(.gluon-control-field) { display: grid; gap: 0.375rem; min-inline-size: 0; }
    :where(.gluon-control-field-label) { font-size: 0.875rem; font-weight: 650; }
    :where(.gluon-control-field-required) { color: var(--gluon-control-field-required-color, var(--gluon-color-danger, #a52222)); }
    :where(.gluon-control-field-helper) { color: var(--gluon-control-field-helper-color, var(--gluon-color-muted, #51625f)); font-size: 0.8125rem; line-height: 1.4; overflow-wrap: anywhere; }
    :where(.gluon-control-field-error) { color: var(--gluon-control-field-error-color, var(--gluon-color-danger, #a52222)); font-size: 0.8125rem; font-weight: 650; line-height: 1.4; overflow-wrap: anywhere; }

    :where(.gluon-form-field) {
      display: grid;
      gap: 0.375rem;
    }

    :where(.gluon-form-helper, .gluon-form-error) {
      color: var(--gluon-color-muted, #526663);
      font-size: 0.8125rem;
    }
    :where(.gluon-form-error) { color: var(--gluon-color-danger, #a52222); }
    @media (forced-colors: active) {
      :where(.gluon-button-group.is-attached) > :where(button) { border-color: ButtonText; }
      :where(.gluon-control-field-required, .gluon-control-field-error) { color: Mark; }
      :where(.gluon-control-field-helper) { color: CanvasText; }
      :where(.gluon-choice-group-error) { color: Mark; }
      :where(.gluon-choice-group-helper) { color: CanvasText; }
      :where(.gluon-segmented-control-option[aria-pressed="true"]) { border-color: Highlight; color: Highlight; }
      :where(.gluon-tabs-tab[aria-selected="true"]) { border-color: Highlight; color: Highlight; }
      :where(.gluon-dialog-surface-overlay) { background: Canvas; }
      :where(.gluon-dialog-surface) { border: 2px solid CanvasText; box-shadow: none; }
      :where(.gluon-disclosure) { border-color: CanvasText; }
      :where(.gluon-disclosure-summary[aria-disabled="true"]) { color: GrayText; opacity: 1; }
      :where(.gluon-accordion) { color: CanvasText; }
    }
    @media (max-width: 30rem) { :where(.gluon-dialog-surface-overlay) { padding: var(--gluon-dialog-mobile-overlay-padding, 0); } :where(.gluon-dialog-surface) { inline-size: 100%; max-block-size: 100dvh; border-radius: var(--gluon-dialog-mobile-radius, 0); } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-dialog-surface-overlay, .gluon-dialog-surface) { animation: none !important; transition: none !important; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-disclosure-summary)::after { transition: none; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-accordion) { scroll-behavior: auto; } }
  }
`;

markLegacyComponentStyleSheet(moleculeStyles, [
  'gluon-molecule-accordion',
  'gluon-molecule-button-group',
  'gluon-molecule-card',
  'gluon-molecule-choice-group',
  'gluon-molecule-control-field',
  'gluon-molecule-form-field',
  'gluon-molecule-segmented-control',
  'gluon-molecule-tabs',
  'gluon-molecule-dialog-surface',
  'gluon-molecule-disclosure',
]);
