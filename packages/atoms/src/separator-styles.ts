import { css, createComponentStyleDependency } from '@gluonjs/core';
export const separatorStyles = css`@layer atoms { :where(.gluon-separator) { border: 0; background: var(--gluon-separator-color, currentColor); opacity: .25; } :where(.gluon-separator.is-horizontal) { inline-size: 100%; block-size: 1px; } :where(.gluon-separator.is-vertical) { inline-size: 1px; block-size: 100%; } }`;
export const separatorStyleDependency = createComponentStyleDependency({ id: 'gluon-atom-separator', sheet: separatorStyles, layer: 'atom', order: 100 });
