import { createComponentStyleDependency, css } from '@gluonjs/core';

export const oneTimePasswordFieldStyles = css`
  @layer molecules {
    :where(.gluon-one-time-password-field) { display: grid; gap: 0.5rem; min-inline-size: 0; margin: 0; border: 0; padding: 0; }
    :where(.gluon-one-time-password-field-legend) { padding: 0; font-size: 0.875rem; font-weight: 650; overflow-wrap: anywhere; }
    :where(.gluon-one-time-password-field-inputs) { display: flex; flex-wrap: wrap; gap: var(--gluon-one-time-password-field-gap, 0.5rem); min-inline-size: 0; }
    :where(.gluon-one-time-password-field-input) { box-sizing: border-box; flex: 1 1 2.75rem; inline-size: 2.75rem; min-inline-size: 2.75rem; max-inline-size: 4rem; min-block-size: var(--gluon-one-time-password-field-control-size, 44px); border: 1px solid var(--gluon-one-time-password-field-border, var(--gluon-color-rule, #a9b4b2)); border-radius: var(--gluon-one-time-password-field-radius, 0.35rem); background: var(--gluon-one-time-password-field-background, var(--gluon-color-surface, #fff)); color: var(--gluon-one-time-password-field-color, inherit); font: inherit; text-align: center; }
    :where(.gluon-one-time-password-field-input:focus-visible) { outline: var(--gluon-one-time-password-field-focus-outline, 3px solid var(--gluon-color-focus, #173f91)); outline-offset: 2px; }
    :where(.gluon-one-time-password-field-input:disabled) { cursor: not-allowed; opacity: 0.6; }
    :where(.gluon-one-time-password-field-input[aria-invalid="true"]) { border-color: var(--gluon-one-time-password-field-error-color, var(--gluon-color-danger, #a52222)); }
    :where(.gluon-one-time-password-field-helper, .gluon-one-time-password-field-error) { color: var(--gluon-one-time-password-field-helper-color, var(--gluon-color-muted, #51625f)); font-size: 0.8125rem; line-height: 1.4; overflow-wrap: anywhere; }
    :where(.gluon-one-time-password-field-error) { color: var(--gluon-one-time-password-field-error-color, var(--gluon-color-danger, #a52222)); font-weight: 650; }
    :where(.gluon-one-time-password-field-native-value) { position: absolute; inline-size: 1px; block-size: 1px; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    @media (max-width: 20rem) { :where(.gluon-one-time-password-field-inputs) { gap: 0.25rem; } :where(.gluon-one-time-password-field-input) { flex-basis: 2.25rem; min-inline-size: 2.25rem; } }
    @media (forced-colors: active) {
      :where(.gluon-one-time-password-field-input) { border-color: ButtonText; background: Canvas; color: CanvasText; }
      :where(.gluon-one-time-password-field-input[aria-invalid="true"]) { border-color: Mark; }
      :where(.gluon-one-time-password-field-helper) { color: CanvasText; }
      :where(.gluon-one-time-password-field-error) { color: Mark; }
    }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-one-time-password-field, .gluon-one-time-password-field *) { animation: none !important; transition: none !important; } }
  }
`;

export const oneTimePasswordFieldStyleDependency = createComponentStyleDependency({ id: 'gluon-molecule-one-time-password-field', sheet: oneTimePasswordFieldStyles, layer: 'molecule', order: 16, scope: 'gluon-component' });
