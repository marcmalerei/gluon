import { defineMolecule, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { choiceGroupStyleDependency } from './choice-group-styles.js';

export type ChoiceGroupOrientation = 'vertical' | 'horizontal';

export type ChoiceGroupAttributes = Omit<
  QuarkProps<HTMLFieldSetElement>,
  'children' | 'id' | '.id' | 'disabled' | '.disabled' | '?disabled' | 'aria'
> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLFieldSetElement>['aria']>, 'describedby' | 'errormessage' | 'invalid'>;
};

export interface ChoiceGroupProps {
  readonly id: string;
  readonly legend: TemplateValue;
  readonly children: TemplateValue;
  readonly helper?: TemplateValue;
  readonly error?: TemplateValue;
  readonly disabled?: boolean;
  readonly orientation?: ChoiceGroupOrientation;
  readonly attributes?: ChoiceGroupAttributes;
}

function renderChoiceGroup({
  id,
  legend,
  children,
  helper,
  error,
  disabled = false,
  orientation = 'vertical',
  attributes = {},
}: ChoiceGroupProps): TemplateResult {
  const helperId = helper === undefined ? undefined : `${id}-helper`;
  const errorId = error === undefined ? undefined : `${id}-error`;
  const { aria, ...nativeAttributes } = attributes;
  return q.fieldset({
    ...nativeAttributes,
    id,
    class: [
      { gluon: true, molecule: true, 'gluon-choice-group': true, [`is-${orientation}`]: true },
      attributes.class,
    ],
    '?disabled': disabled,
    aria: {
      ...aria,
      describedby: helperId,
      errormessage: errorId,
      invalid: error === undefined ? undefined : true,
    },
    children: [
      q.legend({ class: 'gluon-choice-group-legend', children: legend }),
      q.div({ class: 'gluon-choice-group-options', children }),
      helperId ? q.span({ id: helperId, class: 'gluon-choice-group-helper', children: helper }) : nothing,
      errorId ? q.span({ id: errorId, class: 'gluon-choice-group-error', role: 'alert', children: error }) : nothing,
    ],
  });
}

export const ChoiceGroup = defineMolecule(renderChoiceGroup, 'ChoiceGroup', [choiceGroupStyleDependency]);
