import { createComponentStyleDependency, css } from '@gluonjs/core';

export const multiSelectFieldStyles = css`
  @layer molecules {
    :where(.gluon-multi-select-field) { display: grid; gap: var(--gluon-multi-select-field-gap, .375rem); min-inline-size: var(--gluon-multi-select-field-min-inline-size, 15rem); color: var(--gluon-multi-select-field-color, var(--gluon-color-text, inherit)); }
    :where(.gluon-multi-select-field-label) { font-size: var(--gluon-multi-select-field-label-size, .875rem); font-weight: var(--gluon-multi-select-field-label-weight, 650); }
    :where(.gluon-multi-select-field-select) { inline-size: 100%; min-block-size: 7rem; padding: var(--gluon-multi-select-field-padding, .5rem); border: 1px solid var(--gluon-multi-select-field-border, var(--gluon-color-rule, #b8c9c6)); border-radius: var(--gluon-multi-select-field-radius, var(--gluon-radius-control, .625rem)); background: var(--gluon-multi-select-field-background, var(--gluon-color-surface, #fff)); color: inherit; font: inherit; }
    :where(.gluon-multi-select-field-select:focus-visible) { outline: var(--gluon-focus-width, 3px solid Highlight); outline-offset: var(--gluon-focus-offset, 2px); }
    :where(.gluon-multi-select-field-select option:checked) { background: var(--gluon-multi-select-field-selected-background, var(--gluon-color-action-soft, #e6f4f1)); color: var(--gluon-multi-select-field-selected-color, var(--gluon-color-action-soft-text, #075e5b)); }
    :where(.gluon-multi-select-field-helper, .gluon-multi-select-field-error) { color: var(--gluon-multi-select-field-helper-color, var(--gluon-color-muted, #526663)); font-size: .8125rem; line-height: 1.4; overflow-wrap: anywhere; }
    :where(.gluon-multi-select-field-error) { color: var(--gluon-multi-select-field-error-color, var(--gluon-color-danger, #a52222)); font-weight: 650; }
    @media (max-width: 30rem) { :where(.gluon-multi-select-field) { min-inline-size: 0; inline-size: 100%; } }
    @media (forced-colors: active) { :where(.gluon-multi-select-field-label) { color: CanvasText; } :where(.gluon-multi-select-field-error) { color: Mark; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-multi-select-field *) { scroll-behavior: auto; } }
  }
`;

export const multiSelectFieldStyleDependency = createComponentStyleDependency({ id: 'gluon-molecule-multi-select-field', sheet: multiSelectFieldStyles, layer: 'molecule', order: 51, scope: 'gluon-component' });
