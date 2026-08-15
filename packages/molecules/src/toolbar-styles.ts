import { createComponentStyleDependency, css } from '@gluonjs/core';

export const toolbarStyles = css`
  @layer molecules {
    :where(.gluon-toolbar) { --gluon-toolbar-gap: .25rem; display: inline-flex; max-inline-size: 100%; min-inline-size: 0; flex-wrap: wrap; align-items: center; gap: var(--gluon-toolbar-gap); }
    :where(.gluon-toolbar.is-vertical) { flex-direction: column; align-items: stretch; }
    :where(.gluon-toolbar-item) { display: inline-flex; min-block-size: 44px; min-inline-size: 44px; flex: 0 1 auto; align-items: center; justify-content: center; padding: var(--gluon-toolbar-item-padding, .5rem .75rem); border: 0; border-radius: var(--gluon-toolbar-item-radius, .25rem); background: var(--gluon-toolbar-item-background, transparent); color: inherit; font: inherit; text-decoration: none; overflow-wrap: anywhere; cursor: pointer; }
    :where(.gluon-toolbar-item:focus-visible) { background: var(--gluon-toolbar-item-active, var(--gluon-color-action-soft, #eef5f3)); outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #173f91); outline-offset: -3px; }
    :where(.gluon-toolbar-item:disabled, .gluon-toolbar-item[aria-disabled="true"]) { cursor: not-allowed; opacity: .5; }
    :where(.gluon-toolbar-separator) { display: block; flex: 0 0 1px; block-size: 1px; margin: .25rem; background: var(--gluon-toolbar-separator-color, var(--gluon-color-rule, #d9e4e2)); }
    @media (forced-colors: active) { :where(.gluon-toolbar-item:focus-visible) { background: Highlight; color: HighlightText; outline-color: Highlight; } }
    @media (prefers-reduced-motion: reduce) { :where(.gluon-toolbar *) { scroll-behavior: auto; transition-duration: 0s !important; animation-duration: 0s !important; } }
  }
`;

export const toolbarStyleDependency = createComponentStyleDependency({ id: 'gluon-molecule-toolbar', sheet: toolbarStyles, layer: 'molecule', order: 9, scope: 'gluon-component' });
