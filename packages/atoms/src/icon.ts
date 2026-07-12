import { defineAtom, html, isTemplateResult, mergeProps, svg, type TemplateResult } from '@gluonjs/core';
import type { QuarkAriaProps, QuarkProps } from '@gluonjs/quarks';

export type IconName = 'trend-up' | 'trend-down' | 'alert' | 'spark';

export interface IconDefinition<Name extends string = string> {
  readonly name: Name;
  readonly viewBox: string;
  readonly body: TemplateResult;
}

export type IconAttributes = Omit<
  QuarkProps<SVGSVGElement>,
  | 'children'
  | 'role'
  | '.role'
  | 'aria'
  | 'aria-hidden'
  | 'aria-label'
  | 'ariaHidden'
  | '.ariaHidden'
  | 'ariaLabel'
  | '.ariaLabel'
  | 'width'
  | '.width'
  | 'height'
  | '.height'
  | 'viewBox'
  | '.viewBox'
> & {
  readonly aria?: Omit<QuarkAriaProps, 'hidden' | 'label'>;
};

interface IconCommonProps {
  readonly size?: number;
  readonly label?: string;
  readonly attributes?: IconAttributes;
}

export type IconProps = IconCommonProps & (
  | { readonly name: IconName; readonly icon?: never }
  | { readonly name?: never; readonly icon: IconDefinition }
);

export function defineIcon<const Name extends string>(
  definition: IconDefinition<Name>,
): Readonly<IconDefinition<Name>> {
  if (!definition.name.trim()) throw new TypeError('Icon definition name cannot be empty.');
  if (!definition.viewBox.trim()) throw new TypeError('Icon definition viewBox cannot be empty.');
  if (!isTemplateResult(definition.body) || definition.body.type !== 'svg') {
    throw new TypeError('Icon definition body must be created with the svg template tag.');
  }
  return Object.freeze({ ...definition });
}

function renderIcon({ name, icon, size = 18, label, attributes = {} }: IconProps): TemplateResult {
  const definition = icon ?? builtInIcon(name as IconName);
  const { aria, ...nativeAttributes } = attributes;
  const svgAttributes = mergeProps({
    class: { gluon: true, atom: true, 'gluon-icon': true },
  }, nativeAttributes);
  Object.assign(svgAttributes, {
    width: size,
    height: size,
    viewBox: definition.viewBox,
    fill: 'none',
    role: label ? 'img' : null,
    aria: label
      ? { ...aria, label }
      : { ...aria, hidden: true },
  });

  return html`<svg ...=${svgAttributes}>${definition.body}</svg>`;
}

function builtInIcon(name: IconName): IconDefinition<IconName> {
  switch (name) {
    case 'trend-up':
      return { name, viewBox: '0 0 24 24', body: svg`<path d="M5 16l6-6 4 4 6-8" stroke="currentColor" stroke-width="2" fill="none"></path>` };
    case 'trend-down':
      return { name, viewBox: '0 0 24 24', body: svg`<path d="M5 8l6 6 4-4 6 8" stroke="currentColor" stroke-width="2" fill="none"></path>` };
    case 'alert':
      return { name, viewBox: '0 0 24 24', body: svg`<path d="M12 3l9 16H3l9-16zm0 6v4m0 4h.01" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"></path>` };
    case 'spark':
      return { name, viewBox: '0 0 24 24', body: svg`<path d="M3 13l4-4 3 3 4-6 5 9" stroke="currentColor" stroke-width="2" fill="none"></path>` };
  }
}

export const Icon = defineAtom(renderIcon, 'Icon');
