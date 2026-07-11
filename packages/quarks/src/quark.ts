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
  readonly aria?: Readonly<Record<string, string | number | boolean | null | undefined>>;
  readonly data?: Readonly<Record<string, string | number | boolean | null | undefined>>;
  readonly dataset?: Readonly<Record<string, string | number | boolean | null | undefined>>;
  readonly ref?: QuarkRef<ElementType>;
}

type ExplicitBindings = {
  readonly [name: `.${string}`]: unknown;
} & {
  readonly [name: `?${string}`]: boolean | null | undefined;
} & {
  readonly [name: `@${string}`]: EventListenerOrEventListenerObject | null | undefined;
} & {
  readonly [name: `on${string}`]: EventListenerOrEventListenerObject | null | undefined;
};

export type QuarkProps<ElementType extends Element = HTMLElement> =
  & QuarkCommonProps<ElementType>
  & Partial<ExplicitBindings>
  & Readonly<Record<string, unknown>>;

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
