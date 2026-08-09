import { createComponentStyleDependency, css } from '@gluonjs/core';

export const toggleButtonStyles = css`
  @layer atoms {
    :where(.gluon-toggle-button[aria-pressed="true"]) {
      background: var(--gluon-toggle-button-pressed-background, var(--gluon-color-action-soft, #e6f4f1));
      border-color: var(--gluon-toggle-button-pressed-border-color, var(--gluon-color-action, #087f7b));
      color: var(--gluon-toggle-button-pressed-color, var(--gluon-color-action-soft-text, #075e5b));
      box-shadow: inset 0 0 0 1px var(--gluon-toggle-button-pressed-border-color, var(--gluon-color-action, #087f7b));
    }
    @media (forced-colors: active) {
      :where(.gluon-toggle-button[aria-pressed="true"]) { border-color: Highlight; color: Highlight; box-shadow: inset 0 0 0 1px Highlight; }
    }
  }
`;

export const toggleButtonStyleDependency = createComponentStyleDependency({
  id: 'gluon-atom-toggle-button',
  sheet: toggleButtonStyles,
  layer: 'atom',
  order: 9,
  scope: 'gluon-component',
});
