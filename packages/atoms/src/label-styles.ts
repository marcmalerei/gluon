import { createComponentStyleDependency, css } from '@gluonjs/core';

export const labelStyles = css`@layer atoms { :where(.gluon-label) { font-size: 0.875rem; font-weight: 650; } }`;
export const labelStyleDependency = createComponentStyleDependency({ id: 'gluon-atom-label', sheet: labelStyles, layer: 'atom', order: 3, scope: 'gluon-component' });
