import { createComponentStyleDependency, css } from '@gluonjs/core';

export const menuToolbarStyles = css`
  @layer molecules {
    :where(.gluon-menu, .gluon-context-menu, .gluon-menubar, .gluon-toolbar) {
      --gluon-menu-surface: var(--gluon-color-surface, #fff);
      --gluon-menu-color: var(--gluon-color-text, #111);
      --gluon-menu-border: var(--gluon-color-rule, #d9e4e2);
      --gluon-menu-active: var(--gluon-color-action-soft, #eef5f3);
      --gluon-menu-radius: var(--gluon-radius-control, .625rem);
      --gluon-menu-shadow: 0 .75rem 2rem rgb(0 0 0 / 15%);
      --gluon-menu-inline-size: 14rem;
      --gluon-menu-z-index: 30;
      min-inline-size: 0;
      color: var(--gluon-menu-color);
    }
    :where(.gluon-menu, .gluon-context-menu) { position: relative; display: inline-block; }
    :where(.gluon-menu-trigger, .gluon-menu-item, .gluon-toolbar-item) {
      min-block-size: 44px;
      min-inline-size: 44px;
      border: 0;
      border-radius: var(--gluon-menu-item-radius, .25rem);
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: start;
      text-decoration: none;
      overflow-wrap: anywhere;
      cursor: pointer;
    }
    :where(.gluon-menu-trigger) { padding: var(--gluon-menu-trigger-padding, .5rem .75rem); }
    :where(.gluon-menu-surface) {
      position: absolute;
      z-index: var(--gluon-menu-z-index);
      inset-block-start: 100%;
      inset-inline-start: 0;
      box-sizing: border-box;
      inline-size: min(var(--gluon-menu-inline-size), calc(100vw - 1rem));
      max-inline-size: calc(100vw - 1rem);
      max-block-size: min(24rem, calc(100dvh - 1rem));
      overflow: auto;
      margin: .25rem 0 0;
      padding: .25rem;
      border: 1px solid var(--gluon-menu-border);
      border-radius: var(--gluon-menu-radius);
      background: var(--gluon-menu-surface);
      box-shadow: var(--gluon-menu-shadow);
      list-style: none;
    }
    :where(.gluon-menu-surface[hidden]) { display: none; }
    :where(.gluon-menu-surface .gluon-menu-surface) { inset-block-start: 0; inset-inline-start: calc(100% - .25rem); margin: 0; }
    :where([dir="rtl"] .gluon-menu-surface .gluon-menu-surface) { inset-inline: auto calc(100% - .25rem); }
    :where(.gluon-context-menu > .gluon-menu-surface) { position: fixed; inset-block-start: var(--gluon-context-menu-y, 50%); inset-inline-start: var(--gluon-context-menu-x, 50%); }
    :where(.gluon-menu-entry) { position: relative; margin: 0; padding: 0; list-style: none; }
    :where(.gluon-menu-item) { display: flex; inline-size: 100%; align-items: center; gap: .5rem; padding: var(--gluon-menu-item-padding, .5rem .75rem); }
    :where(.gluon-menu-item.has-submenu)::after { content: '›'; margin-inline-start: auto; }
    :where([dir="rtl"] .gluon-menu-item.has-submenu)::after { content: '‹'; }
    :where(.gluon-menu-item:hover, .gluon-menu-item:focus-visible, .gluon-toolbar-item:focus-visible) { background: var(--gluon-menu-active); outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #173f91); outline-offset: -3px; }
    :where(.gluon-menu-item[aria-disabled="true"], .gluon-toolbar-item:disabled, .gluon-toolbar-item[aria-disabled="true"]) { cursor: not-allowed; opacity: .5; }
    :where(.gluon-menu-item[aria-checked="true"])::before { content: '✓'; flex: 0 0 1.25rem; inline-size: 1.25rem; }
    :where(.gluon-menu-item[role="menuitemradio"][aria-checked="true"])::before { content: '●'; }
    :where(.gluon-menu-separator, .gluon-toolbar-separator) { display: block; flex: 0 0 1px; block-size: 1px; margin: .25rem; background: var(--gluon-menu-border); }
    :where(.gluon-menubar) { display: flex; min-inline-size: 0; align-items: center; gap: var(--gluon-menubar-gap, .25rem); margin: 0; padding: 0; list-style: none; }
    :where(.gluon-menubar.is-vertical) { flex-direction: column; align-items: stretch; }
    :where(.gluon-menubar > .gluon-menu-entry) { position: relative; }
    :where(.gluon-menubar > .gluon-menu-entry > .gluon-menu-surface) { inset-block-start: 100%; inset-inline-start: 0; }
    :where(.gluon-toolbar) { display: inline-flex; max-inline-size: 100%; min-inline-size: 0; flex-wrap: wrap; align-items: center; gap: var(--gluon-toolbar-gap, .25rem); }
    :where(.gluon-toolbar.is-vertical) { flex-direction: column; align-items: stretch; }
    :where(.gluon-toolbar-item) { display: inline-flex; flex: 0 1 auto; align-items: center; justify-content: center; padding: var(--gluon-toolbar-item-padding, .5rem .75rem); }
    @media (max-width: 390px) {
      :where(.gluon-menu-surface) { max-inline-size: calc(100vw - .5rem); }
      :where(.gluon-toolbar, .gluon-menubar) { flex-wrap: wrap; }
    }
    @media (forced-colors: active) {
      :where(.gluon-menu-surface) { border-color: CanvasText; box-shadow: none; }
      :where(.gluon-menu-item:focus-visible, .gluon-toolbar-item:focus-visible) { background: Highlight; color: HighlightText; outline-color: Highlight; }
      :where(.gluon-menu-item[aria-checked="true"])::before { color: Highlight; }
    }
    @media (prefers-reduced-motion: reduce) {
      :where(.gluon-menu *, .gluon-context-menu *, .gluon-menubar *, .gluon-toolbar *) { scroll-behavior: auto; transition-duration: 0s !important; animation-duration: 0s !important; }
    }
  }
`;

export const menuToolbarStyleDependency = createComponentStyleDependency({
  id: 'gluon-molecule-menu-toolbar',
  sheet: menuToolbarStyles,
  layer: 'molecule',
  order: 8,
  scope: 'gluon-component',
});
