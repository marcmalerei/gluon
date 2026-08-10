import { createComponentStyleDependency, css } from '@gluonjs/core';

export const tabsStyles = css`
  @layer molecules {
    :where(.gluon-tabs) { min-inline-size: 0; }
    :where(.gluon-tabs-list) { display: flex; min-inline-size: 0; overflow: auto hidden; scrollbar-width: thin; border-block-end: 1px solid var(--gluon-tabs-border-color, var(--gluon-color-rule, #d9e4e2)); }
    :where(.gluon-tabs.is-horizontal > .gluon-tabs-list) { flex-direction: row; }
    :where(.gluon-tabs.is-vertical) { display: grid; grid-template-columns: minmax(10rem, auto) minmax(0, 1fr); align-items: start; }
    :where(.gluon-tabs.is-vertical > .gluon-tabs-list) { flex-direction: column; overflow: visible; border-block-end: 0; border-inline-end: 1px solid var(--gluon-tabs-border-color, var(--gluon-color-rule, #d9e4e2)); }
    :where(.gluon-tabs-tab) { appearance: none; min-block-size: 44px; flex: 0 0 auto; padding: 0.75rem 1rem; border: 0; border-block-end: 3px solid transparent; background: var(--gluon-tabs-background, transparent); color: var(--gluon-tabs-color, inherit); font: inherit; font-weight: 650; cursor: pointer; white-space: nowrap; }
    :where(.gluon-tabs-tab[aria-selected="true"]) { border-color: var(--gluon-tabs-selected-border-color, var(--gluon-color-action, #087f7b)); color: var(--gluon-tabs-selected-color, var(--gluon-color-action-soft-text, #075e5b)); }
    :where(.gluon-tabs.is-vertical .gluon-tabs-tab) { border-block-end: 0; border-inline-end: 3px solid transparent; text-align: start; }
    :where(.gluon-tabs.is-vertical .gluon-tabs-tab[aria-selected="true"]) { border-inline-end-color: var(--gluon-tabs-selected-border-color, var(--gluon-color-action, #087f7b)); }
    :where(.gluon-tabs-tab:disabled) { cursor: not-allowed; opacity: 0.55; }
    :where(.gluon-tabs-tab:focus-visible) { outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #173f91); outline-offset: -3px; }
    :where(.gluon-tabs-panel) { min-inline-size: 0; padding: var(--gluon-tabs-panel-padding, 1rem 0); }
    :where(.gluon-tabs-panel:focus-visible) { outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #173f91); outline-offset: 3px; }
    @media (forced-colors: active) { :where(.gluon-tabs-tab[aria-selected="true"]) { border-color: Highlight; color: Highlight; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-tabs-list) { scroll-behavior: auto; } }
  }
`;

export const tabsStyleDependency = createComponentStyleDependency({
  id: 'gluon-molecule-tabs',
  sheet: tabsStyles,
  layer: 'molecule',
  order: 8,
  scope: 'gluon-component',
});
