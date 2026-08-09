import { createComponentStyleDependency, css } from '@gluonjs/core';

export const checkboxStyles = css`
  @layer atoms {
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
    @media (forced-colors: active) { :where(.gluon-checkbox) { accent-color: AccentColor; } }
  }
`;

export const checkboxStyleDependency = createComponentStyleDependency({
  id: 'gluon-atom-checkbox',
  sheet: checkboxStyles,
  layer: 'atom',
  order: 6,
  scope: 'gluon-component',
});
