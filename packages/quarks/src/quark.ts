import {
  TemplateResult,
  mergeProps,
  nothing,
  type ClassValue,
  type StyleValue,
  type TemplateValue,
} from '@gluonjs/core';

export type QuarkRef<ElementType extends Element = Element> =
  | { value?: ElementType }
  | ((element: ElementType | undefined) => void);

export type AriaAttributeName =
  | 'activedescendant'
  | 'atomic'
  | 'autocomplete'
  | 'braillelabel'
  | 'brailleroledescription'
  | 'busy'
  | 'checked'
  | 'colcount'
  | 'colindex'
  | 'colindextext'
  | 'colspan'
  | 'controls'
  | 'current'
  | 'describedby'
  | 'description'
  | 'details'
  | 'disabled'
  | 'dropeffect'
  | 'errormessage'
  | 'expanded'
  | 'flowto'
  | 'grabbed'
  | 'haspopup'
  | 'hidden'
  | 'invalid'
  | 'keyshortcuts'
  | 'label'
  | 'labelledby'
  | 'level'
  | 'live'
  | 'modal'
  | 'multiline'
  | 'multiselectable'
  | 'orientation'
  | 'owns'
  | 'placeholder'
  | 'posinset'
  | 'pressed'
  | 'readonly'
  | 'relevant'
  | 'required'
  | 'roledescription'
  | 'rowcount'
  | 'rowindex'
  | 'rowindextext'
  | 'rowspan'
  | 'selected'
  | 'setsize'
  | 'sort'
  | 'valuemax'
  | 'valuemin'
  | 'valuenow'
  | 'valuetext';

export type QuarkAttributeValue = string | number | boolean | null | undefined;

export type QuarkAriaProps = Readonly<Partial<Record<AriaAttributeName, QuarkAttributeValue>>>;

export type QuarkDataProps = Readonly<Record<string, QuarkAttributeValue>>;

export interface QuarkCommonProps<ElementType extends Element = HTMLElement> {
  readonly children?: TemplateValue;
  readonly class?: ClassValue;
  readonly className?: ClassValue;
  readonly style?: StyleValue;
  readonly id?: string;
  readonly title?: string;
  readonly role?: string;
  readonly slot?: string;
  readonly part?: string;
  readonly hidden?: boolean;
  readonly tabIndex?: number;
  readonly aria?: QuarkAriaProps;
  readonly data?: QuarkDataProps;
  readonly dataset?: QuarkDataProps;
  readonly ref?: QuarkRef<ElementType>;
}

type ScalarPropertyKey<ElementType extends Element> = {
  [Key in keyof ElementType]-?: Key extends string
    ? Exclude<ElementType[Key], null | undefined> extends string | number | boolean
      ? Key
      : never
    : never;
}[keyof ElementType];

type BooleanPropertyKey<ElementType extends Element> = {
  [Key in keyof ElementType]-?: Key extends string
    ? Exclude<ElementType[Key], null | undefined> extends boolean
      ? Key
      : never
    : never;
}[keyof ElementType];

type NativeScalarProps<ElementType extends Element> = Readonly<Partial<Pick<
  ElementType,
  Exclude<ScalarPropertyKey<ElementType>, keyof QuarkCommonProps<ElementType>>
>>>;

type ExplicitPropertyBindings<ElementType extends Element> = {
  readonly [Key in Extract<keyof ElementType, string> as `.${Key}`]?: ElementType[Key];
};

type ExplicitBooleanBindings<ElementType extends Element> = {
  readonly [Key in BooleanPropertyKey<ElementType> as `?${Key}`]?: boolean | null | undefined;
};

type QuarkEventListener<EventType extends Event = Event> =
  | ((event: EventType) => unknown)
  | { handleEvent(event: EventType): void }
  | null
  | undefined;

type ExplicitEventBindings = {
  readonly [name: `@${string}`]: QuarkEventListener;
};

interface FriendlyEventBindings {
  readonly onAnimationCancel?: QuarkEventListener<AnimationEvent>;
  readonly onAnimationEnd?: QuarkEventListener<AnimationEvent>;
  readonly onAnimationIteration?: QuarkEventListener<AnimationEvent>;
  readonly onAnimationStart?: QuarkEventListener<AnimationEvent>;
  readonly onBeforeInput?: QuarkEventListener<InputEvent>;
  readonly onBlur?: QuarkEventListener<FocusEvent>;
  readonly onChange?: QuarkEventListener<Event>;
  readonly onClick?: QuarkEventListener<MouseEvent>;
  readonly onContextMenu?: QuarkEventListener<MouseEvent>;
  readonly onDblClick?: QuarkEventListener<MouseEvent>;
  readonly onFocus?: QuarkEventListener<FocusEvent>;
  readonly onFocusIn?: QuarkEventListener<FocusEvent>;
  readonly onFocusOut?: QuarkEventListener<FocusEvent>;
  readonly onInput?: QuarkEventListener<InputEvent>;
  readonly onKeydown?: QuarkEventListener<KeyboardEvent>;
  readonly onKeyup?: QuarkEventListener<KeyboardEvent>;
  readonly onPointerCancel?: QuarkEventListener<PointerEvent>;
  readonly onPointerDown?: QuarkEventListener<PointerEvent>;
  readonly onPointerEnter?: QuarkEventListener<PointerEvent>;
  readonly onPointerLeave?: QuarkEventListener<PointerEvent>;
  readonly onPointerMove?: QuarkEventListener<PointerEvent>;
  readonly onPointerOut?: QuarkEventListener<PointerEvent>;
  readonly onPointerOver?: QuarkEventListener<PointerEvent>;
  readonly onPointerUp?: QuarkEventListener<PointerEvent>;
  readonly onSubmit?: QuarkEventListener<SubmitEvent>;
  readonly onTransitionCancel?: QuarkEventListener<TransitionEvent>;
  readonly onTransitionEnd?: QuarkEventListener<TransitionEvent>;
  readonly onTransitionRun?: QuarkEventListener<TransitionEvent>;
  readonly onTransitionStart?: QuarkEventListener<TransitionEvent>;
}

type DirectAriaBindings = {
  readonly [Name in AriaAttributeName as `aria-${Name}`]?: QuarkAttributeValue;
};

type DirectDataBindings = {
  readonly [name: `data-${string}`]: QuarkAttributeValue;
};

type NativeAttributeAliases<ElementType extends Element> = {
  readonly accesskey?: string;
  readonly contenteditable?: string | boolean;
  readonly tabindex?: number;
} & (ElementType extends HTMLButtonElement ? {
  readonly formaction?: string;
  readonly formenctype?: string;
  readonly formmethod?: string;
  readonly formnovalidate?: boolean;
  readonly formtarget?: string;
  readonly popovertarget?: string;
  readonly popovertargetaction?: 'hide' | 'show' | 'toggle';
} : {}) & (ElementType extends HTMLInputElement ? {
  readonly formaction?: string;
  readonly formenctype?: string;
  readonly formmethod?: string;
  readonly formnovalidate?: boolean;
  readonly formtarget?: string;
  readonly readonly?: boolean;
} : {}) & (ElementType extends HTMLLabelElement ? {
  readonly for?: string;
} : {}) & (ElementType extends HTMLTextAreaElement ? {
  readonly readonly?: boolean;
} : {}) & (ElementType extends HTMLTableCellElement ? {
  readonly colspan?: number;
  readonly rowspan?: number;
} : {});

export type QuarkProps<ElementType extends Element = HTMLElement> =
  & QuarkCommonProps<ElementType>
  & NativeScalarProps<ElementType>
  & ExplicitPropertyBindings<ElementType>
  & ExplicitBooleanBindings<ElementType>
  & ExplicitEventBindings
  & FriendlyEventBindings
  & DirectAriaBindings
  & DirectDataBindings
  & NativeAttributeAliases<ElementType>;

declare const unsafeQuarkPropsBrand: unique symbol;

export type UnsafeQuarkProps<ElementType extends Element = HTMLElement> =
  & QuarkProps<ElementType>
  & Readonly<Record<string, unknown>>
  & { readonly [unsafeQuarkPropsBrand]: true };

/**
 * Explicitly opts out of native key checking for a reviewed platform or vendor
 * extension. Values still use the ordinary spread runtime without validation.
 */
export function unsafeQuarkProps<ElementType extends Element = HTMLElement>(
  props: Readonly<Record<string, unknown>>,
): UnsafeQuarkProps<ElementType> {
  return props as UnsafeQuarkProps<ElementType>;
}

export interface QuarkFactory<
  TagName extends string,
  ElementType extends Element = HTMLElement,
> {
  (props?: QuarkProps<ElementType>): TemplateResult;
  readonly tagName: TagName;
  readonly layer: 'quark';
}

export type QuarkMap = {
  readonly [TagName in keyof HTMLElementTagNameMap]: QuarkFactory<
    TagName,
    HTMLElementTagNameMap[TagName]
  >;
};

export const htmlTagNames = [
  'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base',
  'bdi', 'bdo', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption',
  'cite', 'code', 'col', 'colgroup', 'data', 'datalist', 'dd', 'del',
  'details', 'dfn', 'dialog', 'div', 'dl', 'dt', 'em', 'embed', 'fieldset',
  'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5',
  'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i', 'iframe', 'img',
  'input', 'ins', 'kbd', 'label', 'legend', 'li', 'link', 'main', 'map',
  'mark', 'menu', 'meta', 'meter', 'nav', 'noscript', 'object', 'ol',
  'optgroup', 'option', 'output', 'p', 'picture', 'pre', 'progress', 'q',
  'rp', 'rt', 'ruby', 's', 'samp', 'script', 'search', 'section', 'select',
  'slot', 'small', 'source', 'span', 'strong', 'style', 'sub', 'summary',
  'sup', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th',
  'thead', 'time', 'title', 'tr', 'track', 'u', 'ul', 'var', 'video', 'wbr',
] as const satisfies readonly (keyof HTMLElementTagNameMap)[];

const voidTags = new Set<string>([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'source', 'track', 'wbr',
]);
const quarkCache = new Map<string, QuarkFactory<string, Element>>();

type ElementFor<TagName extends string> = TagName extends keyof HTMLElementTagNameMap
  ? HTMLElementTagNameMap[TagName]
  : HTMLElement;

export function quark<TagName extends string>(
  tagName: TagName,
): QuarkFactory<TagName, ElementFor<TagName>> {
  if (!/^[a-z][a-z0-9-]*$/.test(tagName)) {
    throw new TypeError(`Invalid quark tag name: "${tagName}".`);
  }

  const cached = quarkCache.get(tagName);
  if (cached) return cached as unknown as QuarkFactory<TagName, ElementFor<TagName>>;

  const isVoid = voidTags.has(tagName);
  const strings = createQuarkStrings(tagName, isVoid);
  const factory = ((props: QuarkProps<Element> = {}) => {
    const { children, ...attributes } = props;
    if (isVoid && children != null && children !== false && children !== nothing) {
      throw new TypeError(`Void quark <${tagName}> cannot receive children.`);
    }

    const merged = mergeProps(
      { class: { gluon: true, quark: true } },
      attributes,
    );
    return new TemplateResult(
      strings,
      isVoid ? [merged] : [merged, children ?? nothing],
    );
  }) as QuarkFactory<string, Element>;

  Object.defineProperties(factory, {
    tagName: { enumerable: true, value: tagName },
    layer: { enumerable: true, value: 'quark' },
  });
  quarkCache.set(tagName, factory);
  return factory as unknown as QuarkFactory<TagName, ElementFor<TagName>>;
}

export const q = new Proxy(Object.create(null) as QuarkMap, {
  get(_target, property: string | symbol) {
    if (typeof property !== 'string' || property === 'then' || property === 'toJSON') {
      return undefined;
    }
    return quark(property as keyof HTMLElementTagNameMap);
  },
});

export function fragment(children: TemplateValue = nothing): TemplateResult {
  return new TemplateResult(createFragmentStrings(), [children]);
}

let fragmentStrings: TemplateStringsArray | undefined;

function createFragmentStrings(): TemplateStringsArray {
  if (fragmentStrings) return fragmentStrings;
  fragmentStrings = createTemplateStrings(['', '']);
  return fragmentStrings;
}

function createQuarkStrings(tagName: string, isVoid: boolean): TemplateStringsArray {
  return isVoid
    ? createTemplateStrings([`<${tagName} ...=`, '>'])
    : createTemplateStrings([`<${tagName} ...=`, '>', `</${tagName}>`]);
}

function createTemplateStrings(parts: readonly string[]): TemplateStringsArray {
  const cooked = [...parts] as unknown as TemplateStringsArray;
  const raw = Object.freeze([...parts]);
  Object.defineProperty(cooked, 'raw', { value: raw });
  return Object.freeze(cooked);
}
