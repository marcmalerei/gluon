import { createComponentStyleDependency, css } from '@gluonjs/core';

export const buttonGroupStyles = css`
  @layer molecules {
    :where(.gluon-button-group) { display: flex; min-inline-size: 0; align-items: stretch; gap: var(--gluon-button-group-gap, 0.75rem); }
    :where(.gluon-button-group.is-horizontal) { flex-direction: row; }
    :where(.gluon-button-group.is-horizontal.can-wrap) { flex-wrap: wrap; }
    :where(.gluon-button-group.is-vertical) { flex-direction: column; }
    :where(.gluon-button-group.is-attached) { gap: 0; }
    :where(.gluon-button-group.is-attached) > :where(button) { border-color: var(--gluon-button-group-border-color, currentcolor); border-radius: 0; }
    :where(.gluon-button-group.is-horizontal.is-attached) > :where(button + button) { margin-inline-start: -1px; }
    :where(.gluon-button-group.is-horizontal.is-attached) > :where(button:first-child) { border-start-start-radius: var(--gluon-button-group-radius, var(--gluon-radius-control, 0.625rem)); border-end-start-radius: var(--gluon-button-group-radius, var(--gluon-radius-control, 0.625rem)); }
    :where(.gluon-button-group.is-horizontal.is-attached) > :where(button:last-child) { border-start-end-radius: var(--gluon-button-group-radius, var(--gluon-radius-control, 0.625rem)); border-end-end-radius: var(--gluon-button-group-radius, var(--gluon-radius-control, 0.625rem)); }
    :where(.gluon-button-group.is-vertical.is-attached) > :where(button + button) { margin-block-start: -1px; }
    :where(.gluon-button-group.is-vertical.is-attached) > :where(button:first-child) { border-start-start-radius: var(--gluon-button-group-radius, var(--gluon-radius-control, 0.625rem)); border-start-end-radius: var(--gluon-button-group-radius, var(--gluon-radius-control, 0.625rem)); }
    :where(.gluon-button-group.is-vertical.is-attached) > :where(button:last-child) { border-end-start-radius: var(--gluon-button-group-radius, var(--gluon-radius-control, 0.625rem)); border-end-end-radius: var(--gluon-button-group-radius, var(--gluon-radius-control, 0.625rem)); }
    @media (forced-colors: active) { :where(.gluon-button-group.is-attached) > :where(button) { border-color: ButtonText; } }
  }
`;

export const buttonGroupStyleDependency = createComponentStyleDependency({ id: 'gluon-molecule-button-group', sheet: buttonGroupStyles, layer: 'molecule', order: 6, scope: 'gluon-component' });
