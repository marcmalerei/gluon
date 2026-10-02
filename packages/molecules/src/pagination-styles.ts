import { createComponentStyleDependency, css } from '@gluonjs/core';

export const paginationStyles = css`
  @layer molecules {
    :where(.gluon-pagination) { color: var(--gluon-pagination-color, var(--gluon-color-text, #12312f)); }
    :where(.gluon-pagination-list) { align-items: center; display: flex; flex-wrap: wrap; gap: 0.35rem; list-style: none; margin: 0; padding: 0; }
    :where(.gluon-pagination-link) { align-items: center; border: 1px solid var(--gluon-pagination-border-color, var(--gluon-color-rule, #d9e4e2)); color: var(--gluon-pagination-link-color, var(--gluon-color-action, #087f7b)); display: inline-flex; justify-content: center; min-block-size: 2.75rem; min-inline-size: 2.75rem; padding: 0.35rem 0.65rem; text-decoration: none; }
    :where(a.gluon-pagination-link:hover, .gluon-pagination-link.is-current) { background: var(--gluon-pagination-current-background, var(--gluon-color-action, #087f7b)); border-color: var(--gluon-pagination-current-background, var(--gluon-color-action, #087f7b)); color: var(--gluon-pagination-current-color, white); }
    :where(.gluon-pagination-link:focus-visible) { outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #1b6ef3); outline-offset: var(--gluon-focus-offset, 3px); }
    :where(.gluon-pagination-link.is-disabled) { color: var(--gluon-pagination-disabled-color, var(--gluon-color-muted, #526663)); opacity: 0.55; }
    :where(.gluon-pagination-ellipsis) { min-inline-size: 1.5rem; text-align: center; }
    @media (forced-colors: active) { :where(.gluon-pagination-link) { border-color: ButtonText; color: LinkText; } :where(.gluon-pagination-link.is-current) { background: Highlight; color: HighlightText; } }
  }
`;

export const paginationStyleDependency = createComponentStyleDependency({ id: 'gluon-molecule-pagination', sheet: paginationStyles, layer: 'molecule', order: 25, scope: 'gluon-component' });
