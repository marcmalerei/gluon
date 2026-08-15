import { defineAtom, html, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { aspectRatioStyles } from './aspect-ratio-styles.js';

export interface AspectRatioProps { readonly ratio?: number; readonly children?: TemplateValue; }
export type AspectRatioAttributes = Record<string, unknown>;
export const AspectRatio = defineAtom(({ ratio = 1, children }: AspectRatioProps): TemplateResult => html`<div class="gluon atom gluon-aspect-ratio" style=${`aspect-ratio: ${ratio};`}>${children}</div>`, 'AspectRatio', [{ id: 'gluon-atom-aspect-ratio', sheet: aspectRatioStyles, layer: 'atom', order: 100 }]);
// Kept in a separate module so the atom and its stylesheet are independently tree-shakable.
