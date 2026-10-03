import { createComponentStyleDependency, css } from '@gluonjs/core';

export const datePickerStyles = css`
  @layer molecules {
    :where(.gluon-date-picker) { display: grid; gap: var(--gluon-date-picker-gap, .375rem); min-inline-size: var(--gluon-date-picker-min-inline-size, 12rem); color: var(--gluon-date-picker-color, var(--gluon-color-text, inherit)); }
    :where(.gluon-date-picker-label) { font-size: var(--gluon-date-picker-label-size, .875rem); font-weight: var(--gluon-date-picker-label-weight, 650); }
    :where(.gluon-date-picker .gluon-input) { inline-size: 100%; }
    :where(.gluon-date-picker-helper, .gluon-date-picker-error) { color: var(--gluon-date-picker-helper-color, var(--gluon-color-muted, #526663)); font-size: .8125rem; line-height: 1.4; overflow-wrap: anywhere; }
    :where(.gluon-date-picker-error) { color: var(--gluon-date-picker-error-color, var(--gluon-color-danger, #a52222)); font-weight: 650; }
    @media (max-width: 30rem) { :where(.gluon-date-picker) { min-inline-size: 0; inline-size: 100%; } }
    @media (forced-colors: active) { :where(.gluon-date-picker-label) { color: CanvasText; } :where(.gluon-date-picker-error) { color: Mark; } }
  }
`;

export const datePickerStyleDependency = createComponentStyleDependency({ id: 'gluon-molecule-date-picker', sheet: datePickerStyles, layer: 'molecule', order: 47, scope: 'gluon-component' });
