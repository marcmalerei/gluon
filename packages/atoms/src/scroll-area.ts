import { defineUiAtom, type UiAtomProps } from './define-ui-atom.js';
export interface ScrollAreaProps { readonly orientation?: 'vertical'|'horizontal'|'both'; }
export type ScrollAreaAttributes = UiAtomProps<ScrollAreaProps, 'section'>;
export const ScrollArea = defineUiAtom<ScrollAreaProps, 'section'>({ displayName: 'ScrollArea', tag: 'section', defaults: { orientation: 'vertical' }, style: { id: 'gluon-atom-scroll-area', sheet: scrollAreaStyles }, nativeProps: ({ orientation, ...props }) => ({ ...props, class: ['gluon','atom','gluon-scroll-area', `is-${orientation}`], tabindex: 0 } as never) });
import { scrollAreaStyles } from './scroll-area-styles.js';
