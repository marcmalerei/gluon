import { defineMolecule, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { buttonGroupStyleDependency } from './button-group-styles.js';

export type ButtonGroupOrientation = 'horizontal' | 'vertical';
export type ButtonGroupPresentation = 'spaced' | 'attached';
export type ButtonGroupAccessibleName =
  | { readonly label: string; readonly labelledBy?: never }
  | { readonly label?: never; readonly labelledBy: string };

export type ButtonGroupAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'role' | '.role' | 'aria'> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLDivElement>['aria']>, 'label' | 'labelledby'>;
};

export type ButtonGroupProps = ButtonGroupAccessibleName & {
  readonly children: TemplateValue;
  readonly orientation?: ButtonGroupOrientation;
  readonly presentation?: ButtonGroupPresentation;
  readonly wrap?: boolean;
  readonly attributes?: ButtonGroupAttributes;
};

function renderButtonGroup({
  children,
  label,
  labelledBy,
  orientation = 'horizontal',
  presentation = 'spaced',
  wrap = true,
  attributes = {},
}: ButtonGroupProps): TemplateResult {
  const { aria, ...nativeAttributes } = attributes;
  return q.div({
    ...nativeAttributes,
    role: 'group',
    class: [{
      gluon: true,
      molecule: true,
      'gluon-button-group': true,
      [`is-${orientation}`]: true,
      [`is-${presentation}`]: true,
      'can-wrap': wrap,
    }, attributes.class],
    data: { ...attributes.data, orientation, presentation },
    aria: { ...aria, label, labelledby: labelledBy },
    children,
  });
}

export const ButtonGroup = defineMolecule(renderButtonGroup, 'ButtonGroup', [buttonGroupStyleDependency]);
