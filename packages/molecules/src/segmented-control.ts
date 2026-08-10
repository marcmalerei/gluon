import { defineMolecule, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { ToggleButton } from '@gluonjs/atoms';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { segmentedControlStyleDependency } from './segmented-control-styles.js';

export type SegmentedControlOrientation = 'horizontal' | 'vertical';
export type SegmentedControlAccessibleName =
  | { readonly label: string; readonly labelledBy?: never }
  | { readonly label?: never; readonly labelledBy: string };

export interface SegmentedControlOption {
  readonly value: string;
  readonly label: TemplateValue;
  readonly ariaLabel?: string;
  readonly disabled?: boolean;
}

export type SegmentedControlAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'role' | '.role' | 'aria'> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLDivElement>['aria']>, 'label' | 'labelledby' | 'orientation'>;
};

export type SegmentedControlChangeEvent = MouseEvent | KeyboardEvent;

export type SegmentedControlProps = SegmentedControlAccessibleName & {
  readonly value: string;
  readonly options: readonly SegmentedControlOption[];
  readonly orientation?: SegmentedControlOrientation;
  readonly disabled?: boolean;
  readonly onChange?: (value: string, event: SegmentedControlChangeEvent) => void;
  readonly attributes?: SegmentedControlAttributes;
};

function renderSegmentedControl({
  value,
  options,
  label,
  labelledBy,
  orientation = 'horizontal',
  disabled = false,
  onChange,
  attributes = {},
}: SegmentedControlProps): TemplateResult {
  const enabled = options.filter((option) => !disabled && !option.disabled);
  const tabValue = enabled.some((option) => option.value === value) ? value : enabled[0]?.value;
  const { aria, ...nativeAttributes } = attributes;
  return q.div({
    ...nativeAttributes,
    role: 'toolbar',
    class: [
      { gluon: true, molecule: true, 'gluon-segmented-control': true, [`is-${orientation}`]: true },
      attributes.class,
    ],
    aria: { ...aria, label, labelledby: labelledBy, orientation },
    children: options.map((option) => ToggleButton({
      pressed: option.value === value,
      disabled: disabled || option.disabled,
      variant: 'ghost',
      children: option.label,
      onClick: (event) => onChange?.(option.value, event),
      attributes: {
        class: 'gluon-segmented-control-option',
        tabIndex: option.value === tabValue ? 0 : -1,
        data: { value: option.value },
        aria: { label: option.ariaLabel },
        onKeydown: (event: KeyboardEvent) => handleKeyDown(event, orientation, onChange),
      },
    })),
  });
}

function handleKeyDown(
  event: KeyboardEvent,
  orientation: SegmentedControlOrientation,
  onChange: SegmentedControlProps['onChange'],
): void {
  const current = event.currentTarget as HTMLButtonElement;
  const root = current.closest<HTMLElement>('.gluon-segmented-control');
  if (!root) return;
  const options = [...root.querySelectorAll<HTMLButtonElement>('.gluon-segmented-control-option:not(:disabled)')];
  const index = options.indexOf(current);
  if (index < 0 || options.length === 0) return;
  const rtl = getComputedStyle(root).direction === 'rtl';
  const previousKey = orientation === 'vertical' ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';
  const nextKey = orientation === 'vertical' ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
  let target: HTMLButtonElement | undefined;
  if (event.key === previousKey) target = options[(index - 1 + options.length) % options.length];
  else if (event.key === nextKey) target = options[(index + 1) % options.length];
  else if (event.key === 'Home') target = options[0];
  else if (event.key === 'End') target = options.at(-1);
  if (!target) return;
  event.preventDefault();
  target.focus();
  const nextValue = target.dataset.value;
  if (nextValue !== undefined) onChange?.(nextValue, event);
}

export const SegmentedControl = defineMolecule(
  renderSegmentedControl,
  'SegmentedControl',
  [segmentedControlStyleDependency],
);
