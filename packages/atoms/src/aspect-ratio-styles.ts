import { css, createComponentStyleDependency } from '@gluonjs/core';
export const aspectRatioStyles = css`@layer atoms { :where(.gluon-aspect-ratio) { position: relative; aspect-ratio: var(--gluon-aspect-ratio, 1); } :where(.gluon-aspect-ratio > *) { max-inline-size: 100%; } }`;
export const aspectRatioStyleDependency = createComponentStyleDependency({ id: 'gluon-atom-aspect-ratio', sheet: aspectRatioStyles, layer: 'atom', order: 100 });
