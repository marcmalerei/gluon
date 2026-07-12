import {
  defineAtom,
  mergeProps,
  type ClassValue,
  type Component,
  type StyleValue,
  type TemplateResult,
  type TemplateValue,
} from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { buttonStyleDependency } from './button-styles.js';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

export type ButtonAttributes = Omit<
  QuarkProps<HTMLButtonElement>,
  'children' | 'type' | '.type' | 'disabled' | '.disabled' | '?disabled'
>;

export interface ButtonProps {
  readonly children?: TemplateValue;
  readonly label?: string;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly type?: 'button' | 'submit' | 'reset';
  readonly disabled?: boolean;
  readonly onClick?: (event: MouseEvent) => void;
  readonly attributes?: ButtonAttributes;
}

export interface ButtonPresetOptions {
  readonly displayName: string;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly type?: 'button' | 'submit' | 'reset';
  readonly class?: ClassValue;
  readonly style?: StyleValue;
  readonly attributes?: ButtonAttributes;
}

function renderButton({
  children,
  label,
  variant = 'primary',
  size = 'medium',
  type = 'button',
  disabled = false,
  onClick,
  attributes = {},
}: ButtonProps): TemplateResult {
  const { onClick: attributeClick, ...nativeAttributes } = attributes;
  const merged = mergeProps({
    children: children ?? label ?? '',
    class: {
      gluon: true,
      atom: true,
      'gluon-button': true,
      [`is-${variant}`]: true,
      [`is-${size}`]: true,
    },
  }, nativeAttributes);
  Object.assign(merged, {
    children: children ?? label ?? '',
    type,
    '?disabled': disabled,
    onClick: (event: MouseEvent): void => {
      callListener(attributeClick, event);
      if (!event.defaultPrevented) onClick?.(event);
    },
  });
  return q.button(merged as QuarkProps<HTMLButtonElement>);
}

export const Button = defineAtom(renderButton, 'Button', [buttonStyleDependency]);

export function defineButtonPreset(options: ButtonPresetOptions): Component<ButtonProps> {
  const presetAttributes = mergeProps({
    class: options.class,
    style: options.style,
  }, options.attributes ?? {});

  return defineAtom((props: ButtonProps): TemplateResult => {
    const attributes = mergeButtonAttributes(presetAttributes, props.attributes ?? {});
    return Button({
      ...props,
      variant: props.variant ?? options.variant,
      size: props.size ?? options.size,
      type: props.type ?? options.type,
      attributes,
    });
  }, options.displayName);
}

function mergeButtonAttributes(
  defaults: ButtonAttributes,
  overrides: ButtonAttributes,
): ButtonAttributes {
  const merged = mergeProps(defaults, overrides);
  const { data: _data, dataset: _dataset, ...native } = merged;
  const onClick = defaults.onClick && overrides.onClick
    ? (event: MouseEvent): void => {
        callListener(defaults.onClick, event);
        if (!event.defaultPrevented) callListener(overrides.onClick, event);
      }
    : overrides.onClick ?? defaults.onClick;
  return {
    ...native,
    onClick,
    ...(defaults.aria || overrides.aria
      ? { aria: { ...defaults.aria, ...overrides.aria } }
      : {}),
    ...(defaults.data || defaults.dataset || overrides.data || overrides.dataset
      ? {
          data: {
            ...defaults.data,
            ...defaults.dataset,
            ...overrides.data,
            ...overrides.dataset,
          },
        }
      : {}),
  };
}

function callListener(
  listener: ButtonAttributes['onClick'],
  event: MouseEvent,
): void {
  if (typeof listener === 'function') listener(event);
  else listener?.handleEvent(event);
}
