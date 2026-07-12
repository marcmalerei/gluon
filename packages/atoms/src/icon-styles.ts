import { createComponentStyleDependency, css } from '@gluonjs/core';

export const iconStyles = css`@layer atoms { :where(.gluon-icon) { display: inline-block; flex: none; vertical-align: middle; } }`;
export const iconStyleDependency = createComponentStyleDependency({ id: 'gluon-atom-icon', sheet: iconStyles, layer: 'atom', order: 1, scope: 'gluon-component' });
