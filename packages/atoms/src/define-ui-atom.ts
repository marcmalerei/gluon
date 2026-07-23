import {
  createComponentStyleDependency,
  defineAtom,
  mergeProps,
  type Component,
  type ComponentStyleDependency,
  type TemplateValue,
} from '@gluonjs/core';
import {
  quark,
  type QuarkProps,
} from '@gluonjs/quarks';

type NativeTagName = keyof HTMLElementTagNameMap;
type NativeElement<TagName extends NativeTagName> = HTMLElementTagNameMap[TagName];

export interface UiAtomBaseProps {
  readonly children?: TemplateValue;
}

export interface LooseUiAtomProps {
  readonly slot?: {
    readonly content?: TemplateValue;
  };
}

export interface UiAtomStyleOptions {
  /** Stable transport and ownership identity for this component stylesheet. */
  readonly id: string;
  readonly sheet: CSSStyleSheet;
  /** Stable order inside the Atom cascade layer. Defaults to 100. */
  readonly order?: number;
  readonly scope?: string;
}

export interface DefineUiAtomOptions<
  Props extends object,
  TagName extends NativeTagName,
> {
  readonly displayName: string;
  readonly tag: TagName | ((props: Readonly<Props>) => TagName);
  readonly defaults?: Partial<Props>;
  /**
   * Maps the single public props object to native bindings when the component
   * owns semantic props that must not be forwarded to the platform element.
   * Omit this for line-neutral native wrappers.
   */
  readonly nativeProps?: (
    props: Readonly<Props>,
    tag: TagName,
  ) => QuarkProps<NativeElement<TagName>>;
  /**
   * Accepts legacy `slot.content` as children during incremental migrations.
   * Ordinary `children` always wins when both forms are present.
   */
  readonly loose?: boolean;
  /** Creates Atom-owned style metadata without manual dependency plumbing. */
  readonly style?: UiAtomStyleOptions;
}

export type UiAtomProps<
  Props extends object,
  TagName extends NativeTagName,
> = Props
  & Omit<QuarkProps<NativeElement<TagName>>, keyof Props | 'slot'>
  & LooseUiAtomProps;

/**
 * Defines a concise presentational Atom over a native element.
 *
 * The returned component accepts one props object, selects a fixed or
 * props-driven native tag, and optionally owns one constructable stylesheet.
 * Stateful behavior and advanced composition remain explicit `defineAtom()`
 * and `q.*()` concerns.
 */
export function defineUiAtom<
  Props extends object,
  TagName extends NativeTagName,
>(
  options: DefineUiAtomOptions<Props, TagName>,
): Component<UiAtomProps<Props, TagName>> {
  const styles = styleDependencies(options);
  return defineAtom((input: UiAtomProps<Props, TagName>) => {
    const props = mergeProps(
      options.defaults ?? {},
      input,
    ) as UiAtomProps<Props, TagName>;
    const tag = typeof options.tag === 'function'
      ? options.tag(props)
      : options.tag;
    const native = options.nativeProps
      ? options.nativeProps(props, tag)
      : defaultNativeProps(props, options.loose ?? false);
    return quark(tag)(native as never);
  }, options.displayName, styles);
}

function defaultNativeProps<
  Props extends object,
  TagName extends NativeTagName,
>(
  props: UiAtomProps<Props, TagName>,
  loose: boolean,
): QuarkProps<NativeElement<TagName>> {
  const { slot, ...native } = props as UiAtomBaseProps
    & LooseUiAtomProps
    & Readonly<Record<string, unknown>>;
  if (!loose && slot !== undefined) {
    throw new TypeError(
      'slot.content requires defineUiAtom({ loose: true }); use children in strict mode.',
    );
  }
  return {
    ...native,
    children: native.children ?? slot?.content,
  } as unknown as QuarkProps<NativeElement<TagName>>;
}

function styleDependencies<
  Props extends object,
  TagName extends NativeTagName,
>(
  options: DefineUiAtomOptions<Props, TagName>,
): readonly ComponentStyleDependency[] {
  if (!options.style) return [];
  return [createComponentStyleDependency({
    id: options.style.id,
    sheet: options.style.sheet,
    layer: 'atom',
    order: options.style.order ?? 100,
    ...(options.style.scope ? { scope: options.style.scope } : {}),
  })];
}
