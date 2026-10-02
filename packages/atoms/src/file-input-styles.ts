import { createComponentStyleDependency, css } from '@gluonjs/core';

export const fileInputStyles = css`
  @layer atoms {
    :where(.gluon-file-input) {
      min-block-size: 44px;
      max-inline-size: 100%;
      border: 1px solid var(--gluon-file-input-border-color, var(--gluon-color-rule, #b8c9c6));
      border-radius: var(--gluon-radius-control, 0.625rem);
      background: var(--gluon-file-input-background, var(--gluon-color-surface, white));
      color: var(--gluon-file-input-color, var(--gluon-color-text, inherit));
      font: inherit;
      padding: 0.35rem;
    }
    :where(.gluon-file-input[aria-invalid="true"]) { border-color: var(--gluon-color-danger, #a52222); }
    :where(.gluon-file-input):focus-visible {
      outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #173f91);
      outline-offset: var(--gluon-focus-offset, 3px);
    }
    :where(.gluon-file-input)::file-selector-button {
      min-block-size: 36px;
      margin-inline-end: 0.5rem;
      border: 1px solid var(--gluon-file-input-button-border, var(--gluon-color-action, #087f7b));
      border-radius: calc(var(--gluon-radius-control, 0.625rem) * 0.8);
      background: var(--gluon-file-input-button-background, var(--gluon-color-action, #087f7b));
      color: var(--gluon-file-input-button-color, var(--gluon-color-action-text, white));
      cursor: pointer;
      font: inherit;
      font-weight: 650;
      padding: 0.35rem 0.625rem;
    }
    :where(.gluon-file-input:disabled) { cursor: not-allowed; opacity: 0.55; }
    :where(.gluon-file-input:disabled)::file-selector-button { cursor: not-allowed; }
    @media (forced-colors: active) {
      :where(.gluon-file-input) { border-color: CanvasText; background: Canvas; color: CanvasText; }
      :where(.gluon-file-input)::file-selector-button { border-color: ButtonText; background: ButtonFace; color: ButtonText; }
    }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-file-input) { scroll-behavior: auto; } }
  }
`;

export const fileInputStyleDependency = createComponentStyleDependency({
  id: 'gluon-atom-file-input',
  sheet: fileInputStyles,
  layer: 'atom',
  order: 11,
  scope: 'gluon-component',
});
