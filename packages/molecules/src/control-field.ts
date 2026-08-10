import { defineMolecule, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { controlFieldStyleDependency } from './control-field-styles.js';

export type ControlFieldAttributes = Omit<QuarkProps<HTMLDivElement>, 'children'>;

export interface ControlFieldRelationships {
  readonly controlId: string;
  readonly labelId: string;
  readonly helperId?: string;
  readonly errorId?: string;
  readonly required: boolean;
  readonly invalid: boolean;
  readonly aria: {
    readonly labelledby: string;
    readonly describedby?: string;
    readonly errormessage?: string;
    readonly invalid?: true;
  };
}

export type ControlFieldRenderer = (relationships: ControlFieldRelationships) => TemplateValue;

export interface ControlFieldProps {
  readonly id: string;
  readonly label: TemplateValue;
  readonly control: ControlFieldRenderer;
  readonly helper?: TemplateValue;
  readonly error?: TemplateValue;
  readonly required?: boolean;
  readonly attributes?: ControlFieldAttributes;
}

function renderControlField({ id, label, control, helper, error, required = false, attributes = {} }: ControlFieldProps): TemplateResult {
  const labelId = `${id}-label`;
  const helperId = helper === undefined ? undefined : `${id}-helper`;
  const errorId = error === undefined ? undefined : `${id}-error`;
  const relationships: ControlFieldRelationships = {
    controlId: id,
    labelId,
    helperId,
    errorId,
    required,
    invalid: error !== undefined,
    aria: {
      labelledby: labelId,
      describedby: helperId,
      errormessage: errorId,
      invalid: error === undefined ? undefined : true,
    },
  };

  return q.div({
    ...attributes,
    class: [{ gluon: true, molecule: true, 'gluon-control-field': true }, attributes.class],
    children: [
      q.label({
        id: labelId,
        for: id,
        class: 'gluon-control-field-label',
        children: [
          label,
          required ? q.span({ class: 'gluon-control-field-required', aria: { hidden: true }, children: ' *' }) : nothing,
        ],
      }),
      control(relationships),
      helperId ? q.span({ id: helperId, class: 'gluon-control-field-helper', children: helper }) : nothing,
      errorId ? q.span({ id: errorId, class: 'gluon-control-field-error', role: 'alert', children: error }) : nothing,
    ],
  });
}

export const ControlField = defineMolecule(renderControlField, 'ControlField', [controlFieldStyleDependency]);
