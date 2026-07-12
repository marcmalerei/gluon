import { createComponentStyleDependency, css } from '@gluonjs/core';

export const formFieldStyles = css`
  @layer molecules {
    :where(.gluon-form-field) { display: grid; gap: 0.375rem; }
    :where(.gluon-form-helper, .gluon-form-error) { color: var(--gluon-color-muted, #526663); font-size: 0.8125rem; }
    :where(.gluon-form-error) { color: var(--gluon-color-danger, #a52222); }
  }
`;

export const formFieldStyleDependency = createComponentStyleDependency({ id: 'gluon-molecule-form-field', sheet: formFieldStyles, layer: 'molecule', order: 1, scope: 'gluon-component' });
