import { Input, type InputProps } from '@gluonjs/atoms';
import { defineMolecule, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type ListboxOption, type QuarkProps } from '@gluonjs/quarks';
import { comboboxFieldStyleDependency } from './combobox-field-styles.js';

export type ComboboxFieldAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'id'>;
export type ComboboxFieldInputAttributes = InputProps['attributes'];
export type ComboboxFieldListboxAttributes = Omit<QuarkProps<HTMLUListElement>, 'children' | 'id' | 'role'>;

export interface ComboboxFieldProps {
  readonly id: string;
  readonly label: string;
  readonly options: readonly ListboxOption[];
  readonly value?: string;
  readonly inputValue?: string;
  readonly activeValue?: string;
  readonly open?: boolean;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly helper?: TemplateValue;
  readonly error?: TemplateValue;
  readonly emptyMessage?: TemplateValue;
  readonly onInputChange?: (value: string, event: InputEvent) => void;
  readonly onActiveChange?: (value: string, event: KeyboardEvent) => void;
  readonly onSelect?: (value: string, event: Event) => void;
  readonly onOpenChange?: (open: boolean, event: Event) => void;
  readonly inputAttributes?: ComboboxFieldInputAttributes;
  readonly listboxAttributes?: ComboboxFieldListboxAttributes;
  readonly attributes?: ComboboxFieldAttributes;
}

function renderComboboxField({
  id,
  label,
  options,
  value,
  inputValue,
  activeValue,
  open = false,
  loading = false,
  disabled = false,
  placeholder,
  helper,
  error,
  emptyMessage = 'No matches found.',
  onInputChange,
  onActiveChange,
  onSelect,
  onOpenChange,
  inputAttributes = {},
  listboxAttributes = {},
  attributes = {},
}: ComboboxFieldProps): TemplateResult {
  assertDomId('ComboboxField.id', id);
  assertNonEmpty('ComboboxField.label', label);
  const inputId = inputAttributes.id ?? `${id}-input`;
  assertDomId('ComboboxField.inputAttributes.id', inputId);
  const listboxId = `${id}-listbox`;
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const selected = options.find((option) => option.value === value && !option.disabled);
  const selectedIndex = options.findIndex((option) => option.value === (activeValue ?? value) && !option.disabled);
  const activeOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const visibleValue = inputValue ?? selected?.label ?? '';
  const describedBy = [inputAttributes.aria?.describedby, error ? errorId : helper ? descriptionId : undefined].filter(Boolean).join(' ') || undefined;
  const optionId = (index: number): string => `${id}-option-${index}`;
  const moveActive = (direction: 1 | -1, event: KeyboardEvent): void => {
    const start = selectedIndex < 0 ? (direction === 1 ? -1 : options.length) : selectedIndex;
    const next = findEnabledIndex(options, start, direction);
    if (next >= 0) {
      event.preventDefault();
      onOpenChange?.(true, event);
      const nextOption = options[next];
      if (nextOption) onActiveChange?.(nextOption.value, event);
    }
  };
  const { onInput: attributeInput, onKeydown: attributeKeydown, ...nativeInputAttributes } = inputAttributes;
  const renderedOptions = options.map((option, index) => q.li({
    id: optionId(index),
    role: 'option',
    tabIndex: -1,
    aria: { selected: option.value === value, disabled: option.disabled || undefined },
    class: [{ 'gluon-combobox-field-option': true, 'is-disabled': option.disabled }],
    onClick: (event: MouseEvent) => {
      if (option.disabled) {
        event.preventDefault();
        return;
      }
      onSelect?.(option.value, event);
      onOpenChange?.(false, event);
    },
    children: option.label,
  }));

  return q.div({
    ...attributes,
    id,
    class: [{ gluon: true, molecule: true, 'gluon-combobox-field': true }, attributes.class],
    children: [
      q.label({ id: labelId, for: inputId, class: 'gluon-combobox-field-label', children: label }),
      q.div({
        class: 'gluon-combobox-field-control',
        children: [
          Input({
            value: visibleValue,
            placeholder,
            disabled,
            invalid: error !== undefined,
            onInput: (event) => {
              callListener(attributeInput, event);
              if (!event.defaultPrevented) {
                onInputChange?.((event.target as HTMLInputElement).value, event);
                onOpenChange?.(true, event);
              }
            },
            attributes: {
              ...nativeInputAttributes,
              id: inputId,
              role: 'combobox',
              aria: {
                ...nativeInputAttributes.aria,
                labelledby: labelId,
                controls: listboxId,
                expanded: open,
                autocomplete: 'list',
                activedescendant: open && selectedIndex >= 0 ? optionId(selectedIndex) : undefined,
                describedby: describedBy,
                busy: loading || undefined,
              },
              onKeydown: (event: KeyboardEvent) => {
                callListener(attributeKeydown, event);
                if (event.defaultPrevented || disabled) return;
                if (event.key === 'ArrowDown') moveActive(1, event);
                else if (event.key === 'ArrowUp') moveActive(-1, event);
                else if (event.key === 'Escape' && open) {
                  event.preventDefault();
                  onOpenChange?.(false, event);
                } else if (event.key === 'Enter' && open && selectedIndex >= 0) {
                  event.preventDefault();
                  if (activeOption) onSelect?.(activeOption.value, event);
                  onOpenChange?.(false, event);
                }
              },
            },
          }),
          q.ul({
            ...listboxAttributes,
            id: listboxId,
            role: 'listbox',
            hidden: !open,
            aria: { ...listboxAttributes.aria, labelledby: labelId, busy: loading || undefined },
            class: [{ 'gluon-combobox-field-listbox': true }, listboxAttributes.class],
            children: loading
              ? q.li({ role: 'status', class: 'gluon-combobox-field-status', children: 'Loading suggestions…' })
              : renderedOptions.length > 0
                ? renderedOptions
                : q.li({ class: 'gluon-combobox-field-status', children: emptyMessage }),
          }),
        ],
      }),
      error === undefined && helper === undefined ? nothing : q.span({ id: error ? errorId : descriptionId, class: error ? 'gluon-combobox-field-error' : 'gluon-combobox-field-helper', role: error ? 'alert' : undefined, children: error ?? helper }),
    ],
  });
}

function findEnabledIndex(options: readonly ListboxOption[], start: number, direction: 1 | -1): number {
  for (let index = start + direction; index >= 0 && index < options.length; index += direction) {
    if (!options[index]?.disabled) return index;
  }
  return -1;
}

function assertNonEmpty(name: string, value: string): void {
  if (!value.trim()) throw new TypeError(`${name} must be a non-empty string.`);
}

function assertDomId(name: string, value: string): void {
  assertNonEmpty(name, value);
  if (/\s/u.test(value)) throw new TypeError(`${name} must not contain whitespace.`);
}

function callListener<EventType extends Event>(
  listener: ((event: EventType) => unknown) | { handleEvent(event: EventType): void } | null | undefined,
  event: EventType,
): void {
  if (typeof listener === 'function') listener(event);
  else listener?.handleEvent(event);
}

export const ComboboxField = defineMolecule(renderComboboxField, 'ComboboxField', [comboboxFieldStyleDependency]);
