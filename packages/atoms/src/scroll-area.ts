import {
  defineAtom,
  mergeProps,
  type TemplateResult,
  type TemplateValue,
} from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { scrollAreaStyleDependency } from './scroll-area-styles.js';

export type ScrollAreaOrientation = 'vertical' | 'horizontal' | 'both';

/** Native section attributes forwarded by {@link ScrollArea}. */
export type ScrollAreaAttributes = Omit<
  QuarkProps<HTMLElement>,
  'children' | 'role' | 'aria' | 'aria-label'
> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLElement>['aria']>, 'label'>;
};

export interface ScrollAreaProps {
  /** Required accessible name for the native section region. */
  readonly label: string;
  /** Axis on which native overflow is enabled. Defaults to `vertical`. */
  readonly orientation?: ScrollAreaOrientation;
  /** Caller-owned region content. */
  readonly children?: TemplateValue;
  /** Typed native section attributes, including caller-owned `tabIndex`. */
  readonly attributes?: ScrollAreaAttributes;
}

function renderScrollArea({
  label,
  orientation = 'vertical',
  children,
  attributes = {},
}: ScrollAreaProps): TemplateResult {
  if (!label.trim()) {
    throw new TypeError('ScrollArea label must be a non-empty accessible name.');
  }

  const { aria, ...nativeAttributes } = attributes;
  return q.section(mergeProps({
    class: {
      gluon: true,
      atom: true,
      'gluon-scroll-area': true,
      [`is-${orientation}`]: true,
    },
    tabIndex: 0,
    aria: { ...aria, label },
    children,
  }, nativeAttributes) as QuarkProps<HTMLElement>);
}

export const ScrollArea = defineAtom(
  renderScrollArea,
  'ScrollArea',
  [scrollAreaStyleDependency],
);
