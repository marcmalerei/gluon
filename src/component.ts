import { html, nothing, type TemplateResult, type TemplateValue } from './runtime.js';
import type { ComponentStyleDependency } from './styles/index.js';

export type ComponentLayer = 'atom' | 'molecule' | 'organism';

export interface Component<Props = Record<string, never>> {
  (props: Props): TemplateResult;
  readonly layer: ComponentLayer;
  readonly displayName: string;
  /** Exact immutable styles retained when this component result is rendered. */
  readonly styles: readonly ComponentStyleDependency[];
}

export type ScopedSlot<Props = Record<string, never>> = (
  props: Readonly<Props>,
) => TemplateValue;

/** Props supplied before the template body becomes the component's children. */
export type CompositionProps<Props> = Omit<Props, 'children'>;

/** A native tagged-template boundary that evaluates to the component result. */
export interface ComponentTemplateTag<Result extends TemplateValue = TemplateValue> {
  (strings: TemplateStringsArray, ...values: TemplateValue[]): Result;
}

/**
 * Binds typed functional-component props to an `html` template body.
 *
 * The body is passed as `children` in one ordinary function call. No component
 * instance, host node, lifecycle, context, event system, or renderer is added.
 */
export function compose<Props extends { readonly children?: TemplateValue }, Result extends TemplateValue>(
  component: (props: Readonly<Props>) => Result,
  props: CompositionProps<Props>,
): ComponentTemplateTag<Result> {
  return (strings, ...values) => component({
    ...props,
    children: html(strings, ...values),
  } as unknown as Readonly<Props>);
}

export function renderScopedSlot<Props>(
  slot: ScopedSlot<Props> | undefined,
  props: Readonly<Props>,
  fallback: TemplateValue = nothing,
): TemplateValue {
  return slot ? slot(props) : fallback;
}

function defineComponent<Props>(
  layer: ComponentLayer,
  render: (props: Props) => TemplateResult,
  displayName = render.name || 'AnonymousComponent',
  styles: readonly ComponentStyleDependency[] = [],
): Component<Props> {
  const retainedStyles = Object.freeze([...styles]);
  for (const dependency of retainedStyles) {
    if (dependency.layer !== layer) {
      throw new TypeError(
        `${displayName} declares ${dependency.id} in the ${dependency.layer} layer instead of ${layer}.`,
      );
    }
  }
  const component = ((props: Props) => {
    const result = render(props);
    return retainedStyles.length === 0
      ? result
      : result.withStyleDependencies(retainedStyles);
  }) as Component<Props>;
  Object.defineProperties(component, {
    layer: { configurable: false, enumerable: true, value: layer },
    displayName: { configurable: false, enumerable: true, value: displayName },
    styles: { configurable: false, enumerable: true, value: retainedStyles },
  });
  return component;
}

/**
 * Adds immutable `layer: 'atom'` and `displayName` metadata to a stateless
 * render function. It does not add lifecycle, registration, styling, prop
 * validation, accessibility semantics, state ownership, or cleanup.
 */
export function defineAtom<Props>(
  render: (props: Props) => TemplateResult,
  displayName?: string,
  styles?: readonly ComponentStyleDependency[],
): Component<Props> {
  return defineComponent('atom', render, displayName, styles);
}

/**
 * Adds immutable `layer: 'molecule'` and `displayName` metadata to a stateless
 * render function. It does not add lifecycle, registration, styling, prop
 * validation, accessibility semantics, state ownership, or cleanup.
 */
export function defineMolecule<Props>(
  render: (props: Props) => TemplateResult,
  displayName?: string,
  styles?: readonly ComponentStyleDependency[],
): Component<Props> {
  return defineComponent('molecule', render, displayName, styles);
}

/**
 * Adds immutable `layer: 'organism'` and `displayName` metadata to a stateless
 * render function. It does not add lifecycle, registration, styling, prop
 * validation, accessibility semantics, state ownership, or cleanup.
 */
export function defineOrganism<Props>(
  render: (props: Props) => TemplateResult,
  displayName?: string,
  styles?: readonly ComponentStyleDependency[],
): Component<Props> {
  return defineComponent('organism', render, displayName, styles);
}
