import type { QuarkProps } from '@gluonjs/quarks';

export const visuallyHiddenClass = 'gluon-visually-hidden' as const;
export const focusRingClass = 'gluon-focus-ring' as const;

/** Adds the class used to visually hide content while preserving its semantics. */
export function visuallyHiddenAttributes<ElementType extends HTMLElement>(
  attributes?: QuarkProps<ElementType>,
): QuarkProps<ElementType> {
  const input = attributes ?? {} as QuarkProps<ElementType>;
  return {
    ...input,
    class: [{ [visuallyHiddenClass]: true }, input.class],
  } as QuarkProps<ElementType>;
}

/** Adds the token-backed :focus-visible ring utility to native controls. */
export function focusRingAttributes<ElementType extends HTMLElement>(
  attributes?: QuarkProps<ElementType>,
): QuarkProps<ElementType> {
  const input = attributes ?? {} as QuarkProps<ElementType>;
  return {
    ...input,
    class: [{ [focusRingClass]: true }, input.class],
  } as QuarkProps<ElementType>;
}
