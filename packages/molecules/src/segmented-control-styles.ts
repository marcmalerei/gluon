import { createComponentStyleDependency, css } from '@gluonjs/core';

export const segmentedControlStyles = css`
  @layer molecules {
    :where(.gluon-segmented-control) { display: inline-flex; min-inline-size: 0; align-items: stretch; gap: 0; }
    :where(.gluon-segmented-control.is-horizontal) { flex-direction: row; }
    :where(.gluon-segmented-control.is-vertical) { flex-direction: column; }
    :where(.gluon-segmented-control-option) { position: relative; flex: 1 1 auto; min-inline-size: 44px; border-color: var(--gluon-segmented-control-border-color, currentcolor); border-radius: 0; background: var(--gluon-segmented-control-background, transparent); }
    :where(.gluon-segmented-control.is-horizontal > .gluon-segmented-control-option + .gluon-segmented-control-option) { margin-inline-start: -1px; }
    :where(.gluon-segmented-control.is-horizontal > .gluon-segmented-control-option:first-child) { border-start-start-radius: var(--gluon-segmented-control-radius, var(--gluon-radius-control, 0.625rem)); border-end-start-radius: var(--gluon-segmented-control-radius, var(--gluon-radius-control, 0.625rem)); }
    :where(.gluon-segmented-control.is-horizontal > .gluon-segmented-control-option:last-child) { border-start-end-radius: var(--gluon-segmented-control-radius, var(--gluon-radius-control, 0.625rem)); border-end-end-radius: var(--gluon-segmented-control-radius, var(--gluon-radius-control, 0.625rem)); }
    :where(.gluon-segmented-control.is-vertical > .gluon-segmented-control-option + .gluon-segmented-control-option) { margin-block-start: -1px; }
    :where(.gluon-segmented-control.is-vertical > .gluon-segmented-control-option:first-child) { border-start-start-radius: var(--gluon-segmented-control-radius, var(--gluon-radius-control, 0.625rem)); border-start-end-radius: var(--gluon-segmented-control-radius, var(--gluon-radius-control, 0.625rem)); }
    :where(.gluon-segmented-control.is-vertical > .gluon-segmented-control-option:last-child) { border-end-start-radius: var(--gluon-segmented-control-radius, var(--gluon-radius-control, 0.625rem)); border-end-end-radius: var(--gluon-segmented-control-radius, var(--gluon-radius-control, 0.625rem)); }
    :where(.gluon-segmented-control-option[aria-pressed="true"]) { z-index: 1; background: var(--gluon-segmented-control-selected-background, var(--gluon-color-action-soft, #e6f4f1)); color: var(--gluon-segmented-control-selected-color, var(--gluon-color-action-soft-text, #075e5b)); }
    @media (forced-colors: active) { :where(.gluon-segmented-control-option[aria-pressed="true"]) { border-color: Highlight; color: Highlight; } }
  }
`;

export const segmentedControlStyleDependency = createComponentStyleDependency({
  id: 'gluon-molecule-segmented-control',
  sheet: segmentedControlStyles,
  layer: 'molecule',
  order: 7,
  scope: 'gluon-component',
});
