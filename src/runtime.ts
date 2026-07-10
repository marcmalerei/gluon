const templateResultBrand = Symbol('gluon.template-result');
const directiveBrand = Symbol('gluon.directive');
const repeatResultBrand = Symbol('gluon.repeat-result');
const unsetValue = Symbol('gluon.unset');

/** Explicitly renders no child content or removes an attribute value. */
export const nothing = Symbol('gluon.nothing');

export type TemplateType = 'html' | 'svg';
export type PrimitiveValue = string | number | bigint | boolean | null | undefined;

export type TemplateValue =
  | PrimitiveValue
  | Node
  | TemplateResult
  | RepeatResult
  | DirectiveValue
  | EventListenerOrEventListenerObject
  | typeof nothing
  | Readonly<Record<string, unknown>>
  | readonly TemplateValue[];

/** A stable primitive identity used by {@link repeat}. */
export type Key = PropertyKey;

export interface KeyedItem {
  readonly key: Key;
  readonly value: TemplateValue;
}

export interface RepeatResult {
  readonly [repeatResultBrand]: true;
  readonly items: readonly KeyedItem[];
}

export class TemplateResult {
  readonly [templateResultBrand] = true;

  constructor(
    readonly strings: TemplateStringsArray,
    readonly values: readonly TemplateValue[],
    readonly type: TemplateType = 'html',
  ) {}
}

export function isTemplateResult(value: unknown): value is TemplateResult {
  return Boolean(
    value
      && typeof value === 'object'
      && templateResultBrand in value,
  );
}

export function html(
  strings: TemplateStringsArray,
  ...values: TemplateValue[]
): TemplateResult {
  return new TemplateResult(strings, values, 'html');
}

/**
 * Creates an SVG template result. Include the root `<svg>` element in the
 * template so the HTML parser establishes the SVG namespace.
 */
export function svg(
  strings: TemplateStringsArray,
  ...values: TemplateValue[]
): TemplateResult {
  return new TemplateResult(strings, values, 'svg');
}

/**
 * Renders an iterable with stable key-based identity.
 *
 * Keys must be non-null strings, numbers, or symbols and unique within one
 * result. Invalid keys throw while the result is created, before render() can
 * mutate the DOM.
 */
export function repeat<Item>(
  items: Iterable<Item>,
  key: (item: Item, index: number) => Key,
  renderItem: (item: Item, index: number) => TemplateValue,
): RepeatResult {
  const keyedItems: KeyedItem[] = [];
  const keys = new Set<Key>();
  let index = 0;

  for (const item of items) {
    const itemKey = key(item, index);
    if (!isKey(itemKey)) {
      throw new TypeError(`repeat() received a missing key at index ${index}.`);
    }
    if (keys.has(itemKey)) {
      throw new Error(`repeat() received the duplicate key ${formatKey(itemKey)} at index ${index}.`);
    }

    keys.add(itemKey);
    keyedItems.push(Object.freeze({
      key: itemKey,
      value: renderItem(item, index),
    }));
    index += 1;
  }

  return Object.freeze({
    [repeatResultBrand]: true as const,
    items: Object.freeze(keyedItems),
  });
}

function isRepeatResult(value: unknown): value is RepeatResult {
  return Boolean(
    value
      && typeof value === 'object'
      && repeatResultBrand in value,
  );
}

export interface PartController {
  setValue(value: TemplateValue): void;
}

interface Part extends PartController {
  disconnect(): void;
}

export type DirectiveRunner = (part: PartController) => void;
export type DirectiveFactory<Args extends readonly unknown[] = readonly unknown[]> = (
  ...args: Args
) => DirectiveRunner;

export interface DirectiveValue {
  readonly [directiveBrand]: DirectiveFactory;
  readonly args: readonly unknown[];
}

export function directive<Args extends readonly unknown[]>(
  factory: DirectiveFactory<Args>,
): (...args: Args) => DirectiveValue {
  return (...args: Args) => ({
    [directiveBrand]: factory as DirectiveFactory,
    args,
  });
}

function isDirectiveValue(value: unknown): value is DirectiveValue {
  return Boolean(
    value
      && typeof value === 'object'
      && directiveBrand in value,
  );
}

type PartDescriptor =
  | { readonly kind: 'node'; readonly index: number; readonly path: readonly number[] }
  | { readonly kind: 'attribute'; readonly index: number; readonly path: readonly number[]; readonly name: string }
  | { readonly kind: 'spread'; readonly index: number; readonly path: readonly number[] };

interface Binding {
  readonly index: number;
  readonly part: Part;
}

interface CompiledTemplate {
  readonly element: HTMLTemplateElement;
  readonly strings: TemplateStringsArray;
  readonly descriptors: readonly PartDescriptor[];
}

interface ChildInstance {
  readonly template: CompiledTemplate;
  readonly bindings: readonly Binding[];
  readonly nodes: readonly Node[];
}

interface KeyedChild {
  readonly key: Key;
  readonly marker: Comment;
  readonly part: NodePart;
}

class NodePart implements Part {
  private nodes: Node[] = [];
  private textNode?: Text;
  private lastPrimitive: PrimitiveValue | typeof unsetValue = unsetValue;
  private child?: ChildInstance;
  private arrayChildren: Array<ChildInstance | undefined> = [];
  private keyedChildren: KeyedChild[] = [];

  constructor(private readonly marker: Comment) {}

  setValue(value: TemplateValue): void {
    if (isEmptyValue(value)) {
      this.resetChildren();
      this.replaceNodes([]);
      return;
    }

    if (isRenderablePrimitive(value) && this.textNode) {
      if (Object.is(value, this.lastPrimitive)) return;
      this.textNode.data = String(value);
      this.lastPrimitive = value;
      return;
    }

    if (Array.isArray(value)) {
      this.setArray(value);
      return;
    }

    if (isRepeatResult(value)) {
      this.setKeyed(value);
      return;
    }

    if (isTemplateResult(value)) {
      this.setTemplate(value);
      return;
    }

    this.resetChildren();

    if (value instanceof Node) {
      this.textNode = undefined;
      this.lastPrimitive = unsetValue;
      this.replaceNodes([value]);
      return;
    }

    const text = document.createTextNode(String(value));
    this.textNode = text;
    this.lastPrimitive = value as PrimitiveValue;
    this.replaceNodes([text]);
  }

  disconnect(): void {
    this.resetChildren();
    this.nodes = [];
    this.textNode = undefined;
    this.lastPrimitive = unsetValue;
  }

  private setTemplate(result: TemplateResult): void {
    this.disconnectArrayChildren();
    this.disconnectKeyedChildren();
    const compiled = getCompiledTemplate(result);

    if (this.child?.template === compiled) {
      applyBindings(this.child.bindings, result.values);
      this.textNode = undefined;
      this.lastPrimitive = unsetValue;
      return;
    }

    if (this.child) disconnectBindings(this.child.bindings);
    this.child = createChildInstance(result, compiled);
    this.textNode = undefined;
    this.lastPrimitive = unsetValue;
    this.replaceNodes([...this.child.nodes]);
  }

  private setArray(values: readonly TemplateValue[]): void {
    if (this.child) {
      disconnectBindings(this.child.bindings);
      this.child = undefined;
    }
    this.disconnectKeyedChildren();

    const flatValues = flattenValues(values);
    const nextNodes: Node[] = [];
    const nextChildren: Array<ChildInstance | undefined> = [];
    const reused = new Set<ChildInstance>();

    for (let index = 0; index < flatValues.length; index += 1) {
      const value = flatValues[index]!;
      if (isEmptyValue(value)) continue;

      if (isTemplateResult(value)) {
        const compiled = getCompiledTemplate(value);
        const cached = this.arrayChildren[index];
        const instance = cached?.template === compiled
          ? cached
          : createChildInstance(value, compiled);

        if (instance === cached) applyBindings(instance.bindings, value.values);
        reused.add(instance);
        nextChildren[index] = instance;
        nextNodes.push(...instance.nodes);
        continue;
      }

      if (value instanceof Node) {
        nextNodes.push(value);
        continue;
      }

      nextNodes.push(document.createTextNode(String(value)));
    }

    for (const previous of this.arrayChildren) {
      if (previous && !reused.has(previous)) disconnectBindings(previous.bindings);
    }

    this.arrayChildren = nextChildren;
    this.textNode = undefined;
    this.lastPrimitive = unsetValue;
    this.replaceNodes(nextNodes);
  }

  private setKeyed(result: RepeatResult): void {
    if (this.child) {
      disconnectBindings(this.child.bindings);
      this.child = undefined;
    }
    this.disconnectArrayChildren();

    const previousByKey = new Map(
      this.keyedChildren.map((child) => [child.key, child] as const),
    );
    const nextKeys = new Set(result.items.map((item) => item.key));
    const nextChildren: KeyedChild[] = [];
    const nextNodes: Node[] = [];

    for (const [key, removed] of previousByKey) {
      if (!nextKeys.has(key)) {
        removed.part.disconnect();
        previousByKey.delete(key);
      }
    }

    for (const item of result.items) {
      const previous = previousByKey.get(item.key);
      const child = previous ?? this.createKeyedChild(item);

      if (previous) {
        previousByKey.delete(item.key);
        child.part.setValue(item.value);
      }

      nextChildren.push(child);
      nextNodes.push(child.marker, ...child.part.nodes);
    }

    this.keyedChildren = nextChildren;
    this.textNode = undefined;
    this.lastPrimitive = unsetValue;
    this.replaceNodes(nextNodes);
  }

  private createKeyedChild(item: KeyedItem): KeyedChild {
    const fragment = document.createDocumentFragment();
    const marker = document.createComment('gluon:key');
    fragment.append(marker);
    const part = new NodePart(marker);
    part.setValue(item.value);
    return { key: item.key, marker, part };
  }

  private replaceNodes(nextNodes: Node[]): void {
    const parent = this.marker.parentNode;
    if (!parent) {
      this.nodes = nextNodes;
      return;
    }

    if (
      nextNodes.length === this.nodes.length
      && nextNodes.every((node, index) => node === this.nodes[index])
    ) {
      return;
    }

    const keep = new Set(nextNodes);
    let cursor = this.marker.nextSibling;

    for (const node of nextNodes) {
      if (node === cursor) {
        cursor = cursor.nextSibling;
      } else {
        parent.insertBefore(node, cursor);
      }
    }

    for (const node of this.nodes) {
      if (!keep.has(node) && node.parentNode === parent) parent.removeChild(node);
    }

    this.nodes = nextNodes;
  }

  private resetChildren(): void {
    if (this.child) {
      disconnectBindings(this.child.bindings);
      this.child = undefined;
    }
    this.disconnectArrayChildren();
    this.disconnectKeyedChildren();
    this.textNode = undefined;
    this.lastPrimitive = unsetValue;
  }

  private disconnectArrayChildren(): void {
    for (const child of this.arrayChildren) {
      if (child) disconnectBindings(child.bindings);
    }
    this.arrayChildren = [];
  }

  private disconnectKeyedChildren(): void {
    for (const child of this.keyedChildren) child.part.disconnect();
    this.keyedChildren = [];
  }
}

class AttributePart implements Part {
  private lastValue: unknown = unsetValue;
  private listener?: EventListenerOrEventListenerObject;

  constructor(
    private readonly element: Element,
    private readonly name: string,
  ) {}

  setValue(value: TemplateValue): void {
    if (Object.is(value, this.lastValue)) return;

    if (this.name.startsWith('@')) {
      this.setEvent(value);
      this.lastValue = value;
      return;
    }

    this.lastValue = value;

    if (this.name.startsWith('.')) {
      (this.element as unknown as Record<string, unknown>)[this.name.slice(1)] = value;
      return;
    }

    if (this.name.startsWith('?')) {
      const attribute = this.name.slice(1);
      if (value) this.element.setAttribute(attribute, '');
      else this.element.removeAttribute(attribute);
      return;
    }

    if (isEmptyValue(value)) {
      this.element.removeAttribute(this.name);
    } else {
      this.element.setAttribute(this.name, String(value));
    }
  }

  disconnect(): void {
    if (this.listener && this.name.startsWith('@')) {
      this.element.removeEventListener(this.name.slice(1), this.listener);
    }
    this.listener = undefined;
    this.lastValue = unsetValue;
  }

  private setEvent(value: TemplateValue): void {
    const eventName = this.name.slice(1);
    if (this.listener) this.element.removeEventListener(eventName, this.listener);
    this.listener = isEventListener(value) ? value : undefined;
    if (this.listener) this.element.addEventListener(eventName, this.listener);
  }
}

type RefTarget =
  | { value?: Element }
  | ((element: Element | undefined) => void);

class SpreadPart implements Part {
  private readonly keys = new Set<string>();
  private readonly events = new Map<string, { eventName: string; listener: EventListenerOrEventListenerObject }>();
  private readonly dataAttributes = new Set<string>();
  private readonly ariaAttributes = new Set<string>();
  private readonly styleProperties = new Set<string>();
  private styleMode: 'none' | 'string' | 'object' = 'none';
  private ref?: RefTarget;

  constructor(private readonly element: Element) {}

  setValue(value: TemplateValue): void {
    const props = isObjectRecord(value) ? value : undefined;

    for (const key of [...this.keys]) {
      if (!props || !(key in props)) {
        this.clearKey(key);
        this.keys.delete(key);
      }
    }

    if (!props) return;

    for (const [key, nextValue] of Object.entries(props)) {
      this.applyKey(key, nextValue);
      this.keys.add(key);
    }
  }

  disconnect(): void {
    for (const key of [...this.keys]) this.clearKey(key);
    this.keys.clear();
  }

  private applyKey(key: string, value: unknown): void {
    if (key === 'ref') {
      this.setRef(isRefTarget(value) ? value : undefined);
      return;
    }

    if (key.startsWith('@') || /^on[A-Z]|^on[a-z]/.test(key)) {
      this.setEvent(key, isEventListener(value) ? value : undefined);
      return;
    }

    if (key.startsWith('.') && key.length > 1) {
      (this.element as unknown as Record<string, unknown>)[key.slice(1)] = value;
      return;
    }

    if (key.startsWith('?') && key.length > 1) {
      const attribute = key.slice(1);
      if (value) this.element.setAttribute(attribute, '');
      else this.element.removeAttribute(attribute);
      return;
    }

    if (key === 'class' || key === 'className') {
      const className = normalizeClass(value);
      if (className) this.element.setAttribute('class', className);
      else this.element.removeAttribute('class');
      return;
    }

    if (key === 'style') {
      this.setStyle(value);
      return;
    }

    if (key === 'data' || key === 'dataset') {
      this.setAttributeMap('data-', value, this.dataAttributes);
      return;
    }

    if (key === 'aria') {
      this.setAttributeMap('aria-', value, this.ariaAttributes);
      return;
    }

    if (value == null || value === false || value === nothing) {
      this.element.removeAttribute(key);
    } else {
      this.element.setAttribute(key, String(value));
    }
  }

  private clearKey(key: string): void {
    if (key === 'ref') {
      this.setRef(undefined);
      return;
    }

    if (key.startsWith('@') || /^on[A-Z]|^on[a-z]/.test(key)) {
      this.setEvent(key, undefined);
      return;
    }

    if (key.startsWith('.') && key.length > 1) {
      (this.element as unknown as Record<string, unknown>)[key.slice(1)] = undefined;
      return;
    }

    if (key.startsWith('?') && key.length > 1) {
      this.element.removeAttribute(key.slice(1));
      return;
    }

    if (key === 'class' || key === 'className') {
      this.element.removeAttribute('class');
      return;
    }

    if (key === 'style') {
      this.clearStyle();
      return;
    }

    if (key === 'data' || key === 'dataset') {
      this.clearAttributes(this.dataAttributes);
      return;
    }

    if (key === 'aria') {
      this.clearAttributes(this.ariaAttributes);
      return;
    }

    this.element.removeAttribute(key);
  }

  private setEvent(
    key: string,
    listener: EventListenerOrEventListenerObject | undefined,
  ): void {
    const eventName = key.startsWith('@')
      ? key.slice(1)
      : key.slice(2).toLowerCase();
    const previous = this.events.get(key);

    if (previous?.listener === listener) return;
    if (previous) this.element.removeEventListener(previous.eventName, previous.listener);

    if (listener) {
      this.element.addEventListener(eventName, listener);
      this.events.set(key, { eventName, listener });
    } else {
      this.events.delete(key);
    }
  }

  private setRef(ref: RefTarget | undefined): void {
    if (ref === this.ref) return;

    if (typeof this.ref === 'function') this.ref(undefined);
    else if (this.ref) this.ref.value = undefined;

    this.ref = ref;
    if (typeof ref === 'function') ref(this.element);
    else if (ref) ref.value = this.element;
  }

  private setStyle(value: unknown): void {
    const style = getStyleDeclaration(this.element);
    if (!style) return;

    if (typeof value === 'string') {
      this.clearStyle();
      this.element.setAttribute('style', value);
      this.styleMode = 'string';
      return;
    }

    if (!isObjectRecord(value)) {
      this.clearStyle();
      return;
    }

    if (this.styleMode === 'string') this.element.removeAttribute('style');
    const nextProperties = new Set<string>();

    for (const [property, propertyValue] of Object.entries(value)) {
      nextProperties.add(property);
      setStyleProperty(style, property, propertyValue);
    }

    for (const property of this.styleProperties) {
      if (!nextProperties.has(property)) removeStyleProperty(style, property);
    }

    this.styleProperties.clear();
    for (const property of nextProperties) this.styleProperties.add(property);
    this.styleMode = 'object';
  }

  private clearStyle(): void {
    const style = getStyleDeclaration(this.element);
    if (this.styleMode === 'string') this.element.removeAttribute('style');
    if (style) {
      for (const property of this.styleProperties) removeStyleProperty(style, property);
    }
    this.styleProperties.clear();
    this.styleMode = 'none';
  }

  private setAttributeMap(
    prefix: 'data-' | 'aria-',
    value: unknown,
    previousAttributes: Set<string>,
  ): void {
    const nextAttributes = new Set<string>();

    if (isObjectRecord(value)) {
      for (const [name, attributeValue] of Object.entries(value)) {
        const attribute = `${prefix}${toKebabCase(name)}`;
        if (attributeValue == null) {
          this.element.removeAttribute(attribute);
          continue;
        }
        this.element.setAttribute(attribute, String(attributeValue));
        nextAttributes.add(attribute);
      }
    }

    for (const attribute of previousAttributes) {
      if (!nextAttributes.has(attribute)) this.element.removeAttribute(attribute);
    }

    previousAttributes.clear();
    for (const attribute of nextAttributes) previousAttributes.add(attribute);
  }

  private clearAttributes(attributes: Set<string>): void {
    for (const attribute of attributes) this.element.removeAttribute(attribute);
    attributes.clear();
  }
}

interface RootInstance {
  readonly template: CompiledTemplate;
  readonly bindings: readonly Binding[];
}

const templateCache = new WeakMap<TemplateStringsArray, CompiledTemplate>();
const containerInstances = new WeakMap<Element | DocumentFragment, RootInstance>();

export function render(
  result: TemplateResult,
  container: Element | DocumentFragment | null,
): void {
  if (!container) return;
  if (!isTemplateResult(result)) {
    throw new TypeError('render() expects a TemplateResult created by html or svg.');
  }

  const compiled = getCompiledTemplate(result);
  const current = containerInstances.get(container);

  if (current?.template === compiled) {
    applyBindings(current.bindings, result.values);
    return;
  }

  if (current) disconnectBindings(current.bindings);

  const fragment = compiled.element.content.cloneNode(true) as DocumentFragment;
  const bindings = instantiateBindings(fragment, compiled.descriptors);
  applyBindings(bindings, result.values);
  container.replaceChildren(fragment);
  containerInstances.set(container, { template: compiled, bindings });
}

function getCompiledTemplate(result: TemplateResult): CompiledTemplate {
  const cached = templateCache.get(result.strings);
  if (cached) return cached;

  const element = document.createElement('template');
  const attributeNames = new Map<number, string>();
  const state = { inTag: false, quote: '' };
  let markup = '';

  for (let index = 0; index < result.strings.length - 1; index += 1) {
    const chunk = result.strings[index]!;
    markup += chunk;
    updateMarkupState(state, chunk);

    if (state.inTag) {
      const match = chunk.match(/(?:^|[\s<])([^\s"'<>/=]+)=\s*["']?$/);
      if (!match?.[1]) {
        throw new Error(
          `Unsupported expression ${index} inside a tag. `
          + 'Each expression must occupy a complete child or attribute value; '
          + 'use a binding such as name=${value} or ...=${props}.',
        );
      }
      attributeNames.set(index, match[1]);
      markup += `__gluon_${index}__`;
    } else {
      markup += `<!--gluon:${index}-->`;
    }
  }

  markup += result.strings[result.strings.length - 1] ?? '';
  element.innerHTML = markup;
  const descriptors = buildDescriptors(element.content, attributeNames);
  const expressionCount = result.strings.length - 1;

  if (descriptors.length !== expressionCount) {
    throw new Error(
      'Every Gluon expression must occupy a complete child or attribute value. '
      + 'Mixed attribute strings such as class="prefix ${value}" are not supported; '
      + 'compose the complete value before binding it.',
    );
  }

  const compiled: CompiledTemplate = {
    element,
    strings: result.strings,
    descriptors,
  };
  templateCache.set(result.strings, compiled);
  return compiled;
}

function buildDescriptors(
  content: DocumentFragment,
  attributeNames: ReadonlyMap<number, string>,
): PartDescriptor[] {
  const descriptors: PartDescriptor[] = [];
  const walker = document.createTreeWalker(
    content,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT,
  );

  while (walker.nextNode()) {
    const node = walker.currentNode;

    if (node.nodeType === Node.COMMENT_NODE) {
      const match = (node as Comment).data.match(/^gluon:(\d+)$/);
      if (match?.[1]) {
        descriptors.push({
          kind: 'node',
          index: Number(match[1]),
          path: pathFromRoot(content, node),
        });
      }
      continue;
    }

    const element = node as Element;
    for (const attribute of [...element.attributes]) {
      const match = attribute.value.match(/^__gluon_(\d+)__$/);
      if (!match?.[1]) continue;

      const index = Number(match[1]);
      const originalName = attributeNames.get(index) ?? attribute.name;
      descriptors.push(
        originalName === '...'
          ? { kind: 'spread', index, path: pathFromRoot(content, node) }
          : { kind: 'attribute', index, path: pathFromRoot(content, node), name: originalName },
      );
      element.removeAttribute(attribute.name);
    }
  }

  descriptors.sort((left, right) => left.index - right.index);
  return descriptors;
}

function instantiateBindings(
  root: DocumentFragment,
  descriptors: readonly PartDescriptor[],
): Binding[] {
  return descriptors.map((descriptor) => {
    const node = walkPath(root, descriptor.path);
    let part: Part;

    if (descriptor.kind === 'node') part = new NodePart(node as Comment);
    else if (descriptor.kind === 'spread') part = new SpreadPart(node as Element);
    else part = new AttributePart(node as Element, descriptor.name);

    return { index: descriptor.index, part };
  });
}

function createChildInstance(
  result: TemplateResult,
  compiled = getCompiledTemplate(result),
): ChildInstance {
  const fragment = compiled.element.content.cloneNode(true) as DocumentFragment;
  const bindings = instantiateBindings(fragment, compiled.descriptors);
  applyBindings(bindings, result.values);
  const nodes = [...fragment.childNodes];
  return { template: compiled, bindings, nodes };
}

function applyBindings(
  bindings: readonly Binding[],
  values: readonly TemplateValue[],
): void {
  for (const binding of bindings) {
    const value = values[binding.index] ?? nothing;
    if (isDirectiveValue(value)) {
      const runner = value[directiveBrand](...value.args);
      runner(binding.part);
    } else {
      binding.part.setValue(value);
    }
  }
}

function disconnectBindings(bindings: readonly Binding[]): void {
  for (const binding of bindings) binding.part.disconnect();
}

function pathFromRoot(root: Node, descendant: Node): number[] {
  const path: number[] = [];
  let current = descendant;

  while (current !== root) {
    const parent = current.parentNode;
    if (!parent) throw new Error('Could not compile a detached template part.');
    const index = [...parent.childNodes].indexOf(current as ChildNode);
    if (index < 0) throw new Error('Could not locate a template part.');
    path.unshift(index);
    current = parent;
  }

  return path;
}

function walkPath(root: Node, path: readonly number[]): Node {
  let current = root;
  for (const index of path) {
    const next = current.childNodes.item(index);
    if (!next) throw new Error('A cached Gluon template path is no longer valid.');
    current = next;
  }
  return current;
}

function updateMarkupState(
  state: { inTag: boolean; quote: string },
  chunk: string,
): void {
  for (const character of chunk) {
    if (!state.inTag) {
      if (character === '<') state.inTag = true;
      continue;
    }

    if (state.quote) {
      if (character === state.quote) state.quote = '';
      continue;
    }

    if (character === '"' || character === "'") state.quote = character;
    else if (character === '>') state.inTag = false;
  }
}

function flattenValues(values: readonly TemplateValue[]): TemplateValue[] {
  const flat: TemplateValue[] = [];
  const visit = (value: TemplateValue): void => {
    if (Array.isArray(value)) {
      for (const child of value) visit(child);
    } else {
      flat.push(value);
    }
  };
  for (const value of values) visit(value);
  return flat;
}

function isEmptyValue(value: unknown): value is null | undefined | false | typeof nothing {
  return value == null || value === false || value === nothing;
}

function isRenderablePrimitive(value: unknown): value is string | number | bigint | true {
  return typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'bigint'
    || value === true;
}

function isKey(value: unknown): value is Key {
  return typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'symbol';
}

function formatKey(key: Key): string {
  return typeof key === 'string' ? JSON.stringify(key) : String(key);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isEventListener(value: unknown): value is EventListenerOrEventListenerObject {
  return typeof value === 'function'
    || Boolean(value && typeof value === 'object' && 'handleEvent' in value);
}

function isRefTarget(value: unknown): value is RefTarget {
  return typeof value === 'function'
    || Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function normalizeClass(value: unknown): string {
  const tokens: string[] = [];
  const visit = (item: unknown): void => {
    if (!item) return;
    if (typeof item === 'string') {
      tokens.push(item);
      return;
    }
    if (Array.isArray(item)) {
      for (const child of item) visit(child);
      return;
    }
    if (isObjectRecord(item)) {
      for (const [name, enabled] of Object.entries(item)) {
        if (enabled) tokens.push(name);
      }
    }
  };
  visit(value);
  return tokens.join(' ');
}

function getStyleDeclaration(element: Element): CSSStyleDeclaration | undefined {
  if ('style' in element) return (element as HTMLElement | SVGElement).style;
  return undefined;
}

function setStyleProperty(
  style: CSSStyleDeclaration,
  property: string,
  value: unknown,
): void {
  if (value == null || value === false) {
    removeStyleProperty(style, property);
  } else if (property.startsWith('--') || property.includes('-')) {
    style.setProperty(property, String(value));
  } else {
    (style as unknown as Record<string, unknown>)[property] = String(value);
  }
}

function removeStyleProperty(style: CSSStyleDeclaration, property: string): void {
  if (property.startsWith('--') || property.includes('-')) style.removeProperty(property);
  else (style as unknown as Record<string, unknown>)[property] = '';
}

function toKebabCase(value: string): string {
  return value
    .replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`)
    .replace(/[_\s]+/g, '-');
}
