import { Input, ToggleButton, type InputProps, type ToggleButtonAttributes } from '@gluonjs/atoms';
import { defineMolecule, nothing, type TemplateResult } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { passwordToggleFieldStyleDependency } from './password-toggle-field-styles.js';

export type PasswordToggleFieldAttributes = Omit<QuarkProps<HTMLDivElement>, 'children'>;
export type PasswordToggleFieldInputAttributes = InputProps['attributes'];

export interface PasswordToggleFieldProps {
  readonly id: string;
  readonly label: string;
  readonly value?: string;
  readonly visible?: boolean;
  readonly onVisibleChange?: (visible: boolean, event: MouseEvent) => void;
  readonly onInput?: (event: InputEvent) => void;
  readonly name?: string;
  readonly autocomplete?: NonNullable<PasswordToggleFieldInputAttributes>['autocomplete'];
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly required?: boolean;
  readonly invalid?: boolean;
  readonly helper?: string;
  readonly error?: string;
  readonly showLabel: string;
  readonly hideLabel: string;
  readonly inputAttributes?: PasswordToggleFieldInputAttributes;
  readonly toggleAttributes?: ToggleButtonAttributes;
  readonly attributes?: PasswordToggleFieldAttributes;
}

function renderPasswordToggleField({
  id,
  label,
  value = '',
  visible = false,
  onVisibleChange,
  onInput,
  name,
  autocomplete,
  disabled = false,
  readOnly = false,
  required = false,
  invalid = false,
  helper,
  error,
  showLabel,
  hideLabel,
  inputAttributes = {},
  toggleAttributes = {},
  attributes = {},
}: PasswordToggleFieldProps): TemplateResult {
  assertDomId('PasswordToggleField.id', id);
  assertNonEmpty('PasswordToggleField.label', label);
  assertNonEmpty('PasswordToggleField.showLabel', showLabel);
  assertNonEmpty('PasswordToggleField.hideLabel', hideLabel);
  const inputId = `${id}-input`;
  const labelId = `${id}-label`;
  const helperId = helper === undefined ? undefined : `${id}-helper`;
  const errorId = error === undefined ? undefined : `${id}-error`;
  const { onInput: attributeInput, aria: inputAria, ...nativeInputAttributes } = inputAttributes;
  const describedby = joinIds(typeof inputAria?.describedby === 'string' ? inputAria.describedby : undefined, helperId, errorId);
  const labelledby = typeof inputAria?.labelledby === 'string' ? inputAria.labelledby : labelId;
  const { onClick: attributeClick, ...nativeToggleAttributes } = toggleAttributes;
  const fieldInvalid = invalid || error !== undefined;

  return q.div({
    ...attributes,
    id,
    class: [{ gluon: true, molecule: true, 'gluon-password-toggle-field': true }, attributes.class],
    children: [
      q.label({ id: labelId, for: inputId, class: 'gluon-password-toggle-field-label', children: label }),
      q.div({
        class: 'gluon-password-toggle-field-controls',
        children: [
          Input({
            value,
            type: visible ? 'text' : 'password',
            name,
            disabled,
            invalid: fieldInvalid,
            onInput: (event) => {
              callListener(attributeInput, event);
              if (!event.defaultPrevented) onInput?.(event);
            },
            attributes: {
              ...nativeInputAttributes,
              id: inputId,
              autocomplete,
              readOnly,
              required,
              aria: {
                ...inputAria,
                labelledby,
                describedby,
                errormessage: errorId,
                invalid: fieldInvalid || undefined,
              },
            } as PasswordToggleFieldInputAttributes,
          }),
          ToggleButton({
            pressed: visible,
            label: visible ? hideLabel : showLabel,
            type: 'button',
            disabled,
            onClick: (event) => {
              callListener(attributeClick, event);
              if (!event.defaultPrevented) onVisibleChange?.(!visible, event);
            },
            attributes: {
              ...nativeToggleAttributes,
              'aria-controls': inputId,
            },
          }),
        ],
      }),
      helperId ? q.span({ id: helperId, class: 'gluon-password-toggle-field-helper', children: helper }) : nothing,
      errorId ? q.span({ id: errorId, class: 'gluon-password-toggle-field-error', role: 'alert', children: error }) : nothing,
    ],
  });
}

function assertNonEmpty(name: string, value: string): void {
  if (value.trim().length === 0) throw new TypeError(`${name} must be a non-empty string.`);
}

function assertDomId(name: string, value: string): void {
  assertNonEmpty(name, value);
  if (/\s/u.test(value)) throw new TypeError(`${name} must not contain whitespace.`);
}

function joinIds(...values: readonly (string | undefined)[]): string | undefined {
  const ids = values.flatMap((value) => value?.split(/\s+/u) ?? []).filter(Boolean);
  return ids.length === 0 ? undefined : [...new Set(ids)].join(' ');
}

function callListener<EventType extends Event>(listener: ((event: EventType) => unknown) | { handleEvent(event: EventType): void } | null | undefined, event: EventType): void {
  if (typeof listener === 'function') listener(event);
  else listener?.handleEvent(event);
}

export const PasswordToggleField = defineMolecule(renderPasswordToggleField, 'PasswordToggleField', [passwordToggleFieldStyleDependency]);
