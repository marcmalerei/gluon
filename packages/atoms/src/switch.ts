import { defineAtom, mergeProps, type TemplateResult } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { switchStyleDependency } from './switch-styles.js';

export type SwitchAttributes = Omit<
  QuarkProps<HTMLInputElement>,
  | 'children'
  | 'type'
  | '.type'
  | 'role'
  | '.role'
  | 'checked'
  | '.checked'
  | '?checked'
  | 'name'
  | '.name'
  | 'value'
  | '.value'
  | 'disabled'
  | '.disabled'
  | '?disabled'
  | 'required'
  | '.required'
  | '?required'
  | 'onChange'
>;

export interface SwitchProps {
  readonly checked?: boolean;
  readonly name?: string;
  readonly value?: string;
  readonly disabled?: boolean;
  readonly required?: boolean;
  readonly onChange?: (event: Event) => void;
  readonly attributes?: SwitchAttributes;
}

function renderSwitch({
  checked,
  name,
  value,
  disabled = false,
  required = false,
  onChange,
  attributes = {},
}: SwitchProps): TemplateResult {
  const controlledState = checked === undefined ? {} : {
    '?checked': checked,
    '.checked': checked,
  };
  const merged = mergeProps({
    class: { gluon: true, atom: true, 'gluon-switch': true },
    type: 'checkbox',
    role: 'switch',
    name,
    value,
    '?disabled': disabled,
    '?required': required,
    onChange: onChange as EventListener | undefined,
    ...controlledState,
  }, attributes);
  return q.input(merged as QuarkProps<HTMLInputElement>);
}

export const Switch = defineAtom(renderSwitch, 'Switch', [switchStyleDependency]);
