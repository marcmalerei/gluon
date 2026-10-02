import { createComponentStyleDependency, css } from '@gluonjs/core';

export const dataListStyles = css`
  @layer molecules {
    :where(.gluon-data-list) { display: grid; grid-template-columns: repeat(var(--gluon-data-list-columns, 2), minmax(0, 1fr)); gap: var(--gluon-data-list-gap, 1rem 1.5rem); margin: 0; }
    :where(.gluon-data-list.is-1-columns) { --gluon-data-list-columns: 1; }
    :where(.gluon-data-list.is-2-columns) { --gluon-data-list-columns: 2; }
    :where(.gluon-data-list.is-3-columns) { --gluon-data-list-columns: 3; }
    :where(.gluon-data-list.is-4-columns) { --gluon-data-list-columns: 4; }
    :where(.gluon-data-list-label) { color: var(--gluon-data-list-label-color, var(--gluon-color-muted, #526663)); font-size: .8125rem; font-weight: 650; }
    :where(.gluon-data-list-value) { min-inline-size: 0; margin: 0; color: var(--gluon-color-text, #12312f); overflow-wrap: anywhere; }
    :where(.gluon-data-list-description) { display: block; margin-block-start: .25rem; color: var(--gluon-data-list-description-color, var(--gluon-color-muted, #526663)); font-size: .8125rem; }
    @media (max-width: 40rem) { :where(.gluon-data-list) { grid-template-columns: 1fr; gap: .5rem; } :where(.gluon-data-list-value) { margin-block-end: .5rem; } }
    @media (forced-colors: active) { :where(.gluon-data-list-label) { color: CanvasText; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-data-list) { scroll-behavior: auto; } }
  }
`;

export const dataListStyleDependency = createComponentStyleDependency({ id: 'gluon-molecule-data-list', sheet: dataListStyles, layer: 'molecule', order: 45, scope: 'gluon-component' });
