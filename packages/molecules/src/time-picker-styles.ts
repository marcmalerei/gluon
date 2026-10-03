import { createComponentStyleDependency, css } from '@gluonjs/core';

export const timePickerStyles = css`
  @layer molecules {
    :where(.gluon-time-picker) { display: grid; gap: var(--gluon-time-picker-gap, .375rem); min-inline-size: var(--gluon-time-picker-min-inline-size, 12rem); color: var(--gluon-time-picker-color, var(--gluon-color-text, inherit)); }
    :where(.gluon-time-picker-label) { font-size: var(--gluon-time-picker-label-size, .875rem); font-weight: var(--gluon-time-picker-label-weight, 650); }
    :where(.gluon-time-picker .gluon-input) { inline-size: 100%; }
    :where(.gluon-time-picker-helper, .gluon-time-picker-error) { color: var(--gluon-time-picker-helper-color, var(--gluon-color-muted, #526663)); font-size: .8125rem; line-height: 1.4; overflow-wrap: anywhere; }
    :where(.gluon-time-picker-error) { color: var(--gluon-time-picker-error-color, var(--gluon-color-danger, #a52222)); font-weight: 650; }
    @media (max-width: 30rem) { :where(.gluon-time-picker) { min-inline-size: 0; inline-size: 100%; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-time-picker *) { scroll-behavior: auto; } }
    @media (forced-colors: active) { :where(.gluon-time-picker-label) { color: CanvasText; } :where(.gluon-time-picker-error) { color: Mark; } }
  }
`;

export const timePickerStyleDependency = createComponentStyleDependency({ id: 'gluon-molecule-time-picker', sheet: timePickerStyles, layer: 'molecule', order: 50, scope: 'gluon-component' });
