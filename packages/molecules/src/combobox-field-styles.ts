import { createComponentStyleDependency, css } from '@gluonjs/core';

export const comboboxFieldStyles = css`
  @layer molecules {
    :where(.gluon-combobox-field) { display: grid; gap: var(--gluon-combobox-field-gap, .375rem); min-inline-size: 0; }
    :where(.gluon-combobox-field-label) { font-weight: var(--gluon-combobox-field-label-weight, 650); overflow-wrap: anywhere; }
    :where(.gluon-combobox-field-control) { position: relative; min-inline-size: 0; }
    :where(.gluon-combobox-field input[role="combobox"]) { inline-size: 100%; min-block-size: var(--gluon-combobox-field-control-size, 44px); }
    :where(.gluon-combobox-field-listbox) { position: absolute; inset: calc(100% + .25rem) 0 auto; z-index: 2; display: grid; max-block-size: var(--gluon-combobox-field-listbox-max-block-size, 16rem); gap: 2px; overflow: auto; margin: 0; padding: .25rem; border: 1px solid var(--gluon-combobox-field-border, var(--gluon-color-rule, #b8c9c6)); border-radius: var(--gluon-combobox-field-radius, var(--gluon-radius-control, .625rem)); background: var(--gluon-combobox-field-background, var(--gluon-color-surface, #fff)); color: inherit; box-shadow: var(--gluon-combobox-field-shadow, 0 8px 24px rgb(18 49 47 / 14%)); list-style: none; }
    :where(.gluon-combobox-field-option) { min-block-size: 44px; padding: .625rem .75rem; cursor: pointer; }
    :where(.gluon-combobox-field-option:hover, .gluon-combobox-field-option[aria-selected="true"]) { background: var(--gluon-combobox-field-option-selected-background, var(--gluon-color-action-soft, #e6f4f1)); color: var(--gluon-combobox-field-option-selected-color, var(--gluon-color-action-soft-text, #075e5b)); font-weight: 650; }
    :where(.gluon-combobox-field-option.is-disabled) { cursor: not-allowed; opacity: .55; }
    :where(.gluon-combobox-field-status) { padding: .625rem .75rem; color: var(--gluon-combobox-field-muted-color, var(--gluon-color-muted, #526663)); }
    :where(.gluon-combobox-field-error, .gluon-combobox-field-helper) { color: var(--gluon-combobox-field-helper-color, var(--gluon-color-muted, #526663)); font-size: .8125rem; line-height: 1.4; overflow-wrap: anywhere; }
    :where(.gluon-combobox-field-error) { color: var(--gluon-combobox-field-error-color, var(--gluon-color-danger, #a52222)); font-weight: 650; }
    :where(.gluon-combobox-field input[role="combobox"][aria-invalid="true"]) { border-color: var(--gluon-combobox-field-error-color, var(--gluon-color-danger, #a52222)); }
    :where(.gluon-combobox-field input[role="combobox"]:focus-visible, .gluon-combobox-field-option:focus-visible) { outline: var(--gluon-focus-width, 3px solid Highlight); outline-offset: 2px; }
    @media (forced-colors: active) { :where(.gluon-combobox-field-listbox) { border-color: ButtonText; background: Canvas; color: CanvasText; } :where(.gluon-combobox-field-option[aria-selected="true"]) { background: Highlight; color: HighlightText; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-combobox-field, .gluon-combobox-field *) { animation: none !important; transition: none !important; } }
  }
`;

export const comboboxFieldStyleDependency = createComponentStyleDependency({ id: 'gluon-molecule-combobox-field', sheet: comboboxFieldStyles, layer: 'molecule', order: 44, scope: 'gluon-component' });
