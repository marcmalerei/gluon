import { defineAtom, mergeProps, type TemplateResult } from '@gluonjs/core';
import { q, type QuarkProps, type QuarkRef } from '@gluonjs/quarks';
import { sliderStyleDependency } from './slider-styles.js';

export type SliderOrientation = 'horizontal' | 'vertical';

export interface NormalizedSliderRange {
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

export type SliderAttributes = Omit<
  QuarkProps<HTMLInputElement>,
  | 'children' | 'type'
  | 'value' | '.value' | 'defaultValue' | '.defaultValue'
  | 'min' | '.min' | 'max' | '.max' | 'step' | '.step'
  | 'disabled' | '.disabled' | '?disabled'
  | 'readonly' | '.readOnly'
  | 'aria' | 'aria-orientation' | 'aria-valuetext'
  | 'onInput' | 'onChange' | 'onKeydown' | 'onPointerDown' | 'onClick'
> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLInputElement>['aria']>, 'orientation' | 'readonly' | 'valuetext'>;
};

interface SliderBaseProps {
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly orientation?: SliderOrientation;
  readonly disabled?: boolean;
  readonly readonly?: boolean;
  readonly valueText?: string;
  readonly onInput?: (event: InputEvent) => void;
  readonly onChange?: (event: Event) => void;
  readonly attributes?: SliderAttributes;
}

export type SliderProps = SliderBaseProps & (
  | { readonly value: number; readonly defaultValue?: never }
  | { readonly value?: undefined; readonly defaultValue?: number }
);

const sliderState = new WeakMap<HTMLInputElement, { current: string }>();
const modifyingKeys = new Set(['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'End', 'Home', 'PageDown', 'PageUp']);

function finiteOr(value: number | undefined, fallback: number): number {
  return value === undefined || !Number.isFinite(value) ? fallback : value;
}

function decimalPlaces(value: number): number {
  const [coefficient = '', exponentText] = String(value).toLowerCase().split('e');
  const fraction = coefficient.split('.')[1]?.length ?? 0;
  const exponent = exponentText === undefined ? 0 : Number(exponentText);
  return Math.max(0, fraction - exponent);
}

/** Normalizes invalid bounds to finite native-range values. `max < min` collapses to `min`; a non-positive/non-finite step becomes `1`. */
export function normalizeSliderRange(min?: number, max?: number, step?: number): NormalizedSliderRange {
  const normalizedMin = finiteOr(min, 0);
  const finiteMax = finiteOr(max, 100);
  return {
    min: normalizedMin,
    max: Math.max(normalizedMin, finiteMax),
    step: step !== undefined && Number.isFinite(step) && step > 0 ? step : 1,
  };
}

/** Clamps a finite value and aligns it to the nearest step rooted at `min`; non-finite values use `fallback`. */
export function normalizeSliderValue(value: number | undefined, range: NormalizedSliderRange, fallback = range.min): number {
  const candidate = Math.min(range.max, Math.max(range.min, finiteOr(value, finiteOr(fallback, range.min))));
  if (range.min === range.max) return range.min;
  const precision = Math.max(decimalPlaces(range.min), decimalPlaces(range.max), decimalPlaces(range.step), decimalPlaces(candidate));
  const scale = 10 ** Math.min(12, precision);
  const minInteger = Math.round(range.min * scale);
  const maxInteger = Math.round(range.max * scale);
  const stepInteger = Math.round(range.step * scale);
  const candidateInteger = Math.round(candidate * scale);
  if ([minInteger, maxInteger, stepInteger, candidateInteger].every(Number.isSafeInteger) && stepInteger > 0) {
    const lastStep = Math.floor((maxInteger - minInteger) / stepInteger);
    const selectedStep = Math.min(lastStep, Math.max(0, Math.round((candidateInteger - minInteger) / stepInteger)));
    return (minInteger + selectedStep * stepInteger) / scale;
  }
  const span = range.max - range.min;
  const candidateSteps = (candidate - range.min) / range.step;
  if (!Number.isFinite(span) || !Number.isFinite(candidateSteps)) return range.min;
  const lastStep = Math.floor(span / range.step);
  const selectedStep = Math.min(lastStep, Math.max(0, Math.round(candidateSteps)));
  const aligned = range.min + selectedStep * range.step;
  return Number(Math.min(range.max, Math.max(range.min, aligned)).toPrecision(15));
}

function assignRef(ref: QuarkRef<HTMLInputElement> | undefined, element: HTMLInputElement | undefined): void {
  if (typeof ref === 'function') ref(element);
  else if (ref) ref.value = element;
}

export function renderSlider(props: SliderProps): TemplateResult {
  const {
    value,
    defaultValue,
    min,
    max,
    step,
    orientation = 'horizontal',
    disabled = false,
    readonly = false,
    valueText,
    onInput,
    onChange,
    attributes = {},
  } = props;
  const { aria, ref, ...inputAttributes } = attributes;
  const range = normalizeSliderRange(min, max, step);
  const controlled = value !== undefined;
  const nativeDefault = normalizeSliderValue(defaultValue, range, normalizeSliderValue(range.min / 2 + range.max / 2, range));
  const normalizedValue = normalizeSliderValue(value, range, nativeDefault);
  const renderedValue = String(controlled ? normalizedValue : nativeDefault);
  const restoreReadonlyValue = (target: HTMLInputElement): void => {
    target.value = controlled ? String(normalizedValue) : sliderState.get(target)?.current ?? renderedValue;
  };
  const rejectReadonlyInteraction = (event: Event): boolean => {
    if (!readonly) return false;
    event.preventDefault();
    restoreReadonlyValue(event.currentTarget as HTMLInputElement);
    return true;
  };

  return q.input(mergeProps({
    class: { gluon: true, atom: true, 'gluon-slider': true, [`is-${orientation}`]: true },
    type: 'range',
    min: String(range.min),
    max: String(range.max),
    step: String(range.step),
    ...(controlled ? { '.value': String(normalizedValue) } : { value: String(nativeDefault) }),
    '?disabled': disabled,
    aria: { ...aria, orientation, readonly: readonly || undefined },
    'aria-valuetext': valueText,
    ref: (element: HTMLInputElement | undefined): void => {
      if (element) sliderState.set(element, { current: element.value });
      assignRef(ref, element);
    },
    onInput: (event: InputEvent): void => {
      if (rejectReadonlyInteraction(event)) return;
      sliderState.set(event.currentTarget as HTMLInputElement, { current: (event.currentTarget as HTMLInputElement).value });
      onInput?.(event);
    },
    onChange: (event: Event): void => {
      if (rejectReadonlyInteraction(event)) return;
      sliderState.set(event.currentTarget as HTMLInputElement, { current: (event.currentTarget as HTMLInputElement).value });
      onChange?.(event);
    },
    onKeydown: (event: KeyboardEvent): void => {
      if (readonly && modifyingKeys.has(event.key)) rejectReadonlyInteraction(event);
    },
    onPointerDown: (event: PointerEvent): void => { rejectReadonlyInteraction(event); },
    onClick: (event: MouseEvent): void => { rejectReadonlyInteraction(event); },
  }, inputAttributes) as QuarkProps<HTMLInputElement>);
}

export const Slider = defineAtom(renderSlider, 'Slider', [sliderStyleDependency]);
