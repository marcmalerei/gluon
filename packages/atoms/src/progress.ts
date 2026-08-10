import { defineAtom, mergeProps, type TemplateResult } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { progressStyleDependency } from './progress-styles.js';

export type ProgressAttributes = Omit<
  QuarkProps<HTMLProgressElement>,
  'children' | 'value' | '.value' | 'max' | '.max'
>;

export interface ProgressProps {
  readonly value?: number;
  readonly max?: number;
  readonly fullWidth?: boolean;
  readonly attributes?: ProgressAttributes;
}

function renderProgress({
  value,
  max = 100,
  fullWidth = false,
  attributes = {},
}: ProgressProps): TemplateResult {
  const determinate = value === undefined ? {} : { value };
  return q.progress(mergeProps({
    class: { gluon: true, atom: true, 'gluon-progress': true, 'is-full-width': fullWidth },
    max,
    ...determinate,
  }, attributes) as QuarkProps<HTMLProgressElement>);
}

export const Progress = defineAtom(renderProgress, 'Progress', [progressStyleDependency]);
