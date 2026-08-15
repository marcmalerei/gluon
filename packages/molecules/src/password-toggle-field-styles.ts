import { createComponentStyleDependency, css } from '@gluonjs/core';

export const passwordToggleFieldStyles = css`
  @layer molecules {
    :where(.gluon-password-toggle-field) { display: grid; gap: 0.375rem; min-inline-size: 0; }
    :where(.gluon-password-toggle-field-label) { font-size: 0.875rem; font-weight: 650; }
    :where(.gluon-password-toggle-field-controls) { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0.5rem; align-items: stretch; min-inline-size: 0; }
    :where(.gluon-password-toggle-field-controls > input, .gluon-password-toggle-field-controls > button) { min-block-size: 44px; min-inline-size: 0; }
    :where(.gluon-password-toggle-field-controls > button) { white-space: normal; }
    :where(.gluon-password-toggle-field-helper, .gluon-password-toggle-field-error) { font-size: 0.8125rem; line-height: 1.4; overflow-wrap: anywhere; }
    :where(.gluon-password-toggle-field-helper) { color: var(--gluon-password-toggle-field-helper-color, var(--gluon-color-muted, #51625f)); }
    :where(.gluon-password-toggle-field-error) { color: var(--gluon-password-toggle-field-error-color, var(--gluon-color-danger, #a52222)); font-weight: 650; }
    :where(.gluon-password-toggle-field-controls > input:focus-visible, .gluon-password-toggle-field-controls > button:focus-visible) { outline: var(--gluon-password-toggle-field-focus-outline, 3px solid var(--gluon-color-focus, #173f91)); outline-offset: 3px; }
    @media (max-width: 24rem) {
      :where(.gluon-password-toggle-field-controls) { grid-template-columns: 1fr; }
      :where(.gluon-password-toggle-field-controls > button) { inline-size: 100%; }
    }
    @media (forced-colors: active) {
      :where(.gluon-password-toggle-field) { color: CanvasText; }
      :where(.gluon-password-toggle-field-error) { color: Mark; }
      :where(.gluon-password-toggle-field-controls > button) { border: 2px solid ButtonText; background: ButtonFace; color: ButtonText; }
    }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-password-toggle-field, .gluon-password-toggle-field *) { animation: none !important; transition: none !important; } }
  }
`;

export const passwordToggleFieldStyleDependency = createComponentStyleDependency({ id: 'gluon-molecule-password-toggle-field', sheet: passwordToggleFieldStyles, layer: 'molecule', order: 17, scope: 'gluon-component' });
