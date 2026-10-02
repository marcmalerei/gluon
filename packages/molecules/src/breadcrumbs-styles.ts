import { createComponentStyleDependency, css } from '@gluonjs/core';

export const breadcrumbsStyles = css`
  @layer molecules {
    :where(.gluon-breadcrumbs) { color: var(--gluon-breadcrumbs-color, var(--gluon-color-muted, #526663)); min-inline-size: 0; }
    :where(.gluon-breadcrumbs-list) { align-items: center; display: flex; flex-wrap: wrap; gap: 0.5rem; list-style: none; margin: 0; padding: 0; }
    :where(.gluon-breadcrumbs-item) { align-items: center; display: inline-flex; min-block-size: 2.75rem; min-inline-size: 0; }
    :where(.gluon-breadcrumbs-item:not(:last-child))::after { color: var(--gluon-breadcrumbs-separator-color, var(--gluon-color-muted, #526663)); content: var(--gluon-breadcrumbs-separator, '/'); margin-inline-start: 0.5rem; }
    :where(.gluon-breadcrumbs-link) { color: var(--gluon-breadcrumbs-link-color, var(--gluon-color-action, #087f7b)); text-underline-offset: 0.2em; }
    :where(.gluon-breadcrumbs-current) { color: var(--gluon-breadcrumbs-current-color, var(--gluon-color-text, #12312f)); font-weight: 650; }
    :where(.gluon-breadcrumbs-link:focus-visible, .gluon-breadcrumbs-current:focus-visible) { outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #1b6ef3); outline-offset: var(--gluon-focus-offset, 3px); }
    @media (forced-colors: active) { :where(.gluon-breadcrumbs-link) { color: LinkText; } :where(.gluon-breadcrumbs-current) { color: CanvasText; } }
  }
`;

export const breadcrumbsStyleDependency = createComponentStyleDependency({ id: 'gluon-molecule-breadcrumbs', sheet: breadcrumbsStyles, layer: 'molecule', order: 24, scope: 'gluon-component' });
