import { createComponentStyleDependency, css } from '@gluonjs/core';

export const dateRangePickerStyles = css`
  @layer molecules {
    :where(.gluon-date-range-picker) { display: grid; gap: var(--gluon-date-range-picker-gap, .375rem); min-inline-size: var(--gluon-date-range-picker-min-inline-size, 20rem); color: var(--gluon-date-range-picker-color, var(--gluon-color-text, inherit)); }
    :where(.gluon-date-range-picker-label) { font-size: var(--gluon-date-range-picker-label-size, .875rem); font-weight: var(--gluon-date-range-picker-label-weight, 650); }
    :where(.gluon-date-range-picker-fields) { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--gluon-date-range-picker-field-gap, .5rem); }
    :where(.gluon-date-range-picker-field-label) { font-size: var(--gluon-date-range-picker-field-label-size, .8125rem); font-weight: var(--gluon-date-range-picker-field-label-weight, 600); }
    :where(.gluon-date-range-picker .gluon-input) { inline-size: 100%; }
    :where(.gluon-date-range-picker-helper, .gluon-date-range-picker-error) { color: var(--gluon-date-range-picker-helper-color, var(--gluon-color-muted, #526663)); font-size: .8125rem; line-height: 1.4; overflow-wrap: anywhere; }
    :where(.gluon-date-range-picker-error) { color: var(--gluon-date-range-picker-error-color, var(--gluon-color-danger, #a52222)); font-weight: 650; }
    @media (max-width: 30rem) { :where(.gluon-date-range-picker) { min-inline-size: 0; inline-size: 100%; } :where(.gluon-date-range-picker-fields) { grid-template-columns: 1fr; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-date-range-picker *) { scroll-behavior: auto; } }
    @media (forced-colors: active) { :where(.gluon-date-range-picker-label, .gluon-date-range-picker-field-label) { color: CanvasText; } :where(.gluon-date-range-picker-error) { color: Mark; } }
  }
`;

export const dateRangePickerStyleDependency = createComponentStyleDependency({ id: 'gluon-molecule-date-range-picker', sheet: dateRangePickerStyles, layer: 'molecule', order: 49, scope: 'gluon-component' });
