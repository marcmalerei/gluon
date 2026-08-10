import { defineAtom, mergeProps, type Component, type TemplateResult } from '@gluonjs/core';
import {
  Button,
  type ButtonAttributes,
  type ButtonPresetOptions,
  type ButtonProps,
} from './button.js';
import { toggleButtonStyleDependency } from './toggle-button-styles.js';

export type ToggleButtonAttributes = Omit<
  ButtonAttributes,
  'aria' | 'aria-pressed' | 'ariaPressed' | '.ariaPressed'
> & {
  readonly aria?: Omit<NonNullable<ButtonAttributes['aria']>, 'pressed'>;
};

export interface ToggleButtonProps extends Omit<ButtonProps, 'attributes'> {
  readonly pressed: boolean;
  readonly attributes?: ToggleButtonAttributes;
}

export interface ToggleButtonPresetOptions extends Omit<ButtonPresetOptions, 'attributes'> {
  readonly attributes?: ToggleButtonAttributes;
}

function renderToggleButton({
  pressed,
  attributes = {},
  ...button
}: ToggleButtonProps): TemplateResult {
  const { aria, ...nativeAttributes } = attributes;
  return Button({
    ...button,
    attributes: mergeProps({
      class: { 'gluon-toggle-button': true },
      aria: { ...aria, pressed },
    }, nativeAttributes),
  });
}

export const ToggleButton = defineAtom(renderToggleButton, 'ToggleButton', [toggleButtonStyleDependency]);

export function defineToggleButtonPreset(options: ToggleButtonPresetOptions): Component<ToggleButtonProps> {
  return defineAtom((props: ToggleButtonProps): TemplateResult => ToggleButton({
    ...props,
    variant: props.variant ?? options.variant,
    size: props.size ?? options.size,
    type: props.type ?? options.type,
    attributes: mergeProps(mergeProps({
      class: options.class,
      style: options.style,
    }, options.attributes ?? {}), props.attributes ?? {}),
  }), options.displayName);
}
