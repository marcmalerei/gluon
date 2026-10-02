import { css } from '@gluonjs/core';

/** Shared opt-in utility rules for non-visual labels and keyboard focus. */
export const accessibilityStyles = css`
  @layer atoms {
    :where(.gluon-visually-hidden:not(:focus):not(:active):not(:focus-within)) {
      position: absolute !important;
      inline-size: 1px !important;
      block-size: 1px !important;
      overflow: hidden !important;
      clip: rect(0 0 0 0) !important;
      clip-path: inset(50%) !important;
      margin: -1px !important;
      padding: 0 !important;
      border: 0 !important;
      white-space: nowrap !important;
    }
    :where(.gluon-focus-ring:focus-visible) {
      outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #173f91);
      outline-offset: var(--gluon-focus-offset, 3px);
    }
    @media (forced-colors: active) {
      :where(.gluon-focus-ring:focus-visible) { outline-color: Highlight; }
    }
  }
`;
