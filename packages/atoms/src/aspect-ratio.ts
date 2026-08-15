import {
  defineAtom,
  mergeProps,
  type TemplateResult,
  type TemplateValue,
} from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { aspectRatioStyleDependency } from './aspect-ratio-styles.js';

/** Native div attributes forwarded by {@link AspectRatio}. */
export type AspectRatioAttributes = Omit<
  QuarkProps<HTMLDivElement>,
  'children'
>;

export interface AspectRatioProps {
  /** Positive finite inline-size to block-size ratio. Defaults to `1`. */
  readonly ratio?: number;
  /** Caller-owned content constrained by the ratio wrapper. */
  readonly children?: TemplateValue;
  /** Typed native div attributes. Caller classes and styles are merged. */
  readonly attributes?: AspectRatioAttributes;
}

function renderAspectRatio({
  ratio = 1,
  children,
  attributes = {},
}: AspectRatioProps): TemplateResult {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    throw new RangeError('AspectRatio ratio must be a positive finite number.');
  }

  const merged = mergeProps({
    class: { gluon: true, atom: true, 'gluon-aspect-ratio': true },
    style: { '--gluon-aspect-ratio': String(ratio) },
    children,
  }, attributes);
  return q.div(merged as QuarkProps<HTMLDivElement>);
}

export const AspectRatio = defineAtom(
  renderAspectRatio,
  'AspectRatio',
  [aspectRatioStyleDependency],
);
