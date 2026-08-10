import { css, markLegacyComponentStyleSheet } from '@gluonjs/core';

/** @deprecated Components now adopt their exact stylesheet dependencies during rendering. */
export const moleculeStyles = css`
  @layer molecules {
    :where(.gluon-card) {
      background: var(--gluon-color-surface, white);
      border: 1px solid var(--gluon-color-rule, #d9e4e2);
      border-radius: var(--gluon-radius-surface, 1rem);
      color: var(--gluon-color-text, #12312f);
      overflow: clip;
    }

    :where(.gluon-card-header) {
      align-items: start;
      display: flex;
      gap: 1rem;
      justify-content: space-between;
      padding-block: 1rem 0;
      padding-inline: 1rem;
    }

    :where(.gluon-card-title, .gluon-card-subtitle) { margin: 0; }
    :where(.gluon-card-subtitle) { color: var(--gluon-color-muted, #526663); margin-block-start: 0.25rem; }
    :where(.gluon-card-body) { padding: 1rem; }
    :where(.gluon-card.is-success) { border-color: #34876e; }
    :where(.gluon-card.is-warning) { border-color: #a66c00; }
    :where(.gluon-card.is-danger) { border-color: var(--gluon-color-danger, #a52222); }

    :where(.gluon-choice-group) { min-inline-size: 0; margin: 0; border: 0; padding: 0; }
    :where(.gluon-choice-group-legend) { padding: 0; font-size: 0.875rem; font-weight: 650; }
    :where(.gluon-choice-group-options) { display: flex; min-inline-size: 0; gap: var(--gluon-choice-group-gap, 0.75rem); margin-block-start: 0.5rem; }
    :where(.gluon-choice-group.is-vertical > .gluon-choice-group-options) { flex-direction: column; align-items: stretch; }
    :where(.gluon-choice-group.is-horizontal > .gluon-choice-group-options) { flex-flow: row wrap; align-items: center; }
    :where(.gluon-choice-group-helper, .gluon-choice-group-error) { display: block; margin-block-start: 0.5rem; color: var(--gluon-choice-group-helper-color, var(--gluon-color-muted, #51625f)); font-size: 0.8125rem; line-height: 1.4; overflow-wrap: anywhere; }
    :where(.gluon-choice-group-error) { color: var(--gluon-choice-group-error-color, var(--gluon-color-danger, #a52222)); font-weight: 650; }
    :where(.gluon-choice-group:disabled) { opacity: 0.6; }

    :where(.gluon-control-field) { display: grid; gap: 0.375rem; min-inline-size: 0; }
    :where(.gluon-control-field-label) { font-size: 0.875rem; font-weight: 650; }
    :where(.gluon-control-field-required) { color: var(--gluon-control-field-required-color, var(--gluon-color-danger, #a52222)); }
    :where(.gluon-control-field-helper) { color: var(--gluon-control-field-helper-color, var(--gluon-color-muted, #51625f)); font-size: 0.8125rem; line-height: 1.4; overflow-wrap: anywhere; }
    :where(.gluon-control-field-error) { color: var(--gluon-control-field-error-color, var(--gluon-color-danger, #a52222)); font-size: 0.8125rem; font-weight: 650; line-height: 1.4; overflow-wrap: anywhere; }

    :where(.gluon-form-field) {
      display: grid;
      gap: 0.375rem;
    }

    :where(.gluon-form-helper, .gluon-form-error) {
      color: var(--gluon-color-muted, #526663);
      font-size: 0.8125rem;
    }
    :where(.gluon-form-error) { color: var(--gluon-color-danger, #a52222); }
    @media (forced-colors: active) {
      :where(.gluon-control-field-required, .gluon-control-field-error) { color: Mark; }
      :where(.gluon-control-field-helper) { color: CanvasText; }
      :where(.gluon-choice-group-error) { color: Mark; }
      :where(.gluon-choice-group-helper) { color: CanvasText; }
    }
  }
`;

markLegacyComponentStyleSheet(moleculeStyles, [
  'gluon-molecule-card',
  'gluon-molecule-choice-group',
  'gluon-molecule-control-field',
  'gluon-molecule-form-field',
]);
