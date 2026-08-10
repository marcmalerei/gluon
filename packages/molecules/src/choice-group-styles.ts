import { createComponentStyleDependency, css } from '@gluonjs/core';

export const choiceGroupStyles = css`
  @layer molecules {
    :where(.gluon-choice-group) { min-inline-size: 0; margin: 0; border: 0; padding: 0; }
    :where(.gluon-choice-group-legend) { padding: 0; font-size: 0.875rem; font-weight: 650; }
    :where(.gluon-choice-group-options) { display: flex; min-inline-size: 0; gap: var(--gluon-choice-group-gap, 0.75rem); margin-block-start: 0.5rem; }
    :where(.gluon-choice-group.is-vertical > .gluon-choice-group-options) { flex-direction: column; align-items: stretch; }
    :where(.gluon-choice-group.is-horizontal > .gluon-choice-group-options) { flex-flow: row wrap; align-items: center; }
    :where(.gluon-choice-group-helper, .gluon-choice-group-error) { display: block; margin-block-start: 0.5rem; color: var(--gluon-choice-group-helper-color, var(--gluon-color-muted, #51625f)); font-size: 0.8125rem; line-height: 1.4; overflow-wrap: anywhere; }
    :where(.gluon-choice-group-error) { color: var(--gluon-choice-group-error-color, var(--gluon-color-danger, #a52222)); font-weight: 650; }
    :where(.gluon-choice-group:disabled) { opacity: 0.6; }
    @media (forced-colors: active) {
      :where(.gluon-choice-group-error) { color: Mark; }
      :where(.gluon-choice-group-helper) { color: CanvasText; }
    }
  }
`;

export const choiceGroupStyleDependency = createComponentStyleDependency({ id: 'gluon-molecule-choice-group', sheet: choiceGroupStyles, layer: 'molecule', order: 5, scope: 'gluon-component' });
