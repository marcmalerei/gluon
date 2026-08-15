import {
  defineAtom,
  mergeProps,
  type TemplateResult,
} from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { separatorStyleDependency } from './separator-styles.js';

export type SeparatorOrientation = 'horizontal' | 'vertical';

/** Native hr attributes forwarded by {@link Separator}. */
export type SeparatorAttributes = Omit<
  QuarkProps<HTMLHRElement>,
  'children' | 'role' | 'aria' | 'aria-hidden' | 'aria-orientation'
> & {
  readonly aria?: Omit<
    NonNullable<QuarkProps<HTMLHRElement>['aria']>,
    'hidden' | 'orientation'
  >;
};

export interface SeparatorProps {
  /** Logical separator axis. Native `hr` defaults to horizontal. */
  readonly orientation?: SeparatorOrientation;
  /** Removes separator semantics when the rule is purely decorative. */
  readonly decorative?: boolean;
  /** Typed native hr attributes. Caller classes and styles are merged. */
  readonly attributes?: SeparatorAttributes;
}

function renderSeparator({
  orientation = 'horizontal',
  decorative = false,
  attributes = {},
}: SeparatorProps): TemplateResult {
  const { aria, ...nativeAttributes } = attributes;
  return q.hr(mergeProps({
    class: {
      gluon: true,
      atom: true,
      'gluon-separator': true,
      [`is-${orientation}`]: true,
    },
    role: decorative ? 'presentation' : undefined,
    aria: decorative
      ? { ...aria, hidden: true }
      : { ...aria, orientation: orientation === 'vertical' ? 'vertical' : undefined },
  }, nativeAttributes) as QuarkProps<HTMLHRElement>);
}

export const Separator = defineAtom(
  renderSeparator,
  'Separator',
  [separatorStyleDependency],
);
