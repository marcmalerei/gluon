import { defineUiAtom, type UiAtomProps } from './define-ui-atom.js';
export interface SeparatorProps { readonly orientation?: 'horizontal'|'vertical'; readonly decorative?: boolean; }
export type SeparatorAttributes = UiAtomProps<SeparatorProps, 'hr'>;
export const Separator = defineUiAtom<SeparatorProps, 'hr'>({ displayName: 'Separator', tag: 'hr', defaults: { orientation: 'horizontal', decorative: false }, style: { id: 'gluon-atom-separator', sheet: separatorStyles }, nativeProps: ({ orientation, decorative, ...attributes }) => ({ ...attributes, role: decorative ? 'presentation' : 'separator', 'aria-orientation': orientation, class: ['gluon','atom','gluon-separator', `is-${orientation}`] } as never) });
import { separatorStyles } from './separator-styles.js';
