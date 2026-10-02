import { createComponentStyleDependency, css } from '@gluonjs/core';

export const listboxFieldStyles = css`
  @layer molecules {
    :where(.gluon-listbox-field) { display: grid; gap: var(--gluon-listbox-field-gap, .375rem); min-inline-size: 0; }
    :where(.gluon-listbox-field-label) { font-weight: var(--gluon-listbox-field-label-weight, 650); overflow-wrap: anywhere; }
    :where(.gluon-listbox-field [role="listbox"]) { min-block-size: var(--gluon-listbox-field-control-size, 44px); border: 1px solid var(--gluon-listbox-field-border, var(--gluon-color-rule, #b8c9c6)); border-radius: var(--gluon-listbox-field-radius, var(--gluon-radius-control, .625rem)); background: var(--gluon-listbox-field-background, var(--gluon-color-surface, #fff)); color: inherit; }
    :where(.gluon-listbox-field [role="option"]) { min-block-size: 44px; padding: .625rem .75rem; }
    :where(.gluon-listbox-field [role="option"][aria-selected="true"]) { background: var(--gluon-listbox-field-selected-background, var(--gluon-color-action-soft, #e6f4f1)); color: var(--gluon-listbox-field-selected-color, var(--gluon-color-action-soft-text, #075e5b)); font-weight: 650; }
    :where(.gluon-listbox-field [role="listbox"][aria-invalid="true"]) { border-color: var(--gluon-listbox-field-error-color, var(--gluon-color-danger, #a52222)); }
    :where(.gluon-listbox-field-helper, .gluon-listbox-field-error) { color: var(--gluon-listbox-field-helper-color, var(--gluon-color-muted, #526663)); font-size: .8125rem; line-height: 1.4; overflow-wrap: anywhere; }
    :where(.gluon-listbox-field-error) { color: var(--gluon-listbox-field-error-color, var(--gluon-color-danger, #a52222)); font-weight: 650; }
    :where(.gluon-listbox-field [role="listbox"]:focus-visible) { outline: var(--gluon-focus-width, 3px solid Highlight); outline-offset: 2px; }
    @media (forced-colors: active) { :where(.gluon-listbox-field [role="listbox"], .gluon-listbox-field [role="option"][aria-selected="true"]) { border-color: ButtonText; background: Canvas; color: CanvasText; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-listbox-field, .gluon-listbox-field *) { animation: none !important; transition: none !important; } }
  }
`;

export const listboxFieldStyleDependency = createComponentStyleDependency({ id: 'gluon-molecule-listbox-field', sheet: listboxFieldStyles, layer: 'molecule', order: 43, scope: 'gluon-component' });
