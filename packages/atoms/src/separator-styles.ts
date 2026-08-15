import { createComponentStyleDependency, css } from '@gluonjs/core';

export const separatorStyles = css`
  @layer atoms {
    :where(.gluon-separator) {
      box-sizing: border-box;
      flex: none;
      margin: 0;
      border: 0;
      background: var(--gluon-separator-color, var(--gluon-color-rule, #b8c9c6));
    }

    :where(.gluon-separator.is-horizontal) {
      inline-size: var(--gluon-separator-length, 100%);
      block-size: var(--gluon-separator-thickness, 1px);
    }

    :where(.gluon-separator.is-vertical) {
      inline-size: var(--gluon-separator-thickness, 1px);
      block-size: var(--gluon-separator-length, 100%);
    }

    @media (forced-colors: active) {
      :where(.gluon-separator) {
        background: CanvasText;
        forced-color-adjust: none;
      }
    }
  }
`;

export const separatorStyleDependency = createComponentStyleDependency({
  id: 'gluon-atom-separator',
  sheet: separatorStyles,
  layer: 'atom',
  order: 15,
  scope: 'gluon-component',
});
