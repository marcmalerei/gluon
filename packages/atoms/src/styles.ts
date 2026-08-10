import { css, markLegacyComponentStyleSheet } from '@gluonjs/core';

/** @deprecated Components now adopt their exact stylesheet dependencies during rendering. */
export const atomStyles = css`
  @layer atoms {
    :where(.gluon-icon) {
      display: inline-block;
      flex: none;
      vertical-align: middle;
    }

    :where(.gluon-button) {
      appearance: none;
      min-block-size: 44px;
      block-size: 44px;
      border: 1px solid transparent;
      border-radius: var(--gluon-radius-control, 0.625rem);
      cursor: pointer;
      font: inherit;
      font-weight: 650;
      line-height: 1;
      padding: var(--gluon-space-control-block, 0.75rem) var(--gluon-space-control-inline, 1rem);
    }

    :where(.gluon-button.is-primary) {
      background: var(--gluon-button-background, var(--gluon-color-action, #087f7b));
      border-color: var(--gluon-button-border-color, transparent);
      color: var(--gluon-button-color, var(--gluon-color-action-text, white));
    }

    :where(.gluon-button.is-secondary) {
      background: var(--gluon-button-background, var(--gluon-color-action-soft, #e6f4f1));
      border-color: var(--gluon-button-border-color, transparent);
      color: var(--gluon-button-color, var(--gluon-color-action-soft-text, #075e5b));
    }

    :where(.gluon-button.is-ghost) {
      background: var(--gluon-button-background, transparent);
      border-color: var(--gluon-button-border-color, currentcolor);
      color: var(--gluon-button-color, inherit);
    }

    :where(.gluon-button.is-small) { padding-block: 0.5rem; padding-inline: 0.75rem; }
    :where(.gluon-button.is-large) { padding-block: 0.875rem; padding-inline: 1.25rem; }
    :where(.gluon-button:disabled) { cursor: not-allowed; opacity: 0.55; }

    :where(.gluon-checkbox) {
      inline-size: 1.25rem;
      block-size: 1.25rem;
      flex: none;
      margin: 0;
      accent-color: var(--gluon-checkbox-accent, var(--gluon-color-action, #087f7b));
      cursor: pointer;
    }
    :where(.gluon-checkbox[aria-invalid="true"]) { outline: 1px solid var(--gluon-color-danger, #a52222); outline-offset: 2px; }
    :where(.gluon-checkbox:disabled) { cursor: not-allowed; opacity: 0.55; }
    :where(.gluon-checkbox):focus-visible { outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #173f91); outline-offset: 3px; }

    :where(.gluon-radio) {
      inline-size: 1.25rem;
      block-size: 1.25rem;
      flex: none;
      margin: 0;
      accent-color: var(--gluon-radio-accent, var(--gluon-color-action, #087f7b));
      cursor: pointer;
    }
    :where(.gluon-radio[aria-invalid="true"]) { outline: 1px solid var(--gluon-color-danger, #a52222); outline-offset: 2px; }
    :where(.gluon-radio:disabled) { cursor: not-allowed; opacity: 0.55; }
    :where(.gluon-radio):focus-visible { outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #173f91); outline-offset: 3px; }

    :where(.gluon-switch) {
      appearance: none;
      box-sizing: border-box;
      position: relative;
      inline-size: 2.75rem;
      block-size: 1.5rem;
      flex: none;
      margin: 0;
      border: 1px solid var(--gluon-switch-border-color, var(--gluon-color-rule, #b8c9c6));
      border-radius: 999px;
      background: var(--gluon-switch-track, var(--gluon-color-canvas, #e5e9e8));
      cursor: pointer;
      transition: background-color 140ms ease, border-color 140ms ease;
    }
    :where(.gluon-switch)::before {
      content: '';
      position: absolute;
      inset-block-start: 2px;
      inset-inline-start: 2px;
      inline-size: 1.125rem;
      block-size: 1.125rem;
      border-radius: 50%;
      background: var(--gluon-switch-thumb, var(--gluon-color-surface, white));
      box-shadow: 0 1px 2px rgb(0 0 0 / 24%);
      transition: transform 140ms ease;
    }
    :where(.gluon-switch:checked) { border-color: var(--gluon-switch-on, var(--gluon-color-action, #087f7b)); background: var(--gluon-switch-on, var(--gluon-color-action, #087f7b)); }
    :where(.gluon-switch:checked)::before { transform: translateX(1.25rem); }
    :where(.gluon-switch:dir(rtl):checked)::before { transform: translateX(-1.25rem); }
    :where(.gluon-switch:disabled) { cursor: not-allowed; opacity: 0.55; }
    :where(.gluon-switch):focus-visible { outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #173f91); outline-offset: 3px; }

    :where(.gluon-toggle-button[aria-pressed="true"]) {
      background: var(--gluon-toggle-button-pressed-background, var(--gluon-color-action-soft, #e6f4f1));
      border-color: var(--gluon-toggle-button-pressed-border-color, var(--gluon-color-action, #087f7b));
      color: var(--gluon-toggle-button-pressed-color, var(--gluon-color-action-soft-text, #075e5b));
      box-shadow: inset 0 0 0 1px var(--gluon-toggle-button-pressed-border-color, var(--gluon-color-action, #087f7b));
    }

    :where(.gluon-button, .gluon-input, .gluon-select, .gluon-textarea):focus-visible {
      outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #173f91);
      outline-offset: 3px;
    }

    :where(.gluon-input) {
      min-block-size: 44px;
      background: var(--gluon-color-surface, white);
      border: 1px solid var(--gluon-color-rule, #b8c9c6);
      border-radius: calc(var(--gluon-radius-control, 0.625rem) * 0.8);
      color: var(--gluon-color-text, inherit);
      font: inherit;
      padding-block: 0.675rem;
      padding-inline: 0.75rem;
    }

    :where(.gluon-input[aria-invalid="true"]) {
      border-color: var(--gluon-color-danger, #a52222);
    }

    :where(.gluon-label) {
      font-size: 0.875rem;
      font-weight: 650;
    }

    :where(.gluon-progress) {
      appearance: none;
      display: block;
      inline-size: var(--gluon-progress-width, 12rem);
      max-inline-size: 100%;
      block-size: var(--gluon-progress-height, 0.625rem);
      overflow: hidden;
      border: 1px solid var(--gluon-progress-track-border, var(--gluon-color-rule, #b8c9c6));
      border-radius: 999px;
      background: var(--gluon-progress-track, var(--gluon-color-canvas, #e5e9e8));
      accent-color: var(--gluon-progress-value, var(--gluon-color-action, #087f7b));
    }
    :where(.gluon-progress.is-full-width) { inline-size: 100%; }
    .gluon-progress::-webkit-progress-bar { background: var(--gluon-progress-track, var(--gluon-color-canvas, #e5e9e8)); }
    .gluon-progress::-webkit-progress-value { background: var(--gluon-progress-value, var(--gluon-color-action, #087f7b)); }
    .gluon-progress:indeterminate::-webkit-progress-bar { background: linear-gradient(90deg, var(--gluon-progress-track, #e5e9e8) 0 30%, var(--gluon-progress-value, #087f7b) 30% 60%, var(--gluon-progress-track, #e5e9e8) 60% 100%); background-size: 200% 100%; }
    .gluon-progress::-moz-progress-bar { background: var(--gluon-progress-value, var(--gluon-color-action, #087f7b)); }
    :where(.gluon-progress:indeterminate) { background: linear-gradient(90deg, var(--gluon-progress-track, #e5e9e8) 0 30%, var(--gluon-progress-value, #087f7b) 30% 60%, var(--gluon-progress-track, #e5e9e8) 60% 100%); background-size: 200% 100%; animation: gluon-progress-indeterminate 1.2s linear infinite; }
    @keyframes gluon-progress-indeterminate { to { background-position: -200% 0; } }

    :where(.gluon-select) {
      min-block-size: 44px;
      max-inline-size: 100%;
      background: var(--gluon-select-background, var(--gluon-color-surface, white));
      border: 1px solid var(--gluon-select-border-color, var(--gluon-color-rule, #b8c9c6));
      border-radius: calc(var(--gluon-radius-control, 0.625rem) * 0.8);
      color: var(--gluon-select-color, var(--gluon-color-text, inherit));
      cursor: pointer;
      font: inherit;
      line-height: 1.25;
      padding-block: 0.625rem;
      padding-inline: 0.75rem 2rem;
    }
    :where(.gluon-select.is-small) { padding-block: 0.5rem; padding-inline-start: 0.625rem; }
    :where(.gluon-select.is-large) { min-block-size: 52px; block-size: 52px; padding-block: 0.875rem; padding-inline-start: 1rem; }
    :where(.gluon-select.is-full-width) { inline-size: 100%; }
    :where(.gluon-select[aria-invalid="true"]) { border-color: var(--gluon-color-danger, #a52222); }
    :where(.gluon-select:disabled) { cursor: not-allowed; opacity: 0.55; }

    :where(.gluon-textarea) {
      box-sizing: border-box;
      min-block-size: 96px;
      max-inline-size: 100%;
      background: var(--gluon-textarea-background, var(--gluon-color-surface, white));
      border: 1px solid var(--gluon-textarea-border-color, var(--gluon-color-rule, #b8c9c6));
      border-radius: calc(var(--gluon-radius-control, 0.625rem) * 0.8);
      color: var(--gluon-textarea-color, var(--gluon-color-text, inherit));
      font: inherit;
      line-height: 1.5;
      padding: 0.675rem 0.75rem;
      resize: var(--gluon-textarea-resize, vertical);
    }
    :where(.gluon-textarea.is-full-width) { inline-size: 100%; }
    :where(.gluon-textarea[aria-invalid="true"]) { border-color: var(--gluon-color-danger, #a52222); }
    :where(.gluon-textarea:disabled) { cursor: not-allowed; opacity: 0.55; }
    :where(.gluon-textarea:read-only) { background: var(--gluon-textarea-readonly-background, var(--gluon-color-canvas, #f5f7f7)); }

    @media (prefers-reduced-motion: reduce) {
      :where(.gluon-button, .gluon-input, .gluon-select, .gluon-textarea) { scroll-behavior: auto; }
      :where(.gluon-switch, .gluon-switch::before) { transition: none; }
      :where(.gluon-progress) { animation: none; background-position: 50% 0; }
    }
    @media (forced-colors: active) { :where(.gluon-checkbox, .gluon-radio) { accent-color: AccentColor; } }
    @media (forced-colors: active) { :where(.gluon-switch) { appearance: auto; accent-color: AccentColor; } :where(.gluon-switch)::before { content: none; } }
    @media (forced-colors: active) { :where(.gluon-toggle-button[aria-pressed="true"]) { border-color: Highlight; color: Highlight; box-shadow: inset 0 0 0 1px Highlight; } }
    @media (forced-colors: active) { :where(.gluon-progress) { appearance: auto; forced-color-adjust: auto; } }
  }
`;

markLegacyComponentStyleSheet(atomStyles, [
  'gluon-atom-button',
  'gluon-atom-checkbox',
  'gluon-atom-icon',
  'gluon-atom-input',
  'gluon-atom-label',
  'gluon-atom-progress',
  'gluon-atom-radio',
  'gluon-atom-select',
  'gluon-atom-switch',
  'gluon-atom-textarea',
  'gluon-atom-toggle-button',
]);
