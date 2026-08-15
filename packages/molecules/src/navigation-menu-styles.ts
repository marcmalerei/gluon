import { createComponentStyleDependency, css } from '@gluonjs/core';

export const navigationMenuStyles = css`
  @layer molecules {
    :where(.gluon-navigation-menu) {
      min-inline-size: 0;
    }

    :where(.gluon-navigation-menu-list),
    :where(.gluon-navigation-menu-sublist) {
      display: flex;
      flex-wrap: wrap;
      gap: var(--gluon-navigation-menu-gap, 0.25rem);
      list-style: none;
      margin: 0;
      padding: 0;
    }

    :where(.gluon-navigation-menu-group) {
      position: relative;
    }

    :where(.gluon-navigation-menu-item) {
      align-items: center;
      display: flex;
      min-inline-size: 0;
    }

    :where(.gluon-navigation-menu-link),
    :where(.gluon-navigation-menu-trigger) {
      align-items: center;
      background: transparent;
      border: 0;
      color: var(--gluon-navigation-menu-color, inherit);
      cursor: pointer;
      display: inline-flex;
      font: inherit;
      gap: 0.35rem;
      justify-content: space-between;
      min-block-size: 2.75rem;
      min-inline-size: 2.75rem;
      padding-block: 0.5rem;
      padding-inline: 0.75rem;
      text-decoration: none;
    }

    :where(.gluon-navigation-menu-link:hover),
    :where(.gluon-navigation-menu-trigger:hover) {
      background: var(--gluon-navigation-menu-hover-background, color-mix(in srgb, currentcolor 10%, transparent));
    }

    :where(.gluon-navigation-menu-link[aria-current='page']) {
      font-weight: 650;
      text-decoration: underline;
      text-decoration-thickness: 0.12em;
      text-underline-offset: 0.22em;
    }

    :where(.gluon-navigation-menu-link[aria-disabled='true']),
    :where(.gluon-navigation-menu-trigger[aria-disabled='true']),
    :where(.gluon-navigation-menu-link:disabled),
    :where(.gluon-navigation-menu-trigger:disabled) {
      cursor: default;
      opacity: 0.55;
    }

    :where(.gluon-navigation-menu-sublist) {
      background: var(--gluon-navigation-menu-surface, Canvas);
      border: 1px solid var(--gluon-navigation-menu-border, currentcolor);
      box-shadow: var(--gluon-navigation-menu-shadow, 0 0.5rem 1.5rem rgb(0 0 0 / 0.14));
      display: grid;
      gap: 0.125rem;
      inset-block-start: 100%;
      inset-inline-start: 0;
      min-inline-size: min(16rem, calc(100vw - 1rem));
      padding: 0.25rem;
      position: absolute;
      z-index: 2;
    }

    :where(.gluon-navigation-menu-sublist .gluon-navigation-menu-sublist) {
      inset-block-start: -0.25rem;
      inset-inline-start: 100%;
    }

    :where(.gluon-navigation-menu-sublist[hidden]) {
      display: none;
    }

    :where(.gluon-navigation-menu-sublist .gluon-navigation-menu-item),
    :where(.gluon-navigation-menu-sublist .gluon-navigation-menu-link),
    :where(.gluon-navigation-menu-sublist .gluon-navigation-menu-trigger) {
      inline-size: 100%;
    }

    :where(.gluon-navigation-menu-chevron) {
      font-size: 0.9em;
      line-height: 1;
      transition: transform 120ms ease;
    }

    :where(.gluon-navigation-menu-trigger[aria-expanded='true'] .gluon-navigation-menu-chevron) {
      transform: rotate(180deg);
    }

    :where(.gluon-navigation-menu-unavailable) {
      display: block;
      font-size: 0.75em;
      inline-size: 100%;
      padding-inline: 0.75rem;
    }

    :where(.gluon-navigation-menu-link:focus-visible),
    :where(.gluon-navigation-menu-trigger:focus-visible) {
      outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #1b6ef3);
      outline-offset: -2px;
    }

    @media (max-width: 40rem) {
      :where(.gluon-navigation-menu-list) { align-items: stretch; display: grid; }
      :where(.gluon-navigation-menu-group),
      :where(.gluon-navigation-menu-link),
      :where(.gluon-navigation-menu-trigger) { inline-size: 100%; }
      :where(.gluon-navigation-menu-sublist),
      :where(.gluon-navigation-menu-sublist .gluon-navigation-menu-sublist) {
        border-inline: 0;
        box-shadow: none;
        inset: auto;
        min-inline-size: 0;
        padding-inline: 0.5rem;
        position: static;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      :where(.gluon-navigation-menu-chevron) { transition: none; }
    }

    @media (forced-colors: active) {
      :where(.gluon-navigation-menu-sublist) { border: 1px solid CanvasText; box-shadow: none; }
      :where(.gluon-navigation-menu-link[aria-current='page']) { text-decoration: underline; }
    }
  }
`;

export const navigationMenuStyleDependency = createComponentStyleDependency({
  id: 'gluon-molecule-navigation-menu',
  sheet: navigationMenuStyles,
  layer: 'molecule',
  order: 3,
  scope: 'gluon-component',
});
