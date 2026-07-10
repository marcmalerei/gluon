import { guardEventListener } from './application-context.js';

const templateResultBrand = Symbol('gluon.template-result');
const directiveBrand = Symbol('gluon.directive');
const repeatResultBrand = Symbol('gluon.repeat-result');
const eventBindingBrand = Symbol('gluon.event-binding');
const unsafeHtmlBrand = Symbol('gluon.unsafe-html');
const unsafeUrlBrand = Symbol('gluon.unsafe-url');
const unsetValue = Symbol('gluon.unset');

/** Explicitly renders no child content or removes an attribute value. */
export const nothing = Symbol('gluon.nothing');

export type TemplateType = 'html' | 'svg';
export type PrimitiveValue = string | number | bigint | boolean | null | undefined;

export type TemplateValue =
  | PrimitiveValue
  | Node
  | URL
  | TemplateResult
  | RepeatResult
  | DirectiveValue
  | EventBinding
  | UnsafeHtmlResult
  | UnsafeUrlResult
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
  constructor(
    readonly strings: TemplateStringsArray,
    readonly values: readonly TemplateValue[],
    readonly type: TemplateType = 'html',
  ) {}
}

export function isTemplateResult(value: unknown): value is TemplateResult {
  if (value instanceof TemplateResult) return true;
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

export interface EventBinding {
  readonly [eventBindingBrand]: true;
  readonly listener: EventListenerOrEventListenerObject;
  readonly options?: boolean | AddEventListenerOptions;
}

/** Associates native addEventListener options with an event binding. */
export function event(
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
): EventBinding {
  const retainedOptions = typeof options === 'object'
    ? Object.freeze({
        capture: options.capture,
        once: options.once,
        passive: options.passive,
        signal: options.signal,
      })
    : options;
  return Object.freeze({
    [eventBindingBrand]: true as const,
    listener,
    options: retainedOptions,
  });
}

export interface UnsafeHtmlResult {
  readonly [unsafeHtmlBrand]: true;
  readonly markup: string;
}

/**
 * Opts a trusted string into raw HTML parsing. Gluon performs no sanitization.
 */
export function unsafeHTML(markup: string): UnsafeHtmlResult {
  return Object.freeze({
    [unsafeHtmlBrand]: true as const,
    markup,
  });
}

export interface UnsafeUrlResult {
  readonly [unsafeUrlBrand]: true;
  readonly value: string;
}

/** Bypasses Gluon's unsafe-protocol check for one URL-valued binding. */
export function unsafeURL(value: string | URL): UnsafeUrlResult {
  return Object.freeze({
    [unsafeUrlBrand]: true as const,
    value: String(value),
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
  readonly commitPriority?: number;
  disconnect(): void;
  suspend(): void;
}

export type DirectiveRunner = (part: PartController) => void;
export type DirectiveFactory<Args extends readonly unknown[] = readonly unknown[]> = (
  ...args: Args
) => DirectiveRunner;

export interface DirectiveLifecycle<Args extends readonly unknown[] = readonly unknown[]> {
  mount(part: PartController, args: Args): void;
  update(part: PartController, args: Args, previousArgs: Args): void;
  cleanup?(part: PartController, args: Args): void;
  disconnect?(part: PartController, args: Args): void;
}

export type DirectiveDefinition<Args extends readonly unknown[] = readonly unknown[]> =
  | DirectiveFactory<Args>
  | DirectiveLifecycle<Args>;

export interface DirectiveValue {
  readonly [directiveBrand]: DirectiveDefinition;
  readonly args: readonly unknown[];
}

export function directive<Args extends readonly unknown[]>(
  definition: DirectiveDefinition<Args>,
): (...args: Args) => DirectiveValue {
  return (...args: Args) => Object.freeze({
    [directiveBrand]: definition as DirectiveDefinition,
    args: Object.freeze(args),
  });
}

function isDirectiveValue(value: unknown): value is DirectiveValue {
  return Boolean(
    value
      && typeof value === 'object'
      && directiveBrand in value,
  );
}

function isDirectiveLifecycle(
  definition: DirectiveDefinition,
): definition is DirectiveLifecycle {
  return Boolean(
    definition
      && typeof definition === 'object'
      && typeof definition.mount === 'function'
      && typeof definition.update === 'function',
  );
}

type PartDescriptor =
  | { readonly kind: 'node'; readonly index: number; readonly path: readonly number[] }
  | { readonly kind: 'attribute'; readonly index: number; readonly path: readonly number[]; readonly name: string }
  | { readonly kind: 'spread'; readonly index: number; readonly path: readonly number[] };

interface Binding {
  readonly index: number;
  readonly part: Part;
  readonly priority: number;
  directive?: ActiveDirective;
}

interface ActiveDirective {
  readonly definition: DirectiveLifecycle;
  args: readonly unknown[];
  cleaned: boolean;
}

interface CompiledTemplate {
  readonly element: HTMLTemplateElement;
  readonly strings: TemplateStringsArray;
  readonly descriptors: readonly PartDescriptor[];
  readonly rootNodesStable: boolean;
}

interface ChildInstance {
  readonly template: CompiledTemplate;
  readonly bindings: readonly Binding[];
  nodes: Node[];
}

interface PartChild {
  readonly marker: Comment;
  readonly part: NodePart;
  readonly binding: Binding;
}

interface KeyedChild extends PartChild {
  readonly key: Key;
}

class NodePart implements Part {
  private nodes: Node[] = [];
  private textNode?: Text;
  private lastPrimitive: PrimitiveValue | typeof unsetValue = unsetValue;
  private child?: ChildInstance;
  private arrayChildren: Array<PartChild | undefined> = [];
  private keyedChildren: KeyedChild[] = [];
  private unsafeMarkup?: string;

  constructor(
    private readonly marker: Comment,
    private readonly contextMarker: Comment = marker,
  ) {}

  setStringValue(value: string): void {
    if (!this.textNode) {
      this.setValue(value);
      return;
    }
    if (value !== this.lastPrimitive) {
      this.textNode.data = value;
      this.lastPrimitive = value;
    }
    if (this.textNode.previousSibling !== this.marker) {
      this.replaceNodes([this.textNode]);
    }
  }

  setValue(value: TemplateValue): void {
    if (typeof value === 'string' && this.textNode) {
      this.setStringValue(value);
      return;
    }

    if (isEmptyValue(value)) {
      this.resetChildren();
      this.replaceNodes([]);
      return;
    }

    if (isRenderablePrimitive(value) && this.textNode) {
      if (!Object.is(value, this.lastPrimitive)) {
        this.textNode.data = String(value);
        this.lastPrimitive = value;
      }
      if (this.textNode.previousSibling !== this.marker) {
        this.replaceNodes([this.textNode]);
      }
      return;
    }

    if (isUnsafeHtmlResult(value)) {
      this.setUnsafeHTML(value);
      return;
    }

    if (isUnsafeUrlResult(value) || isEventBinding(value)) {
      throw new TypeError('URL and event binding helpers can only be used in matching attribute bindings.');
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

  suspend(): void {
    if (this.child) suspendBindings(this.child.bindings);
    for (const child of this.arrayChildren) {
      if (child) suspendBindings([child.binding]);
    }
    for (const child of this.keyedChildren) suspendBindings([child.binding]);
  }

  private setTemplate(result: TemplateResult): void {
    const compiled = getCompiledTemplate(result);

    if (
      this.child?.template === compiled
      && nodesAreInPlace(this.marker, this.nodes)
    ) {
      const boundary = this.nodes.length > 0
        ? this.nodes[this.nodes.length - 1]!.nextSibling
        : this.marker.nextSibling;
      applyBindings(this.child.bindings, result.values);
      if (compiled.rootNodesStable) {
        this.nodes = this.child.nodes;
      } else {
        const nodes = collectNodesUntil(this.marker, boundary);
        this.child.nodes = nodes;
        this.nodes = nodes;
      }
      this.textNode = undefined;
      this.lastPrimitive = unsetValue;
      return;
    }

    this.disconnectArrayChildren();
    this.disconnectKeyedChildren();
    this.unsafeMarkup = undefined;
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
    this.unsafeMarkup = undefined;

    const flatValues = flattenValues(values);
    const nextNodes: Node[] = [];
    const nextChildren: Array<PartChild | undefined> = [];
    const reused = new Set<PartChild>();

    for (let index = 0; index < flatValues.length; index += 1) {
      const value = flatValues[index]!;
      if (isEmptyValue(value)) continue;
      const cached = this.arrayChildren[index];
      const instance = cached ?? this.createPartChild(value);
      if (cached) applyBindings([cached.binding], [value]);
      reused.add(instance);
      nextChildren[index] = instance;
      nextNodes.push(instance.marker, ...instance.part.nodes);
    }

    for (const previous of this.arrayChildren) {
      if (previous && !reused.has(previous)) disconnectBindings([previous.binding]);
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
    this.unsafeMarkup = undefined;

    if (
      this.keyedChildren.length === result.items.length
      && this.keyedChildren.every((child, index) => child.key === result.items[index]!.key)
    ) {
      for (let index = 0; index < result.items.length; index += 1) {
        applyBinding(this.keyedChildren[index]!.binding, result.items[index]!.value);
      }
      this.textNode = undefined;
      this.lastPrimitive = unsetValue;
      if (!nodesAreInPlace(this.marker, this.nodes)) this.replaceNodes([...this.nodes]);
      return;
    }

    const previousByKey = new Map(
      this.keyedChildren.map((child) => [child.key, child] as const),
    );
    const nextKeys = new Set(result.items.map((item) => item.key));
    const nextChildren: KeyedChild[] = [];
    const nextNodes: Node[] = [];

    for (const [key, removed] of previousByKey) {
      if (!nextKeys.has(key)) {
        disconnectBindings([removed.binding]);
        previousByKey.delete(key);
      }
    }

    for (const item of result.items) {
      const previous = previousByKey.get(item.key);
      const child = previous ?? this.createKeyedChild(item);

      if (previous) {
        previousByKey.delete(item.key);
        applyBinding(child.binding, item.value);
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
    return { key: item.key, ...this.createPartChild(item.value, 'gluon:key') };
  }

  private createPartChild(value: TemplateValue, markerData = 'gluon:item'): PartChild {
    const fragment = document.createDocumentFragment();
    const marker = document.createComment(markerData);
    fragment.append(marker);
    const part = new NodePart(marker, this.contextMarker);
    const binding: Binding = { index: 0, part, priority: 0 };
    applyBindings([binding], [value]);
    return { marker, part, binding };
  }

  private setUnsafeHTML(result: UnsafeHtmlResult): void {
    if (this.unsafeMarkup === result.markup) {
      this.replaceNodes([...this.nodes]);
      return;
    }

    this.resetChildren();
    const fragment = createContextualFragment(this.contextMarker, result.markup);
    const nodes = [...fragment.childNodes];
    this.unsafeMarkup = result.markup;
    this.replaceNodes(nodes);
  }

  private replaceNodes(nextNodes: Node[]): void {
    const parent = this.marker.parentNode;
    if (!parent) {
      this.nodes = nextNodes;
      return;
    }

    if (nextNodes.length === this.nodes.length) {
      let sameNodes = true;
      for (let index = 0; index < nextNodes.length; index += 1) {
        if (nextNodes[index] !== this.nodes[index]) {
          sameNodes = false;
          break;
        }
      }
      if (sameNodes && nodesAreInPlace(this.marker, nextNodes)) return;
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
    this.unsafeMarkup = undefined;
    this.textNode = undefined;
    this.lastPrimitive = unsetValue;
  }

  private disconnectArrayChildren(): void {
    for (const child of this.arrayChildren) {
      if (child) disconnectBindings([child.binding]);
    }
    this.arrayChildren = [];
  }

  private disconnectKeyedChildren(): void {
    for (const child of this.keyedChildren) disconnectBindings([child.binding]);
    this.keyedChildren = [];
  }
}

class AttributePart implements Part {
  private lastValue: unknown = unsetValue;
  private event?: ResolvedEvent;

  constructor(
    private readonly element: Element,
    private readonly name: string,
  ) {}

  get commitPriority(): number {
    return this.name.startsWith('.') && isNativeFormControl(this.element) ? 1 : 0;
  }

  setValue(value: TemplateValue): void {
    if (this.name.startsWith('.')) {
      setElementProperty(this.element, this.name.slice(1), value);
      this.lastValue = value;
      return;
    }

    if (this.name.startsWith('@')) {
      if (Object.is(value, this.lastValue)) return;
      this.setEvent(value);
      this.lastValue = value;
      return;
    }

    if (this.name.startsWith('?')) {
      const attribute = this.name.slice(1);
      const enabled = !isEmptyValue(value) && Boolean(value);
      if (enabled !== this.element.hasAttribute(attribute)) {
        if (enabled) this.element.setAttribute(attribute, '');
        else this.element.removeAttribute(attribute);
      }
      this.lastValue = value;
      return;
    }

    if (isEmptyValue(value)) {
      if (getOwnedAttribute(this.element, this.name) !== null) {
        removeOwnedAttribute(this.element, this.name);
      }
    } else {
      const serialized = serializeAttributeValue(this.name, value);
      if (getOwnedAttribute(this.element, this.name) !== serialized) {
        setOwnedAttribute(this.element, this.name, serialized);
      }
    }
    this.lastValue = value;
  }

  disconnect(): void {
    this.suspend();
    this.lastValue = unsetValue;
  }

  suspend(): void {
    if (!this.event || !this.name.startsWith('@')) return;
    this.element.removeEventListener(
      this.name.slice(1),
      this.event.listener,
      this.event.options,
    );
    this.event = undefined;
    this.lastValue = unsetValue;
  }

  private setEvent(value: TemplateValue): void {
    const eventName = this.name.slice(1);
    if (this.event) {
      this.element.removeEventListener(eventName, this.event.listener, this.event.options);
    }
    this.event = resolveEvent(value);
    if (this.event) {
      this.element.addEventListener(eventName, this.event.listener, this.event.options);
    }
  }
}

interface ResolvedEvent {
  readonly listener: EventListenerOrEventListenerObject;
  readonly options?: boolean | AddEventListenerOptions;
}

export type RefTarget<ElementType extends Element = Element> =
  | { value: ElementType | undefined }
  | ((element: ElementType | undefined) => void);

export function elementRef<ElementType extends Element = Element>(): {
  value: ElementType | undefined;
} {
  return { value: undefined };
}

class SpreadPart implements Part {
  private readonly keys = new Set<string>();
  private readonly events = new Map<string, ResolvedEvent & { readonly eventName: string }>();
  private readonly dataAttributes = new Set<string>();
  private readonly ariaAttributes = new Set<string>();
  private readonly styleProperties = new Set<string>();
  private styleMode: 'none' | 'string' | 'object' = 'none';
  private ref?: RefTarget;

  constructor(private readonly element: Element) {}

  get commitPriority(): number {
    return isNativeFormControl(this.element) ? 1 : 0;
  }

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

  suspend(): void {
    for (const { eventName, listener, options } of this.events.values()) {
      this.element.removeEventListener(eventName, listener, options);
    }
    this.events.clear();
    this.setRef(undefined);
  }

  private applyKey(key: string, value: unknown): void {
    if (key === 'ref') {
      this.setRef(isRefTarget(value) ? value : undefined);
      return;
    }

    if (key.startsWith('@') || /^on[A-Z]|^on[a-z]/.test(key)) {
      this.setEvent(key, resolveEvent(value));
      return;
    }

    if (key.startsWith('.') && key.length > 1) {
      setElementProperty(this.element, key.slice(1), value);
      return;
    }

    if (key.startsWith('?') && key.length > 1) {
      const attribute = key.slice(1);
      if (!isEmptyValue(value) && value) this.element.setAttribute(attribute, '');
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
      removeOwnedAttribute(this.element, key);
    } else {
      setOwnedAttribute(this.element, key, serializeAttributeValue(key, value));
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
      setElementProperty(this.element, key.slice(1), undefined);
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

    removeOwnedAttribute(this.element, key);
  }

  private setEvent(
    key: string,
    event: ResolvedEvent | undefined,
  ): void {
    const eventName = key.startsWith('@')
      ? key.slice(1)
      : key.slice(2).toLowerCase();
    const previous = this.events.get(key);

    if (
      previous?.listener === event?.listener
      && previous?.options === event?.options
    ) return;
    if (previous) {
      this.element.removeEventListener(previous.eventName, previous.listener, previous.options);
    }

    if (event) {
      this.element.addEventListener(eventName, event.listener, event.options);
      this.events.set(key, { eventName, ...event });
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
  nodes: Node[];
  suspended: boolean;
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

  if (
    current?.template === compiled
    && rootNodesAreInPlace(container, current.nodes)
  ) {
    const binding = current.bindings.length === 1 ? current.bindings[0] : undefined;
    const value = binding && binding.index < result.values.length
      ? result.values[binding.index]
      : undefined;
    if (binding && typeof value === 'string' && binding.part instanceof NodePart && !binding.directive) {
      binding.part.setStringValue(value);
    } else {
      applyBindings(current.bindings, result.values);
    }
    if (!current.template.rootNodesStable && !rootNodesAreInPlace(container, current.nodes)) {
      current.nodes = [...container.childNodes];
    }
    current.suspended = false;
    return;
  }

  if (current) {
    containerInstances.delete(container);
    disconnectBindings(current.bindings);
  }

  const fragment = compiled.element.content.cloneNode(true) as DocumentFragment;
  const bindings = instantiateBindings(fragment, compiled.descriptors);
  applyBindings(bindings, result.values);
  const nodes = [...fragment.childNodes];
  container.replaceChildren(fragment);
  containerInstances.set(container, {
    template: compiled,
    bindings,
    nodes,
    suspended: false,
  });
}

/** Temporarily releases active listeners, refs, and directive resources. */
export function suspendRender(container: Element | DocumentFragment | null): void {
  if (!container) return;
  const current = containerInstances.get(container);
  if (!current || current.suspended) return;
  current.suspended = true;
  suspendBindings(current.bindings);
}

/** Permanently releases a render root and removes its renderer-owned DOM. */
export function unmount(container: Element | DocumentFragment | null): void {
  if (!container) return;
  const current = containerInstances.get(container);
  try {
    if (current) {
      containerInstances.delete(container);
      disconnectBindings(current.bindings);
    }
  } finally {
    container.replaceChildren();
  }
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
    rootNodesStable: descriptors.every((descriptor) => descriptor.kind !== 'node' || descriptor.path.length > 0),
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

    return { index: descriptor.index, part, priority: part.commitPriority ?? 0 };
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
  if (bindings.length === 1 && bindings[0]!.priority === 0) {
    applyBinding(bindings[0]!, bindings[0]!.index < values.length
      ? values[bindings[0]!.index]!
      : nothing);
    return;
  }

  let hasPriorityOne = false;
  for (const binding of bindings) {
    if (binding.priority === 1) {
      hasPriorityOne = true;
      break;
    }
  }

  if (!hasPriorityOne) {
    for (const binding of bindings) {
      applyBinding(binding, binding.index < values.length ? values[binding.index]! : nothing);
    }
    return;
  }

  for (const priority of [0, 1]) {
    for (const binding of bindings) {
      if (binding.priority !== priority) continue;
      applyBinding(binding, binding.index < values.length ? values[binding.index]! : nothing);
    }
  }
}

function applyBinding(binding: Binding, value: TemplateValue): void {
  if (typeof value === 'string' && binding.part instanceof NodePart && !binding.directive) {
    binding.part.setStringValue(value);
    return;
  }
  if (isDirectiveValue(value)) {
    applyDirective(binding, value);
  } else {
    if (binding.directive) deactivateDirective(binding);
    binding.part.setValue(value);
  }
}

function disconnectBindings(bindings: readonly Binding[]): void {
  runBindingCleanup(bindings, (binding) => {
    let error: unknown;
    try {
      deactivateDirective(binding);
    } catch (cause) {
      error = cause;
    }
    try {
      binding.part.disconnect();
    } catch (cause) {
      error ??= cause;
    }
    if (error) throw error;
  });
}

function suspendBindings(bindings: readonly Binding[]): void {
  runBindingCleanup(bindings, (binding) => {
    let error: unknown;
    try {
      deactivateDirective(binding);
    } catch (cause) {
      error = cause;
    }
    try {
      binding.part.suspend();
    } catch (cause) {
      error ??= cause;
    }
    if (error) throw error;
  });
}

function applyDirective(binding: Binding, value: DirectiveValue): void {
  const definition = value[directiveBrand];

  if (!isDirectiveLifecycle(definition)) {
    deactivateDirective(binding);
    definition(...value.args)(binding.part);
    return;
  }

  const current = binding.directive;
  if (current?.definition === definition) {
    cleanupDirective(current, binding.part);
    const previousArgs = current.args;
    try {
      definition.update(binding.part, value.args, previousArgs);
    } catch (error) {
      binding.directive = undefined;
      try {
        definition.disconnect?.(binding.part, previousArgs);
      } catch {
        // Preserve the update failure while still attempting lifecycle disconnection.
      }
      throw error;
    }
    current.args = value.args;
    current.cleaned = false;
    return;
  }

  deactivateDirective(binding);
  const active: ActiveDirective = {
    definition,
    args: value.args,
    cleaned: false,
  };
  binding.directive = active;
  try {
    definition.mount(binding.part, value.args);
  } catch (error) {
    try {
      deactivateDirective(binding);
    } catch {
      // Preserve the mount failure while still attempting lifecycle cleanup.
    }
    throw error;
  }
}

function deactivateDirective(binding: Binding): void {
  const active = binding.directive;
  if (!active) return;
  binding.directive = undefined;

  let error: unknown;
  try {
    cleanupDirective(active, binding.part);
  } catch (cause) {
    error = cause;
  }
  try {
    active.definition.disconnect?.(binding.part, active.args);
  } catch (cause) {
    error ??= cause;
  }
  if (error) throw error;
}

function cleanupDirective(active: ActiveDirective, part: PartController): void {
  if (active.cleaned) return;
  active.cleaned = true;
  active.definition.cleanup?.(part, active.args);
}

function runBindingCleanup(
  bindings: readonly Binding[],
  cleanup: (binding: Binding) => void,
): void {
  let error: unknown;
  for (const binding of bindings) {
    try {
      cleanup(binding);
    } catch (cause) {
      error ??= cause;
    }
  }
  if (error) throw error;
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

function isEventBinding(value: unknown): value is EventBinding {
  return Boolean(
    value
      && typeof value === 'object'
      && eventBindingBrand in value,
  );
}

function resolveEvent(value: unknown): ResolvedEvent | undefined {
  if (isEventBinding(value)) {
    return {
      listener: guardEventListener(value.listener),
      options: value.options,
    };
  }
  return isEventListener(value) ? { listener: guardEventListener(value) } : undefined;
}

function isUnsafeHtmlResult(value: unknown): value is UnsafeHtmlResult {
  return Boolean(
    value
      && typeof value === 'object'
      && unsafeHtmlBrand in value,
  );
}

function isUnsafeUrlResult(value: unknown): value is UnsafeUrlResult {
  return Boolean(
    value
      && typeof value === 'object'
      && unsafeUrlBrand in value,
  );
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

function isNativeFormControl(element: Element): boolean {
  return element instanceof HTMLInputElement
    || element instanceof HTMLTextAreaElement
    || element instanceof HTMLSelectElement
    || element instanceof HTMLOptionElement
    || element instanceof HTMLButtonElement;
}

const attributeNamespaces = new Map<string, string>([
  ['xlink', 'http://www.w3.org/1999/xlink'],
  ['xml', 'http://www.w3.org/XML/1998/namespace'],
  ['xmlns', 'http://www.w3.org/2000/xmlns/'],
]);

const urlAttributes = new Set([
  'action',
  'archive',
  'background',
  'cite',
  'codebase',
  'data',
  'formaction',
  'href',
  'icon',
  'longdesc',
  'manifest',
  'ping',
  'poster',
  'profile',
  'src',
  'srcset',
  'usemap',
  'xlink:href',
]);

function setElementProperty(element: Element, property: string, value: unknown): void {
  if (property === 'innerHTML' || property === 'outerHTML' || property === 'textContent') {
    throw new TypeError(`.${property} is not supported because it replaces renderer-owned DOM.`);
  }

  let nextValue = value;
  if (property === 'srcdoc') {
    if (!isUnsafeHtmlResult(value)) {
      throw new TypeError(`.${property} requires an explicit unsafeHTML() value.`);
    }
    nextValue = value.markup;
  }

  const urlProperty = property.toLowerCase();
  if (
    urlAttributes.has(urlProperty)
    && (urlProperty !== 'data' || element instanceof HTMLObjectElement)
  ) {
    nextValue = serializeAttributeValue(urlProperty, value);
  }

  if (element instanceof HTMLSelectElement && property === 'value' && Array.isArray(nextValue)) {
    if (!element.multiple) {
      throw new TypeError('An array .value binding requires a <select multiple> element.');
    }
    const selectedValues = new Set(nextValue.map((item) => String(item)));
    for (const option of element.options) {
      option.selected = selectedValues.has(option.value);
    }
    return;
  }

  const target = element as unknown as Record<string, unknown>;
  if (!Object.is(target[property], nextValue)) target[property] = nextValue;
}

function serializeAttributeValue(name: string, value: unknown): string {
  const normalizedName = name.toLowerCase();

  if (normalizedName === 'srcdoc') {
    if (!isUnsafeHtmlResult(value)) {
      throw new TypeError('The srcdoc attribute requires an explicit unsafeHTML() value.');
    }
    return value.markup;
  }

  if (isUnsafeHtmlResult(value)) {
    throw new TypeError('unsafeHTML() can only be used in child content or srcdoc.');
  }

  if (isUnsafeUrlResult(value)) {
    if (!urlAttributes.has(normalizedName)) {
      throw new TypeError('unsafeURL() can only be used with a URL-valued attribute.');
    }
    return value.value;
  }

  const serialized = String(value);
  if (urlAttributes.has(normalizedName)) assertSafeUrl(normalizedName, serialized);
  return serialized;
}

function assertSafeUrl(name: string, value: string): void {
  const candidates = name === 'srcset'
    ? value.split(',')
    : name === 'ping'
      ? value.split(/\s+/)
      : [value];

  for (const candidate of candidates) {
    const normalized = candidate
      .trimStart()
      .replace(/[\u0000-\u0020\u007f-\u009f]+/g, '')
      .toLowerCase();
    if (/^(?:javascript|vbscript|data):/.test(normalized)) {
      throw new TypeError(
        `Blocked unsafe URL protocol in ${name}; use unsafeURL() only for reviewed trusted input.`,
      );
    }
  }
}

function setOwnedAttribute(element: Element, name: string, value: string): void {
  if (/^on/i.test(name)) {
    throw new TypeError('String event-handler attributes are not supported; use an event binding.');
  }
  const namespace = getAttributeNamespace(name);
  if (namespace) element.setAttributeNS(namespace.uri, name, value);
  else element.setAttribute(name, value);
}

function removeOwnedAttribute(element: Element, name: string): void {
  const namespace = getAttributeNamespace(name);
  if (namespace) element.removeAttributeNS(namespace.uri, namespace.localName);
  else element.removeAttribute(name);
}

function getOwnedAttribute(element: Element, name: string): string | null {
  const namespace = getAttributeNamespace(name);
  return namespace
    ? element.getAttributeNS(namespace.uri, namespace.localName)
    : element.getAttribute(name);
}

function getAttributeNamespace(
  name: string,
): { readonly uri: string; readonly localName: string } | undefined {
  const separator = name.indexOf(':');
  if (separator < 0 && name !== 'xmlns') return undefined;
  const prefix = (separator < 0 ? name : name.slice(0, separator)).toLowerCase();
  const uri = attributeNamespaces.get(prefix);
  if (!uri) return undefined;
  return {
    uri,
    localName: separator < 0 ? name : name.slice(separator + 1),
  };
}

function createContextualFragment(marker: Comment, markup: string): DocumentFragment {
  if (marker.parentNode) {
    const range = document.createRange();
    range.selectNode(marker);
    return range.createContextualFragment(markup);
  }
  const template = document.createElement('template');
  template.innerHTML = markup;
  return template.content;
}

function nodesAreInPlace(marker: Comment, nodes: readonly Node[]): boolean {
  let cursor = marker.nextSibling;
  for (const node of nodes) {
    if (node !== cursor) return false;
    cursor = cursor.nextSibling;
  }
  return true;
}

function collectNodesUntil(marker: Comment, boundary: Node | null): Node[] {
  const nodes: Node[] = [];
  let cursor = marker.nextSibling;
  while (cursor && cursor !== boundary) {
    nodes.push(cursor);
    cursor = cursor.nextSibling;
  }
  return nodes;
}

function rootNodesAreInPlace(
  container: Element | DocumentFragment,
  nodes: readonly Node[],
): boolean {
  if (nodes.length === 1) {
    return container.firstChild === nodes[0] && container.lastChild === nodes[0];
  }
  if (container.childNodes.length !== nodes.length) return false;
  for (let index = 0; index < nodes.length; index += 1) {
    if (container.childNodes.item(index) !== nodes[index]) return false;
  }
  return true;
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
