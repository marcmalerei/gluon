import { createComponentStyleDependency, css } from '@gluonjs/core';

export const sliderStyles = css`
  @layer atoms {
    :where(.gluon-slider) { display: block; inline-size: min(100%, 24rem); min-block-size: 44px; accent-color: var(--gluon-slider-accent, var(--gluon-color-action, #087f7b)); cursor: pointer; }
    :where(.gluon-slider.is-vertical) { writing-mode: vertical-lr; direction: rtl; width: 44px; height: 12rem; }
    :where(.gluon-slider:disabled), :where(.gluon-slider[aria-readonly="true"]) { cursor: not-allowed; }
    :where(.gluon-slider:focus-visible) { outline: 3px solid var(--gluon-color-focus, #173f91); outline-offset: 3px; }
    @media (forced-colors: active) { :where(.gluon-slider) { accent-color: ButtonText; forced-color-adjust: auto; } }
  }
`;

export const sliderStyleDependency = createComponentStyleDependency({ id: 'gluon-atom-slider', sheet: sliderStyles, layer: 'atom', order: 10, scope: 'gluon-component' });
