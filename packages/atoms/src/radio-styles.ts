import { createComponentStyleDependency, css } from '@gluonjs/core';

export const radioStyles = css`
  @layer atoms {
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
    @media (forced-colors: active) { :where(.gluon-radio) { accent-color: AccentColor; } }
  }
`;

export const radioStyleDependency = createComponentStyleDependency({
  id: 'gluon-atom-radio',
  sheet: radioStyles,
  layer: 'atom',
  order: 7,
  scope: 'gluon-component',
});
