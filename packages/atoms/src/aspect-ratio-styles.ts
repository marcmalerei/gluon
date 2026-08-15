import { createComponentStyleDependency, css } from '@gluonjs/core';

export const aspectRatioStyles = css`
  @layer atoms {
    :where(.gluon-aspect-ratio) {
      box-sizing: border-box;
      display: block;
      max-inline-size: 100%;
      aspect-ratio: var(--gluon-aspect-ratio, 1);
      overflow: hidden;
    }
  }
`;

export const aspectRatioStyleDependency = createComponentStyleDependency({
  id: 'gluon-atom-aspect-ratio',
  sheet: aspectRatioStyles,
  layer: 'atom',
  order: 12,
  scope: 'gluon-component',
});
