import {
  defineAtom,
  mergeProps,
  type TemplateResult,
  type TemplateValue,
} from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps {
  readonly children?: TemplateValue;
  readonly label?: string;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly disabled?: boolean;
  readonly onClick?: (event: MouseEvent) => void;
  readonly attributes?: QuarkProps<HTMLButtonElement>;
}

function renderButton({
  children,
  label,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onClick,
  attributes = {},
}: ButtonProps): TemplateResult {
  return q.button(mergeProps({
    children: children ?? label ?? '',
    class: {
      gluon: true,
      atom: true,
      'gluon-button': true,
      [`is-${variant}`]: true,
      [`is-${size}`]: true,
    },
    type: 'button',
    '?disabled': disabled,
    onClick: onClick as EventListener | undefined,
  }, attributes));
}

export const Button = defineAtom(renderButton, 'Button');
