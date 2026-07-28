import { createComponentStyleDependency, css } from '@gluonjs/core';

export const navigationStripStyles = css`
  @layer molecules {
    :where(.gluon-navigation-strip) {
      align-items: center;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      min-inline-size: 0;
    }

    :where(.gluon-navigation-strip-viewport) {
      min-inline-size: 0;
      overflow-x: auto;
      overscroll-behavior-inline: contain;
      scrollbar-width: none;
    }

    :where(.gluon-navigation-strip-viewport)::-webkit-scrollbar {
      display: none;
    }

    :where(.gluon-navigation-strip-content) {
      align-items: stretch;
      display: flex;
      gap: var(--gluon-navigation-strip-gap, 0.5rem);
      inline-size: max-content;
      min-inline-size: 100%;
    }

    :where(.gluon-navigation-strip-control) {
      align-items: center;
      align-self: stretch;
      background: var(--gluon-navigation-strip-control-background, var(--gluon-color-surface, white));
      border: 1px solid var(--gluon-navigation-strip-control-border-color, var(--gluon-color-rule, #d9e4e2));
      color: var(--gluon-navigation-strip-control-color, var(--gluon-color-text, #12312f));
      cursor: pointer;
      display: inline-flex;
      font: inherit;
      inline-size: 2.75rem;
      justify-content: center;
      min-block-size: 2.75rem;
      padding: 0;
      position: relative;
      z-index: 1;
    }

    :where(.gluon-navigation-strip-control[hidden]) {
      display: none;
    }

    :where(.gluon-navigation-strip-control:disabled) {
      cursor: default;
      opacity: 0.35;
    }

    :where(.gluon-navigation-strip-control:focus-visible) {
      outline: var(--gluon-focus-width, 3px) solid var(--gluon-color-focus, #1b6ef3);
      outline-offset: -3px;
    }

    :where(.gluon-navigation-strip-control-glyph) {
      font-size: 1.5rem;
      line-height: 1;
    }
  }
`;

export const navigationStripStyleDependency = createComponentStyleDependency({
  id: 'gluon-molecule-navigation-strip',
  sheet: navigationStripStyles,
  layer: 'molecule',
  order: 2,
  scope: 'gluon-component',
});
