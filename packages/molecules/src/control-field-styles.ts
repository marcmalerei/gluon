import { createComponentStyleDependency, css } from '@gluonjs/core';

export const controlFieldStyles = css`
  @layer molecules {
    :where(.gluon-control-field) { display: grid; gap: 0.375rem; min-inline-size: 0; }
    :where(.gluon-control-field-label) { font-size: 0.875rem; font-weight: 650; }
    :where(.gluon-control-field-required) { color: var(--gluon-control-field-required-color, var(--gluon-color-danger, #a52222)); }
    :where(.gluon-control-field-helper) { color: var(--gluon-control-field-helper-color, var(--gluon-color-muted, #51625f)); font-size: 0.8125rem; line-height: 1.4; overflow-wrap: anywhere; }
    :where(.gluon-control-field-error) { color: var(--gluon-control-field-error-color, var(--gluon-color-danger, #a52222)); font-size: 0.8125rem; font-weight: 650; line-height: 1.4; overflow-wrap: anywhere; }
    @media (forced-colors: active) {
      :where(.gluon-control-field-required, .gluon-control-field-error) { color: Mark; }
      :where(.gluon-control-field-helper) { color: CanvasText; }
    }
  }
`;

export const controlFieldStyleDependency = createComponentStyleDependency({ id: 'gluon-molecule-control-field', sheet: controlFieldStyles, layer: 'molecule', order: 4, scope: 'gluon-component' });
