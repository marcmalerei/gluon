import { guardEventListener } from './application-context.js';
import {
  compareComponentStyles,
  createComponentStyleOwner,
  createStyleSheetSelection,
  type ComponentStyleDependency,
  type ComponentStyleOwner,
  type StyleSheetSelection,
  type StyleTarget,
} from './styles/index.js';

const templateResultBrand = Symbol('gluon.template-result');
const directiveBrand = Symbol('gluon.directive');
const repeatResultBrand = Symbol('gluon.repeat-result');
const repeatKeys = Symbol('gluon.repeat-keys');
const repeatValues = Symbol('gluon.repeat-values');
const eventBindingBrand = Symbol('gluon.event-binding');
const unsafeHtmlBrand = Symbol('gluon.unsafe-html');
const unsafeUrlBrand = Symbol('gluon.unsafe-url');
const unsetValue = Symbol('gluon.unset');
const emptyComponentStyles: readonly ComponentStyleDependency[] = Object.freeze([]);

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

type InternalRepeatResult = RepeatResult & {
  readonly [repeatKeys]: readonly Key[];
  readonly [repeatValues]: readonly TemplateValue[];
};

export class TemplateResult {
  constructor(
    readonly strings: TemplateStringsArray,
    readonly values: readonly TemplateValue[],
    readonly type: TemplateType = 'html',
    readonly styleDependencies: readonly ComponentStyleDependency[] = emptyComponentStyles,
  ) {}

  /** Returns the same template value with immutable component-style metadata. */
  withStyleDependencies(
    dependencies: readonly ComponentStyleDependency[],
  ): TemplateResult {
    const byId = new Map(this.styleDependencies.map((dependency) => [dependency.id, dependency]));
    for (const dependency of dependencies) {
      const current = byId.get(dependency.id);
      if (current && current.sheet !== dependency.sheet) {
        throw new Error(`Component stylesheet id ${dependency.id} maps to multiple sheet identities.`);
      }
      byId.set(dependency.id, dependency);
    }
    return new TemplateResult(
      this.strings,
      this.values,
      this.type,
      Object.freeze([...byId.values()].sort(compareComponentStyles)),
    );
  }
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
 * Creates an SVG template result. Root and rootless SVG fragments are parsed
 * in the SVG namespace.
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
  const itemKeys: Key[] = [];
  const itemValues: TemplateValue[] = [];
  let seenKeys: Set<Key> | undefined;
  let sequentialNumericKeys = true;
  let index = 0;

  for (const item of items) {
    const itemKey = key(item, index);
    if (!isKey(itemKey)) {
      throw new TypeError(`repeat() received a missing key at index ${index}.`);
    }
    if (sequentialNumericKeys && typeof itemKey === 'number' && itemKey === index) {
      // The common index-keyed case is inherently unique and needs no Set.
    } else {
      if (sequentialNumericKeys) {
        seenKeys = new Set(itemKeys);
        sequentialNumericKeys = false;
      }
      if (seenKeys!.has(itemKey)) {
        throw new Error(`repeat() received the duplicate key ${formatKey(itemKey)} at index ${index}.`);
      }
      seenKeys!.add(itemKey);
    }

    itemKeys.push(itemKey);
    itemValues.push(renderItem(item, index));
    index += 1;
  }

  let exposedItems: readonly KeyedItem[] | undefined;
  const result = {
    [repeatResultBrand]: true as const,
    [repeatKeys]: itemKeys,
    [repeatValues]: itemValues,
    get items(): readonly KeyedItem[] {
      if (!exposedItems) {
        exposedItems = Object.freeze(itemKeys.map((itemKey, itemIndex) => Object.freeze({
          key: itemKey,
          value: itemValues[itemIndex]!,
        })));
      }
      return exposedItems;
    },
  };
  return Object.freeze(result);
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

function isRepeatResult(value: unknown): value is InternalRepeatResult {
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
  setValue(value: TemplateValue, assumeInPlace?: boolean): void;
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

export type TemplateValueServerContract =
  | { readonly kind: 'repeat'; readonly items: readonly KeyedItem[] }
  | { readonly kind: 'unsafe-html'; readonly markup: string }
  | { readonly kind: 'unsafe-url'; readonly value: string }
  | { readonly kind: 'event' | 'directive' };

/** Exposes only the DOM-free value information required by the server renderer. */
export function getTemplateValueServerContract(
  value: unknown,
): TemplateValueServerContract | undefined {
  if (isRepeatResult(value)) return { kind: 'repeat', items: value.items };
  if (isUnsafeHtmlResult(value)) return { kind: 'unsafe-html', markup: value.markup };
  if (isUnsafeUrlResult(value)) return { kind: 'unsafe-url', value: value.value };
  if (isEventBinding(value)) return { kind: 'event' };
  if (isDirectiveValue(value)) return { kind: 'directive' };
  return undefined;
}

/** Returns the exact ordered component styles reachable from a prepared value tree. */
export function createComponentStyleSelection(value: TemplateValue): StyleSheetSelection {
  const dependencies = new Map<string, ComponentStyleDependency>();
  collectComponentStyles(value, dependencies);
  return createStyleSheetSelection([...dependencies.values()]
    .sort(compareComponentStyles)
    .map(({ id, sheet, scope = 'gluon-component' }) => ({ id, sheet, scope })));
}

function collectComponentStyles(
  value: unknown,
  dependencies: Map<string, ComponentStyleDependency>,
): void {
  if (Array.isArray(value)) {
    for (const child of value) collectComponentStyles(child, dependencies);
    return;
  }
  if (isTemplateResult(value)) {
    for (const dependency of value.styleDependencies) {
      const current = dependencies.get(dependency.id);
      if (current && current.sheet !== dependency.sheet) {
        throw new Error(`Component stylesheet id ${dependency.id} maps to multiple sheet identities.`);
      }
      dependencies.set(dependency.id, dependency);
    }
    for (const child of value.values) collectComponentStyles(child, dependencies);
    return;
  }
  if (isRepeatResult(value)) {
    for (const child of value[repeatValues]) collectComponentStyles(child, dependencies);
  }
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
  | { readonly kind: 'node'; readonly index: number; readonly path: readonly number[]; readonly traversalIndex: number; readonly seededText: true }
  | { readonly kind: 'attribute'; readonly index: number; readonly path: readonly number[]; readonly traversalIndex: number; readonly name: string }
  | { readonly kind: 'spread'; readonly index: number; readonly path: readonly number[]; readonly traversalIndex: number };

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
  readonly content: DocumentFragment;
  readonly singleRoot?: Node;
  readonly anchorlessPrimitiveRoot?: Element;
  readonly strings: TemplateStringsArray;
  readonly type: TemplateType;
  readonly descriptors: readonly PartDescriptor[];
  readonly traversalDescriptors: readonly PartDescriptor[];
  readonly rootNodesStable: boolean;
  primitiveKeyedPrototypes?: Map<Key, PrimitiveKeyedPrototype>;
}

interface PrimitiveKeyedPrototype {
  readonly attributeValue: TemplateValue;
  readonly textValue: string;
  readonly element: Element;
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

interface PartKeyedChild {
  readonly key: Key;
  part: NodePart;
  binding?: Binding;
}

interface LazyPrimitiveKeyedChild {
  readonly key: Key;
  readonly lazyPrimitive: true;
  readonly template: CompiledTemplate;
  nodes?: Node[];
  readonly element: Element;
  readonly text: Text;
  values: readonly TemplateValue[];
  part?: NodePart;
  binding?: Binding;
}

type KeyedChild = PartKeyedChild | LazyPrimitiveKeyedChild;

interface PreviousKeyedChild {
  readonly child: KeyedChild;
  readonly index: number;
  readonly nodes: readonly Node[];
}

interface LazyPrimitivePlan {
  readonly compiled: CompiledTemplate;
  readonly prototype: Element;
  readonly attributeName: string;
}

const emptyPartChildren: Array<PartChild | undefined> = [];
const emptyKeyedChildren: KeyedChild[] = [];

class RenderStyleTracker {
  readonly target: StyleTarget;
  private owner?: ComponentStyleOwner;
  private readonly claims = new WeakMap<object, readonly ComponentStyleDependency[]>();
  private readonly active = new Map<string, { count: number; dependency: ComponentStyleDependency }>();
  private suspended = false;
  private disposed = false;

  constructor(target: StyleTarget) {
    this.target = target;
    this.owner = createComponentStyleOwner(target);
  }

  get isActiveAndEmpty(): boolean {
    return !this.suspended && !this.disposed && this.active.size === 0;
  }

  claim(token: object, dependencies: readonly ComponentStyleDependency[]): void {
    if (this.disposed) return;
    const previous = this.claims.get(token) ?? emptyComponentStyles;
    if (sameComponentStyles(previous, dependencies)) return;
    const next = Object.freeze([...dependencies].sort(compareComponentStyles));
    const nextIds = new Set(next.map((dependency) => dependency.id));
    for (const dependency of previous) {
      if (nextIds.has(dependency.id)) continue;
      this.release(dependency);
    }
    const previousIds = new Set(previous.map((dependency) => dependency.id));
    for (const dependency of next) {
      if (previousIds.has(dependency.id)) continue;
      this.retain(dependency);
    }
    this.claims.set(token, next);
  }

  suspend(): void {
    if (this.disposed || this.suspended) return;
    this.suspended = true;
    this.owner?.dispose();
    this.owner = undefined;
  }

  resume(): void {
    if (this.disposed || !this.suspended) return;
    this.suspended = false;
    this.owner = createComponentStyleOwner(this.target);
    this.owner.retain(...[...this.active.values()]
      .map(({ dependency }) => dependency)
      .sort(compareComponentStyles));
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.owner?.dispose();
    this.owner = undefined;
    this.active.clear();
  }

  private retain(dependency: ComponentStyleDependency): void {
    const current = this.active.get(dependency.id);
    if (current) {
      if (current.dependency.sheet !== dependency.sheet) {
        throw new Error(`Component stylesheet id ${dependency.id} changed identity without HMR replacement.`);
      }
      current.count += 1;
      return;
    }
    this.active.set(dependency.id, { count: 1, dependency });
    if (!this.suspended) this.owner?.retain(dependency);
  }

  private release(dependency: ComponentStyleDependency): void {
    const current = this.active.get(dependency.id);
    if (!current) return;
    current.count -= 1;
    if (current.count > 0) return;
    this.active.delete(dependency.id);
    if (!this.suspended) this.owner?.release(current.dependency);
  }
}

function sameComponentStyles(
  left: readonly ComponentStyleDependency[],
  right: readonly ComponentStyleDependency[],
): boolean {
  if (left.length !== right.length) return false;
  return left.every((dependency, index) => (
    dependency.id === right[index]?.id && dependency.sheet === right[index]?.sheet
  ));
}

class NodePart implements Part {
  nodes: Node[] = [];
  private textNode?: Text;
  private lastPrimitive: PrimitiveValue | typeof unsetValue = unsetValue;
  private child?: ChildInstance;
  private arrayChildren: Array<PartChild | undefined> = emptyPartChildren;
  private keyedChildren: KeyedChild[] = emptyKeyedChildren;
  private detachedKeyMarker?: Comment;
  private unsafeMarkup?: string;
  private styleDependencies: readonly ComponentStyleDependency[] = emptyComponentStyles;
  private seededText = false;

  constructor(
    private readonly marker: Comment,
    private readonly contextMarker: Comment = marker,
    private readonly styles?: RenderStyleTracker,
    seededText?: Text,
  ) {
    if (!seededText) return;
    this.seededText = true;
    this.nodes = [seededText];
    this.textNode = seededText;
    this.lastPrimitive = '';
  }

  hydrateValue(value: TemplateValue, end: Comment, context: HydrationAdoptionContext): void {
    this.updateStyleClaim(value);
    this.nodes = collectNodesUntil(this.marker, end);
    if (isEmptyValue(value)) return;
    if (isRenderablePrimitive(value)) {
      if (value === '' && this.nodes.length === 0) {
        this.lastPrimitive = value;
        return;
      }
      const node = this.nodes.length === 1 ? this.nodes[0] : undefined;
      if (!(node instanceof Text)) throw new Error('A hydrated primitive requires one text node.');
      this.textNode = node;
      this.lastPrimitive = value;
      return;
    }
    if (isTemplateResult(value)) {
      this.child = hydrateChildInstance(value, this.marker, end, context);
      this.nodes = collectNodesUntil(this.marker, end);
      return;
    }
    if (Array.isArray(value)) {
      const children: Array<PartChild | undefined> = [];
      for (let index = 0; index < value.length; index += 1) {
        const childValue = value[index]!;
        const range = takeHydrationRange(context, 'i');
        const part = new NodePart(range.start, this.contextMarker, this.styles);
        const binding: Binding = { index: 0, part, priority: 0 };
        part.hydrateValue(childValue, range.end, context);
        range.end.remove();
        children[index] = { marker: range.start, part, binding };
      }
      this.arrayChildren = children;
      this.nodes = collectNodesUntil(this.marker, end);
      return;
    }
    if (isRepeatResult(value)) {
      const children: KeyedChild[] = [];
      for (let index = 0; index < value[repeatKeys].length; index += 1) {
        const range = takeHydrationRange(context, 'k');
        const part = new NodePart(range.start, this.contextMarker, this.styles);
        part.hydrateValue(value[repeatValues][index]!, range.end, context);
        range.start.remove();
        range.end.remove();
        children.push({ key: value[repeatKeys][index]!, part });
      }
      this.keyedChildren = children;
      this.nodes = collectNodesUntil(this.marker, end);
      return;
    }
    if (isUnsafeHtmlResult(value)) {
      this.unsafeMarkup = value.markup;
      return;
    }
    throw new Error('The prepared hydration value is not supported by the DOM renderer.');
  }

  setStringValue(value: string, assumeInPlace = false): void {
    this.updateStyleClaim(value);
    if (!this.textNode) {
      this.setValue(value, assumeInPlace);
      return;
    }
    if (value !== this.lastPrimitive) {
      this.textNode.data = value;
      this.lastPrimitive = value;
    }
    if (!assumeInPlace && this.textNode.previousSibling !== this.marker) {
      this.replaceNodes([this.textNode]);
    }
  }

  setStableStringValue(value: string): void {
    if (!this.textNode || this.textNode.previousSibling !== this.marker) {
      this.setStringValue(value);
      return;
    }
    if (value !== this.lastPrimitive) {
      this.textNode.data = value;
      this.lastPrimitive = value;
    }
  }

  setValue(value: TemplateValue, assumeInPlace = false): void {
    this.updateStyleClaim(value);
    if (isTemplateResult(value)) {
      this.setTemplate(value, assumeInPlace);
      return;
    }

    if (isRepeatResult(value)) {
      this.setKeyed(value);
      return;
    }

    if (isEmptyValue(value)) {
      this.resetChildren();
      this.replaceNodes([]);
      return;
    }

    if (isRenderablePrimitive(value)) {
      if (this.textNode) {
        if (!Object.is(value, this.lastPrimitive)) {
          this.textNode.data = String(value);
          this.lastPrimitive = value;
        }
        if (!assumeInPlace && this.textNode.previousSibling !== this.marker) {
          this.replaceNodes([this.textNode]);
        }
      } else {
        const text = document.createTextNode(String(value));
        this.textNode = text;
        this.lastPrimitive = value;
        this.replaceNodes([text]);
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

    this.resetChildren();

    if (value instanceof Node) {
      this.textNode = undefined;
      this.lastPrimitive = unsetValue;
      this.replaceNodes([value]);
      return;
    }

    const text = document.createTextNode(String(value));
    this.textNode = text;
    this.lastPrimitive = value as unknown as PrimitiveValue;
    this.replaceNodes([text]);
  }

  disconnect(): void {
    this.styles?.claim(this, emptyComponentStyles);
    this.styleDependencies = emptyComponentStyles;
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
    for (const child of this.keyedChildren) {
      if (child.binding) suspendBindings([child.binding]);
      else if (child.part) child.part.suspend();
    }
  }

  private setTemplate(result: TemplateResult, assumeInPlace = false): void {
    const currentChild = this.child;
    if (assumeInPlace && currentChild?.template.strings === result.strings) {
      applyBindings(currentChild.bindings, result.values, true);
      this.nodes = currentChild.nodes;
      this.textNode = undefined;
      this.lastPrimitive = unsetValue;
      return;
    }

    const compiled = getCompiledTemplate(result);

    if (
      this.child?.template === compiled
      && (assumeInPlace || nodesAreInPlace(this.marker, this.nodes))
    ) {
      const boundary = this.nodes.length > 0
        ? this.nodes[this.nodes.length - 1]!.nextSibling
        : this.marker.nextSibling;
      applyBindings(this.child.bindings, result.values, assumeInPlace);
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
    this.child = createChildInstance(result, compiled, this.styles);
    this.textNode = undefined;
    this.lastPrimitive = unsetValue;
    this.replaceNodes(this.child.nodes);
  }

  setTemplateResult(result: TemplateResult, assumeInPlace = false): void {
    this.updateStyleClaim(result);
    this.setTemplate(result, assumeInPlace);
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

    for (let index = 0; index < flatValues.length; index += 1) {
      const value = flatValues[index]!;
      if (isEmptyValue(value)) continue;
      const cached = this.arrayChildren[index];
      const instance = cached ?? this.createPartChild(value);
      if (cached) applyBindings([cached.binding], [value]);
      nextChildren[index] = instance;
      nextNodes.push(instance.marker, ...instance.part.nodes);
    }

    for (let index = 0; index < this.arrayChildren.length; index += 1) {
      const previous = this.arrayChildren[index];
      if (previous && previous !== nextChildren[index]) disconnectBindings([previous.binding]);
    }

    this.arrayChildren = nextChildren;
    this.textNode = undefined;
    this.lastPrimitive = unsetValue;
    this.replaceNodes(nextNodes);
  }

  private setKeyed(result: InternalRepeatResult): void {
    const keys = result[repeatKeys];
    const values = result[repeatValues];

    if (this.child) {
      disconnectBindings(this.child.bindings);
      this.child = undefined;
    }
    if (this.arrayChildren.length > 0) this.disconnectArrayChildren();
    this.unsafeMarkup = undefined;

    let sameOrder = this.keyedChildren.length === keys.length;
    for (let index = 0; sameOrder && index < keys.length; index += 1) {
      sameOrder = this.keyedChildren[index]!.key === keys[index];
    }
    if (sameOrder) {
      this.updateKeyedInOrder(keys, values);
      return;
    }

    let reverseOrder = this.keyedChildren.length === keys.length && keys.length > 1;
    for (let index = 0; reverseOrder && index < keys.length; index += 1) {
      reverseOrder = this.keyedChildren[index]!.key === keys[keys.length - index - 1];
    }
    if (reverseOrder && this.marker.parentNode) {
      const parent = this.marker.parentNode;
      const reference = this.marker.nextSibling;
      const nextChildren: KeyedChild[] = [];
      const nextNodes: Node[] = [];

      for (let index = 0; index < keys.length; index += 1) {
        const child = this.keyedChildren[keys.length - index - 1]!;
        const value = values[index]!;
        this.updateKeyedChild(child, value, true);
        const childNodes = keyedChildNodes(child);
        if (childNodes[0] !== reference) moveNodesBefore(parent, childNodes, reference);
        nextChildren.push(child);
        nextNodes.push(...childNodes);
      }

      this.keyedChildren = nextChildren;
      this.nodes = nextNodes;
      this.textNode = undefined;
      this.lastPrimitive = unsetValue;
      return;
    }

    if (this.keyedChildren.length === 0) {
      const lazyPlan = createLazyPrimitivePlan(values[0]);
      const nextChildren: KeyedChild[] = new Array(keys.length);
      const nextNodes: Node[] = [];
      for (let index = 0; index < keys.length; index += 1) {
        const child = this.createKeyedChild(keys[index]!, values[index]!, lazyPlan);
        nextChildren[index] = child;
        if (isLazyPrimitiveKeyedChild(child) && !child.part && !child.nodes) {
          nextNodes.push(child.element);
        } else {
          nextNodes.push(...keyedChildNodes(child));
        }
      }
      this.keyedChildren = nextChildren;
      this.textNode = undefined;
      this.lastPrimitive = unsetValue;
      this.replaceNodes(nextNodes);
      return;
    }

    const previousChildren = this.keyedChildren;
    const previousNodes = this.nodes;
    const parent = this.marker.parentNode;
    const nodesInPlace = Boolean(parent && nodesAreInPlace(this.marker, previousNodes));
    const boundary = nodesInPlace && previousNodes.length > 0
      ? previousNodes[previousNodes.length - 1]!.nextSibling
      : this.marker.nextSibling;
    const nextChildren = new Array<KeyedChild>(keys.length);
    const reused = new Array<PreviousKeyedChild | undefined>(keys.length);
    const nextNodes: Node[] = [];

    let start = 0;
    let previousEnd = previousChildren.length;
    let nextEnd = keys.length;

    while (start < previousEnd && start < nextEnd && previousChildren[start]!.key === keys[start]) {
      const child = previousChildren[start]!;
      reused[start] = { child, index: start, nodes: keyedChildNodes(child) };
      this.updateKeyedChild(child, values[start]!, true);
      nextChildren[start] = child;
      start += 1;
    }

    while (
      start < previousEnd
      && start < nextEnd
      && previousChildren[previousEnd - 1]!.key === keys[nextEnd - 1]
    ) {
      previousEnd -= 1;
      nextEnd -= 1;
      const child = previousChildren[previousEnd]!;
      reused[nextEnd] = { child, index: previousEnd, nodes: keyedChildNodes(child) };
      this.updateKeyedChild(child, values[nextEnd]!, true);
      nextChildren[nextEnd] = child;
    }

    const previousByKey = new Map<Key, PreviousKeyedChild>();
    for (let index = start; index < previousEnd; index += 1) {
      const child = previousChildren[index]!;
      previousByKey.set(child.key, { child, index, nodes: keyedChildNodes(child) });
    }

    const nextMiddleKeys = new Set<Key>();
    for (let index = start; index < nextEnd; index += 1) nextMiddleKeys.add(keys[index]!);
    for (const [key, { child: removed }] of previousByKey) {
      if (nextMiddleKeys.has(key)) continue;
      if (removed.binding) disconnectBindings([removed.binding]);
      else if (removed.part) removed.part.disconnect();
      previousByKey.delete(key);
    }

    for (let index = start; index < nextEnd; index += 1) {
      const key = keys[index]!;
      const value = values[index]!;
      const previous = previousByKey.get(key);
      const child = previous?.child ?? this.createKeyedChild(key, value);

      if (previous) {
        previousByKey.delete(key);
        reused[index] = previous;
        this.updateKeyedChild(child, value, true);
      }

      nextChildren[index] = child;
    }

    const nextNodeGroups = nextChildren.map(keyedChildNodes);
    for (const nodes of nextNodeGroups) nextNodes.push(...nodes);
    this.keyedChildren = nextChildren;
    this.textNode = undefined;
    this.lastPrimitive = unsetValue;
    if (!parent || !nodesInPlace) {
      this.replaceNodes(nextNodes);
      return;
    }

    const stable = longestStableKeyedRun(nextNodeGroups, reused);
    const keep = new Set(nextNodes);
    for (const node of previousNodes) {
      if (!keep.has(node) && node.parentNode === parent) parent.removeChild(node);
    }

    if (stable.length === 0) {
      moveKeyedNodeGroupsBefore(parent, nextNodeGroups, 0, nextNodeGroups.length, boundary);
    } else {
      const stableFirst = nextNodeGroups[stable.start]![0]!;
      moveKeyedNodeGroupsBefore(parent, nextNodeGroups, 0, stable.start, stableFirst);
      moveKeyedNodeGroupsBefore(
        parent,
        nextNodeGroups,
        stable.start + stable.length,
        nextNodeGroups.length,
        boundary,
      );
    }
    this.nodes = nextNodes;
  }

  private updateKeyedInOrder(keys: readonly Key[], values: readonly TemplateValue[]): void {
    for (let index = 0; index < keys.length; index += 1) {
      const child = this.keyedChildren[index]!;
      const value = values[index]!;
      this.updateKeyedChild(child, value, true);
    }
    this.textNode = undefined;
    this.lastPrimitive = unsetValue;
    if (!nodesAreInPlace(this.marker, this.nodes)) this.replaceNodes([...this.nodes]);
  }

  private updateKeyedChild(child: KeyedChild, value: TemplateValue, assumeInPlace: boolean): void {
    if (child.binding) {
      applyBinding(child.binding, value, assumeInPlace);
      return;
    }
    if (!child.part && isLazyPrimitiveKeyedChild(child)) {
      const attributeName = (child.template.descriptors[0] as Extract<PartDescriptor, { kind: 'attribute' }>).name;
      if (
        value instanceof TemplateResult
        && value.styleDependencies.length === 0
        && child.template.strings === value.strings
        && child.template.type === value.type
        && typeof value.values[1] === 'string'
        && (isEmptyValue(value.values[0]) || isFastAttributePrimitive(value.values[0]))
      ) {
        const previousAttribute = child.values[0];
        const nextAttribute = value.values[0];
        if (!Object.is(previousAttribute, nextAttribute)) {
          if (isEmptyValue(nextAttribute)) removeOwnedAttribute(child.element, attributeName);
          else child.element.setAttribute(attributeName, String(nextAttribute));
        }
        if (value.values[1] !== child.values[1]) child.text.data = value.values[1];
        child.values = value.values;
        return;
      }
      const attributePart = new AttributePart(
        child.element,
        attributeName,
        child.values[0],
      );
      const marker = document.createComment('gluon:lazy');
      child.element.insertBefore(marker, child.text);
      const textPart = new NodePart(marker, marker, this.styles, child.text);
      const templateChild: ChildInstance = {
        template: child.template,
        bindings: [
          { index: 0, part: attributePart, priority: 0 },
          { index: 1, part: textPart, priority: 0 },
        ],
        nodes: child.nodes ??= [child.element],
      };
      const part = new NodePart(this.detachedKeyMarker ??= document.createComment('gluon:key'), this.contextMarker, this.styles);
      part.adoptTemplateChild(templateChild);
      child.part = part;
    }
    const part = child.part!;
    if (value instanceof TemplateResult) {
      part.setTemplateResult(value, assumeInPlace);
      return;
    }
    if (typeof value === 'string') {
      part.setStringValue(value, assumeInPlace);
      return;
    }
    if (isRepeatResult(value)) {
      part.setRepeatResult(value);
      return;
    }
    if (isDirectiveValue(value)) {
      const binding: Binding = { index: 0, part, priority: 0 };
      child.binding = binding;
      applyDirective(binding, value);
      return;
    }
    part.setValue(value, assumeInPlace);
  }

  setRepeatResult(result: InternalRepeatResult): void {
    this.updateStyleClaim(result);
    this.setKeyed(result);
  }

  private createKeyedChild(
    key: Key,
    value: TemplateValue,
    lazyPlan?: LazyPrimitivePlan,
  ): KeyedChild {
    if (
      lazyPlan
      && value instanceof TemplateResult
      && value.styleDependencies.length === 0
      && value.strings === lazyPlan.compiled.strings
      && value.type === lazyPlan.compiled.type
      && typeof value.values[1] === 'string'
      && (isEmptyValue(value.values[0]) || isFastAttributePrimitive(value.values[0]))
    ) {
      return createLazyPrimitiveKeyedChild(key, value, lazyPlan);
    }
    if (value instanceof TemplateResult && value.styleDependencies.length === 0) {
      const plan = createLazyPrimitivePlan(value);
      if (plan) return createLazyPrimitiveKeyedChild(key, value, plan);
    }
    const marker = this.detachedKeyMarker ??= document.createComment('gluon:key');
    const part = new NodePart(marker, this.contextMarker, this.styles);
    const child = { key, part };
    this.updateKeyedChild(child, value, false);
    return child;
  }

  private createPartChild(value: TemplateValue, markerData = 'gluon:item'): PartChild {
    const marker = document.createComment(markerData);
    const part = new NodePart(marker, this.contextMarker, this.styles);
    const binding: Binding = { index: 0, part, priority: 0 };
    applyBinding(binding, value);
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

    if (this.seededText && nextNodes[0] !== this.nodes[0]) {
      const seededNode = this.nodes[0];
      seededNode?.parentNode?.removeChild(seededNode);
      this.nodes = [];
      this.textNode = undefined;
      this.seededText = false;
    }

    if (this.nodes.length === 0) {
      if (nextNodes.length === 1) {
        parent.insertBefore(nextNodes[0]!, this.marker.nextSibling);
        this.nodes = nextNodes;
        return;
      }
      const fragment = document.createDocumentFragment();
      fragment.append(...nextNodes);
      parent.insertBefore(fragment, this.marker.nextSibling);
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
    if (this.arrayChildren.length === 0) return;
    for (const child of this.arrayChildren) {
      if (child) disconnectBindings([child.binding]);
    }
    this.arrayChildren = emptyPartChildren;
  }

  private disconnectKeyedChildren(): void {
    if (this.keyedChildren.length === 0) return;
    for (const child of this.keyedChildren) {
      if (child.binding) disconnectBindings([child.binding]);
      else if (child.part) child.part.disconnect();
    }
    this.keyedChildren = emptyKeyedChildren;
  }

  clearStyleClaim(): void {
    this.updateStyleClaim(nothing);
  }

  adoptTemplateChild(child: ChildInstance): void {
    this.child = child;
    this.nodes = child.nodes;
  }

  private updateStyleClaim(value: TemplateValue): void {
    const next = isTemplateResult(value) ? value.styleDependencies : emptyComponentStyles;
    if (sameComponentStyles(this.styleDependencies, next)) return;
    this.styles?.claim(this, next);
    this.styleDependencies = next;
  }
}

class AttributePart implements Part {
  private lastValue: unknown;
  private event?: RetainedEvent;

  constructor(
    private readonly element: Element,
    private readonly name: string,
    initialValue: unknown = unsetValue,
  ) {
    this.lastValue = initialValue;
  }

  get commitPriority(): number {
    return this.name.startsWith('.') && isNativeFormControl(this.element) ? 1 : 0;
  }

  setValue(value: TemplateValue, assumeInPlace = false): void {
    if (assumeInPlace && value === this.lastValue) return;

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
      if (assumeInPlace || this.lastValue === unsetValue || getOwnedAttribute(this.element, this.name) !== null) {
        removeOwnedAttribute(this.element, this.name);
      }
    } else {
      const serialized = serializeAttributeValue(this.name, value);
      if (assumeInPlace || this.lastValue === unsetValue || getOwnedAttribute(this.element, this.name) !== serialized) {
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
    const next = resolveEvent(value);
    if (this.event && next && sameEventOptions(this.event.options, next.options)) {
      this.event.current = next.listener;
      return;
    }
    if (this.event) this.element.removeEventListener(eventName, this.event.listener, this.event.options);
    this.event = next ? retainEvent(next) : undefined;
    if (this.event) this.element.addEventListener(eventName, this.event.listener, this.event.options);
  }
}

interface ResolvedEvent {
  readonly listener: EventListenerOrEventListenerObject;
  readonly options?: boolean | AddEventListenerOptions;
}

interface RetainedEvent {
  current: EventListenerOrEventListenerObject;
  readonly listener: EventListener;
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
  private readonly events = new Map<string, RetainedEvent & { readonly eventName: string }>();
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

    for (const key of this.keys) {
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
    for (const key of this.keys) this.clearKey(key);
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

    if (previous && event && sameEventOptions(previous.options, event.options)) {
      previous.current = event.listener;
      return;
    }
    if (previous) {
      this.element.removeEventListener(previous.eventName, previous.listener, previous.options);
    }

    if (event) {
      const retained = Object.assign(retainEvent(event), { eventName });
      this.element.addEventListener(eventName, retained.listener, retained.options);
      this.events.set(key, retained);
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
  readonly styles: RenderStyleTracker;
  readonly styleClaim: object;
  readonly fastStringBinding?: Binding & { readonly part: NodePart };
  rootStyleDependenciesEmpty: boolean;
  nodes: Node[];
  suspended: boolean;
  hydrated?: boolean;
}

const templateCache: Record<TemplateType, WeakMap<TemplateStringsArray, CompiledTemplate>> = {
  html: new WeakMap(),
  svg: new WeakMap(),
};
let lastTemplateStrings: TemplateStringsArray | undefined;
let lastTemplateType: TemplateType | undefined;
let lastCompiledTemplate: CompiledTemplate | undefined;
const rootInstanceProperty = Symbol('gluon.root-instance');
type OwnedRoot = (Element | DocumentFragment) & { [rootInstanceProperty]?: RootInstance };

function getRootInstance(container: Element | DocumentFragment): RootInstance | undefined {
  return (container as OwnedRoot)[rootInstanceProperty];
}

function setRootInstance(container: Element | DocumentFragment, instance: RootInstance): void {
  (container as OwnedRoot)[rootInstanceProperty] = instance;
}

function clearRootInstance(container: Element | DocumentFragment): void {
  delete (container as OwnedRoot)[rootInstanceProperty];
}

export function render(
  result: TemplateResult,
  container: Element | DocumentFragment | null,
): void {
  if (!container) return;
  if (!isTemplateResult(result)) {
    throw new TypeError('render() expects a TemplateResult created by html or svg.');
  }

  let current = getRootInstance(container);
  const currentTemplateMatches = current?.template.strings === result.strings
    && current.template.type === result.type;
  const currentNodesInPlace = Boolean(current && currentTemplateMatches
    && rootNodesAreInPlace(container, current.nodes));
  const fastStringBinding = current?.fastStringBinding;
  const fastStringValue = fastStringBinding && fastStringBinding.index < result.values.length
    ? result.values[fastStringBinding.index]
    : undefined;
  if (
    current
    && currentNodesInPlace
    && !current.hydrated
    && current.rootStyleDependenciesEmpty
    && result.styleDependencies.length === 0
    && fastStringBinding
    && typeof fastStringValue === 'string'
    && !fastStringBinding.directive
  ) {
    fastStringBinding.part.setStableStringValue(fastStringValue);
    current.suspended = false;
    return;
  }
  if (
    current
    && currentNodesInPlace
    && !current.suspended
    && !current.hydrated
    && result.styleDependencies.length === 0
    && current.styles.isActiveAndEmpty
  ) {
    applyBindings(current.bindings, result.values);
    if (!current.template.rootNodesStable && !rootNodesAreInPlace(container, current.nodes)) {
      current.nodes = [...container.childNodes];
    }
    return;
  }

  const compiled = currentTemplateMatches ? current!.template : getCompiledTemplate(result);
  const styleTarget = resolveRenderStyleTarget(container);
  if (current && current.styles.target !== styleTarget) {
    clearRootInstance(container);
    disconnectBindings(current.bindings);
    current.styles.dispose();
    current = undefined;
  }

  if (
    current?.template === compiled
    && (currentNodesInPlace || rootNodesAreInPlace(container, current.nodes))
  ) {
    current.styles.resume();
    current.styles.claim(current.styleClaim, result.styleDependencies);
    current.rootStyleDependenciesEmpty = result.styleDependencies.length === 0;
    if (current.hydrated) {
      current.hydrated = false;
      current.suspended = false;
      return;
    }
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

  const styles = current?.styles ?? new RenderStyleTracker(styleTarget);
  const styleClaim = current?.styleClaim ?? {};
  styles.resume();
  styles.claim(styleClaim, result.styleDependencies);
  if (current) {
    clearRootInstance(container);
    disconnectBindings(current.bindings);
  }

  try {
    const fragment = cloneTemplateContent(compiled);
    const bindings = instantiateBindings(fragment, compiled.traversalDescriptors, styles);
    applyBindings(bindings, result.values);
    const nodes = [...fragment.childNodes];
    container.replaceChildren(fragment);
    setRootInstance(container, {
      template: compiled,
      bindings,
      styles,
      styleClaim,
      fastStringBinding: findFastStringBinding(bindings),
      rootStyleDependenciesEmpty: result.styleDependencies.length === 0,
      nodes,
      suspended: false,
    });
  } catch (error) {
    styles.dispose();
    throw error;
  }
}

export type HydrationMismatchCategory = 'text' | 'attribute' | 'structure' | 'state' | 'style';

export interface HydrationMismatch {
  readonly code: `GLUON_HYDRATION_${Uppercase<HydrationMismatchCategory>}_MISMATCH`;
  readonly category: HydrationMismatchCategory;
  readonly path: string;
  readonly expected: string;
  readonly actual: string;
  readonly recovery: 'replace-root' | 'abort';
  readonly suppressed: boolean;
}

export interface HydrationOptions {
  readonly expectedMarkup: string;
  readonly recovery?: 'replace' | 'throw';
  readonly suppress?: boolean | readonly HydrationMismatchCategory[];
  readonly onMismatch?: (mismatch: HydrationMismatch) => void;
  readonly state?: { readonly server: unknown; readonly client: unknown };
}

export interface HydrationResult {
  readonly mismatches: readonly HydrationMismatch[];
  readonly retained: boolean;
  readonly recovered: boolean;
}

export class HydrationMismatchError extends Error {
  constructor(readonly mismatches: readonly HydrationMismatch[]) {
    super(`Hydration aborted with ${mismatches.length} mismatch${mismatches.length === 1 ? '' : 'es'}.`);
    this.name = 'HydrationMismatchError';
  }
}

/** Binds matching marker HTML in place and deterministically replaces or aborts on mismatch. */
export function hydrate(
  result: TemplateResult,
  container: Element | DocumentFragment | null,
  options: HydrationOptions,
): HydrationResult {
  if (!container) return Object.freeze({ mismatches: [], retained: false, recovered: false });
  if (!isTemplateResult(result)) throw new TypeError('hydrate() expects a TemplateResult created by html or svg.');
  const expectedTemplate = document.createElement('template');
  expectedTemplate.innerHTML = options.expectedMarkup;
  const mismatches: HydrationMismatch[] = [];
  compareHydrationNodes(
    [...expectedTemplate.content.childNodes],
    [...container.childNodes],
    'root',
    options,
    mismatches,
  );
  if (options.state && stableHydrationValue(options.state.server) !== stableHydrationValue(options.state.client)) {
    recordHydrationMismatch('state', 'state', options.state.server, options.state.client, options, mismatches);
  }
  if (mismatches.length > 0) {
    if (options.recovery === 'throw') throw new HydrationMismatchError(Object.freeze([...mismatches]));
    render(result, container);
    return Object.freeze({ mismatches: Object.freeze(mismatches), retained: false, recovered: true });
  }

  const styles = new RenderStyleTracker(resolveRenderStyleTarget(container));
  const styleClaim = {};
  styles.claim(styleClaim, result.styleDependencies);
  try {
    const context = createHydrationAdoptionContext(container, styles);
    const compiled = getCompiledTemplate(result);
    const bindings = instantiateHydratedBindings(compiled.descriptors, result.values, context);
    setRootInstance(container, {
      template: compiled,
      bindings,
      styles,
      styleClaim,
      fastStringBinding: findFastStringBinding(bindings),
      rootStyleDependenciesEmpty: result.styleDependencies.length === 0,
      nodes: [...container.childNodes],
      suspended: false,
      hydrated: true,
    });
    return Object.freeze({ mismatches: [], retained: true, recovered: false });
  } catch (error) {
    styles.dispose();
    recordHydrationMismatch('structure', 'root', 'valid hydration markers', error, options, mismatches);
    if (options.recovery === 'throw') throw new HydrationMismatchError(Object.freeze([...mismatches]));
    render(result, container);
    return Object.freeze({ mismatches: Object.freeze(mismatches), retained: false, recovered: true });
  }
}

/** Temporarily releases active listeners, refs, and directive resources. */
export function suspendRender(container: Element | DocumentFragment | null): void {
  if (!container) return;
  const current = getRootInstance(container);
  if (!current || current.suspended) return;
  current.suspended = true;
  suspendBindings(current.bindings);
}

/** Releases component sheets while retaining renderer DOM state for reconnection. */
export function releaseRenderStyles(container: Element | DocumentFragment | null): void {
  if (!container) return;
  getRootInstance(container)?.styles.suspend();
}

/** Permanently releases a render root and removes its renderer-owned DOM. */
export function unmount(container: Element | DocumentFragment | null): void {
  if (!container) return;
  const current = getRootInstance(container);
  try {
    if (current) {
      clearRootInstance(container);
      disconnectBindings(current.bindings);
      current.styles.dispose();
    }
  } finally {
    container.replaceChildren();
  }
}

function getCompiledTemplate(result: TemplateResult): CompiledTemplate {
  if (
    result.strings === lastTemplateStrings
    && result.type === lastTemplateType
    && lastCompiledTemplate
  ) return lastCompiledTemplate;

  const cached = templateCache[result.type].get(result.strings);
  if (cached) {
    lastTemplateStrings = result.strings;
    lastTemplateType = result.type;
    lastCompiledTemplate = cached;
    return cached;
  }

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
  if (result.type === 'svg') {
    element.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`;
    const wrapper = element.content.firstElementChild as SVGSVGElement;
    element.content.replaceChildren(...wrapper.childNodes);
  } else {
    element.innerHTML = markup;
  }
  const descriptors = buildDescriptors(element.content, attributeNames);
  const traversalDescriptors = [...descriptors].sort(
    (left, right) => left.traversalIndex - right.traversalIndex || left.index - right.index,
  );
  const expressionCount = result.strings.length - 1;

  if (descriptors.length !== expressionCount) {
    throw new Error(
      'Every Gluon expression must occupy a complete child or attribute value. '
      + 'Mixed attribute strings such as class="prefix ${value}" are not supported; '
      + 'compose the complete value before binding it.',
    );
  }

  const content = document.importNode(element.content, true);
  const singleRoot = content.childNodes.length === 1 ? content.firstChild! : undefined;
  const fastAttributeStringBindings = descriptors.length === 2
    && descriptors[0]?.kind === 'attribute'
    && !descriptors[0].name.startsWith('.')
    && descriptors[0].index === 0
    && descriptors[1]?.kind === 'node'
    && descriptors[1].index === 1;
  const canUseAnchorlessPrimitive = Boolean(
    fastAttributeStringBindings
    && singleRoot instanceof Element
    && descriptors[0]!.path.length === 1
    && descriptors[1]!.path.length === 2
    && descriptors[0]!.path[0] === descriptors[1]!.path[0]
    && singleRoot.childNodes.length === 2
    && singleRoot.firstChild instanceof Comment
    && singleRoot.lastChild instanceof Text,
  );
  const anchorlessPrimitiveRoot = canUseAnchorlessPrimitive
    ? singleRoot!.cloneNode(true) as Element
    : undefined;
  if (anchorlessPrimitiveRoot) anchorlessPrimitiveRoot.firstChild!.remove();
  const compiled: CompiledTemplate = {
    content,
    singleRoot,
    anchorlessPrimitiveRoot,
    strings: result.strings,
    type: result.type,
    descriptors,
    traversalDescriptors,
    rootNodesStable: descriptors.every((descriptor) => descriptor.kind !== 'node' || descriptor.path.length > 1),
  };
  templateCache[result.type].set(result.strings, compiled);
  lastTemplateStrings = result.strings;
  lastTemplateType = result.type;
  lastCompiledTemplate = compiled;
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
  let traversalIndex = -1;

  while (walker.nextNode()) {
    traversalIndex += 1;
    const node = walker.currentNode;

    if (node.nodeType === Node.COMMENT_NODE) {
      const match = (node as Comment).data.match(/^gluon:(\d+)$/);
      if (match?.[1]) {
        const seededText = document.createTextNode('');
        node.parentNode!.insertBefore(seededText, node.nextSibling);
        descriptors.push({
          kind: 'node',
          index: Number(match[1]),
          path: pathFromRoot(content, node),
          traversalIndex,
          seededText: true,
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
          ? { kind: 'spread', index, path: pathFromRoot(content, node), traversalIndex }
          : { kind: 'attribute', index, path: pathFromRoot(content, node), traversalIndex, name: originalName },
      );
      element.removeAttribute(attribute.name);
    }
  }

  descriptors.sort((left, right) => left.index - right.index);
  return descriptors;
}

function instantiateBindings(
  root: Node,
  descriptors: readonly PartDescriptor[],
  styles?: RenderStyleTracker,
  includeRoot = false,
): Binding[] {
  if (descriptors.length === 0) return [];
  const bindings = new Array<Binding>(descriptors.length);
  let node = includeRoot ? root : nextBindingNode(root, root);
  let traversalIndex = 0;

  for (const descriptor of descriptors) {
    while (node && traversalIndex < descriptor.traversalIndex) {
      node = nextBindingNode(root, node);
      traversalIndex += 1;
    }
    if (!node || traversalIndex !== descriptor.traversalIndex) {
      throw new Error('A cached Gluon template traversal index is no longer valid.');
    }
    let part: Part;

    if (descriptor.kind === 'node') {
      part = new NodePart(
        node as Comment,
        node as Comment,
        styles,
        descriptor.seededText ? node.nextSibling as Text : undefined,
      );
    }
    else if (descriptor.kind === 'spread') part = new SpreadPart(node as Element);
    else part = new AttributePart(node as Element, descriptor.name);

    bindings[descriptor.index] = { index: descriptor.index, part, priority: part.commitPriority ?? 0 };
  }
  return bindings;
}

function nextBindingNode(root: Node, current: Node): Node | null {
  let node = current;
  while (true) {
    if (node.firstChild) {
      node = node.firstChild;
    } else {
      while (node !== root && !node.nextSibling) node = node.parentNode!;
      if (node === root) return null;
      node = node.nextSibling!;
    }
    if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.COMMENT_NODE) return node;
  }
}

function cloneTemplateContent(template: CompiledTemplate): DocumentFragment {
  return template.content.cloneNode(true) as DocumentFragment;
}

interface HydrationRange {
  readonly start: Comment;
  readonly end: Comment;
}

interface HydrationAdoptionContext {
  marker: number;
  readonly ranges: Map<string, HydrationRange>;
  readonly attributes: Map<number, Element>;
  readonly styles: RenderStyleTracker;
}

function createHydrationAdoptionContext(
  root: Element | DocumentFragment,
  styles: RenderStyleTracker,
): HydrationAdoptionContext {
  const ranges = new Map<string, HydrationRange>();
  const starts = new Map<string, Comment>();
  const attributes = new Map<number, Element>();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node instanceof Comment) {
      const start = node.data.match(/^gluon:([hik]):(\d+)$/);
      if (start?.[1] && start[2]) starts.set(`${start[1]}:${start[2]}`, node);
      const end = node.data.match(/^gluon:\/([hik]):(\d+)$/);
      if (end?.[1] && end[2]) {
        const key = `${end[1]}:${end[2]}`;
        const opening = starts.get(key);
        if (opening) ranges.set(key, { start: opening, end: node });
      }
      continue;
    }
    for (const attribute of [...(node as Element).attributes]) {
      const match = attribute.name.match(/^data-gluon-h-(\d+)$/);
      if (match?.[1]) attributes.set(Number(match[1]), node as Element);
    }
  }
  return { marker: 0, ranges, attributes, styles };
}

function instantiateHydratedBindings(
  descriptors: readonly PartDescriptor[],
  values: readonly TemplateValue[],
  context: HydrationAdoptionContext,
): Binding[] {
  const bindings: Binding[] = [];
  for (const descriptor of descriptors) {
    const marker = context.marker++;
    const value = descriptor.index < values.length ? values[descriptor.index]! : nothing;
    let part: Part;
    if (descriptor.kind === 'node') {
      const range = context.ranges.get(`h:${marker}`);
      if (!range) throw new Error(`Missing child hydration marker ${marker}.`);
      const nodePart = new NodePart(range.start, range.start, context.styles);
      nodePart.hydrateValue(value, range.end, context);
      range.end.remove();
      part = nodePart;
    } else {
      const element = context.attributes.get(marker);
      if (!element) throw new Error(`Missing attribute hydration marker ${marker}.`);
      element.removeAttribute(`data-gluon-h-${marker}`);
      part = descriptor.kind === 'spread'
        ? new SpreadPart(element)
        : new AttributePart(element, descriptor.name);
      part.setValue(value, true);
    }
    bindings.push({ index: descriptor.index, part, priority: part.commitPriority ?? 0 });
  }
  return bindings;
}

function hydrateChildInstance(
  result: TemplateResult,
  start: Comment,
  end: Comment,
  context: HydrationAdoptionContext,
): ChildInstance {
  const compiled = getCompiledTemplate(result);
  const bindings = instantiateHydratedBindings(compiled.descriptors, result.values, context);
  return {
    template: compiled,
    bindings,
    nodes: collectNodesUntil(start, end),
  };
}

function takeHydrationRange(
  context: HydrationAdoptionContext,
  kind: 'i' | 'k',
): HydrationRange {
  const marker = context.marker++;
  const range = context.ranges.get(`${kind}:${marker}`);
  if (!range) throw new Error(`Missing ${kind === 'i' ? 'array' : 'keyed'} hydration marker ${marker}.`);
  return range;
}

function createChildInstance(
  result: TemplateResult,
  compiled = getCompiledTemplate(result),
  styles?: RenderStyleTracker,
): ChildInstance {
  const clone = compiled.singleRoot
    ? compiled.singleRoot.cloneNode(true)
    : cloneTemplateContent(compiled);
  const bindings = instantiateBindings(
    clone,
    compiled.traversalDescriptors,
    styles,
    Boolean(compiled.singleRoot),
  );
  applyBindings(bindings, result.values);
  const nodes = compiled.singleRoot ? [clone] : [...clone.childNodes];
  return { template: compiled, bindings, nodes };
}

function findFastStringBinding(
  bindings: readonly Binding[],
): Binding & { readonly part: NodePart } | undefined {
  const binding = bindings.length === 1 ? bindings[0] : undefined;
  return binding?.part instanceof NodePart
    ? binding as Binding & { readonly part: NodePart }
    : undefined;
}

function keyedChildNodes(child: KeyedChild): Node[] {
  if (!isLazyPrimitiveKeyedChild(child)) return child.part.nodes;
  return child.part?.nodes ?? (child.nodes ??= [child.element]);
}

function isLazyPrimitiveKeyedChild(child: KeyedChild): child is LazyPrimitiveKeyedChild {
  return 'lazyPrimitive' in child;
}

function createLazyPrimitivePlan(
  value: TemplateValue | undefined,
  knownCompiled?: CompiledTemplate,
): LazyPrimitivePlan | undefined {
  if (!(value instanceof TemplateResult) || value.styleDependencies.length !== 0) return undefined;
  const compiled = knownCompiled ?? getCompiledTemplate(value);
  const prototype = compiled.anchorlessPrimitiveRoot;
  const descriptor = compiled.descriptors[0];
  if (
    !prototype
    || descriptor?.kind !== 'attribute'
    || descriptor.name.startsWith('@')
    || descriptor.name.startsWith('?')
    || /^on/i.test(descriptor.name)
    || getAttributeNamespace(descriptor.name)
    || urlAttributes.has(descriptor.name.toLowerCase())
    || typeof value.values[1] !== 'string'
    || (!isEmptyValue(value.values[0]) && !isFastAttributePrimitive(value.values[0]))
  ) return undefined;
  return { compiled, prototype, attributeName: descriptor.name };
}

function createLazyPrimitiveKeyedChild(
  key: Key,
  value: TemplateResult,
  plan: LazyPrimitivePlan,
): LazyPrimitiveKeyedChild {
  const attributeValue = value.values[0];
  const textValue = value.values[1] as string;
  const cached = plan.compiled.primitiveKeyedPrototypes?.get(key);
  const cacheHit = cached
    && (Object.is(cached.attributeValue, attributeValue)
      || (isEmptyValue(cached.attributeValue) && isEmptyValue(attributeValue)))
    && cached.textValue === textValue;
  const element = (cacheHit ? cached.element : plan.prototype).cloneNode(true) as Element;
  const text = element.firstChild as Text;
  if (!cacheHit) {
    if (!isEmptyValue(attributeValue)) {
      element.setAttribute(plan.attributeName, String(attributeValue));
    }
    text.data = textValue;
    const cache = plan.compiled.primitiveKeyedPrototypes ??= new Map();
    if (!cache.has(key) && cache.size >= 1_024) cache.delete(cache.keys().next().value!);
    cache.set(key, { attributeValue, textValue, element: element.cloneNode(true) as Element });
  }
  return {
    key,
    lazyPrimitive: true,
    template: plan.compiled,
    values: value.values,
    element,
    text,
  };
}

function isFastAttributePrimitive(value: unknown): value is string | number | bigint | true {
  return typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'bigint'
    || value === true;
}

function resolveRenderStyleTarget(container: Element | DocumentFragment): StyleTarget {
  if (container instanceof ShadowRoot) return container;
  const root = container.getRootNode();
  if (root instanceof ShadowRoot) return root;
  return container.ownerDocument ?? document;
}

function applyBindings(
  bindings: readonly Binding[],
  values: readonly TemplateValue[],
  assumeInPlace = false,
): void {
  if (bindings.length === 1 && bindings[0]!.priority === 0) {
    applyBinding(bindings[0]!, bindings[0]!.index < values.length
      ? values[bindings[0]!.index]!
      : nothing, assumeInPlace);
    return;
  }

  if (bindings.length === 2 && bindings[0]!.priority === 0 && bindings[1]!.priority === 0) {
    const first = bindings[0]!;
    const second = bindings[1]!;
    const firstValue = first.index < values.length ? values[first.index]! : nothing;
    const secondValue = second.index < values.length ? values[second.index]! : nothing;
    if (
      first.part instanceof AttributePart
      && second.part instanceof NodePart
      && !first.directive
      && !second.directive
      && !isDirectiveValue(firstValue)
      && typeof secondValue === 'string'
    ) {
      first.part.setValue(firstValue, assumeInPlace);
      second.part.setStringValue(secondValue, assumeInPlace);
      return;
    }
    applyBinding(bindings[0]!, bindings[0]!.index < values.length
      ? values[bindings[0]!.index]!
      : nothing, assumeInPlace);
    applyBinding(bindings[1]!, bindings[1]!.index < values.length
      ? values[bindings[1]!.index]!
      : nothing, assumeInPlace);
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
      applyBinding(binding, binding.index < values.length ? values[binding.index]! : nothing, assumeInPlace);
    }
    return;
  }

  for (const priority of [0, 1]) {
    for (const binding of bindings) {
      if (binding.priority !== priority) continue;
      applyBinding(binding, binding.index < values.length ? values[binding.index]! : nothing, assumeInPlace);
    }
  }
}

function applyBinding(binding: Binding, value: TemplateValue, assumeInPlace = false): void {
  if (binding.part instanceof NodePart && !binding.directive) {
    if (typeof value === 'string') {
      binding.part.setStringValue(value, assumeInPlace);
      return;
    }
    if (isTemplateResult(value)) {
      binding.part.setTemplateResult(value, assumeInPlace);
      return;
    }
    if (isRepeatResult(value)) {
      binding.part.setRepeatResult(value);
      return;
    }
  }
  if (isDirectiveValue(value)) {
    if (binding.part instanceof NodePart) binding.part.clearStyleClaim();
    applyDirective(binding, value);
  } else {
    if (binding.directive) deactivateDirective(binding);
    binding.part.setValue(value, assumeInPlace);
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
      listener: value.listener,
      options: value.options,
    };
  }
  return isEventListener(value) ? { listener: value } : undefined;
}

function retainEvent(event: ResolvedEvent): RetainedEvent {
  const retained = {
    current: event.listener,
    listener: undefined as unknown as EventListener,
    options: event.options,
  };
  const dispatch = function retainedEventListener(this: EventTarget, value: Event): void {
    const current = retained.current;
    if (typeof current === 'function') return current.call(this, value);
    return current.handleEvent(value);
  };
  retained.listener = guardEventListener(dispatch) as EventListener;
  return retained;
}

function sameEventOptions(
  left: boolean | AddEventListenerOptions | undefined,
  right: boolean | AddEventListenerOptions | undefined,
): boolean {
  return eventCapture(left) === eventCapture(right)
    && eventOption(left, 'once') === eventOption(right, 'once')
    && eventOption(left, 'passive') === eventOption(right, 'passive')
    && eventSignal(left) === eventSignal(right);
}

function eventCapture(options: boolean | AddEventListenerOptions | undefined): boolean {
  return typeof options === 'boolean' ? options : options?.capture ?? false;
}

function eventOption(
  options: boolean | AddEventListenerOptions | undefined,
  name: 'once' | 'passive',
): boolean {
  return typeof options === 'object' ? options[name] ?? false : false;
}

function eventSignal(
  options: boolean | AddEventListenerOptions | undefined,
): AbortSignal | undefined {
  return typeof options === 'object' ? options.signal ?? undefined : undefined;
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
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]!;
    if (node !== cursor) return false;
    cursor = cursor.nextSibling;
  }
  return true;
}

function moveNodesBefore(parent: Node, nodes: readonly Node[], reference: Node | null): void {
  for (const node of nodes) parent.insertBefore(node, reference);
}

function longestStableKeyedRun(
  nextNodeGroups: readonly (readonly Node[])[],
  reused: readonly (PreviousKeyedChild | undefined)[],
): { readonly start: number; readonly length: number } {
  let longestStart = 0;
  let longestLength = 0;
  let currentStart = 0;
  let currentLength = 0;
  let previousIndex = -2;

  for (let index = 0; index < reused.length; index += 1) {
    const previous = reused[index];
    const nodes = nextNodeGroups[index]!;
    const stable = Boolean(
      previous
      && nodes.length > 0
      && sameNodes(previous.nodes, nodes),
    );
    if (stable && previous!.index === previousIndex + 1) {
      currentLength += 1;
    } else if (stable) {
      currentStart = index;
      currentLength = 1;
    } else {
      currentLength = 0;
    }
    previousIndex = stable ? previous!.index : -2;
    if (currentLength > longestLength) {
      longestStart = currentStart;
      longestLength = currentLength;
    }
  }

  return { start: longestStart, length: longestLength };
}

function sameNodes(left: readonly Node[], right: readonly Node[]): boolean {
  if (left === right) return true;
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function moveKeyedNodeGroupsBefore(
  parent: Node,
  groups: readonly (readonly Node[])[],
  start: number,
  end: number,
  boundary: Node | null,
): void {
  let reference = boundary;
  for (let index = end - 1; index >= start; index -= 1) {
    const nodes = groups[index]!;
    if (nodes.length === 0) continue;
    if (!nodesAreImmediatelyBefore(parent, nodes, reference)) {
      moveNodesBefore(parent, nodes, reference);
    }
    reference = nodes[0]!;
  }
}

function nodesAreImmediatelyBefore(
  parent: Node,
  nodes: readonly Node[],
  reference: Node | null,
): boolean {
  if (nodes[0]?.parentNode !== parent) return false;
  for (let index = 1; index < nodes.length; index += 1) {
    if (nodes[index - 1]!.nextSibling !== nodes[index]) return false;
  }
  return nodes[nodes.length - 1]!.nextSibling === reference;
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
    return container.firstChild === nodes[0] && nodes[0]!.nextSibling === null;
  }
  if (container.childNodes.length !== nodes.length) return false;
  for (let index = 0; index < nodes.length; index += 1) {
    if (container.childNodes.item(index) !== nodes[index]) return false;
  }
  return true;
}

function compareHydrationNodes(
  expected: readonly Node[],
  actual: readonly Node[],
  path: string,
  options: HydrationOptions,
  mismatches: HydrationMismatch[],
): void {
  if (expected.length !== actual.length) {
    recordHydrationMismatch('structure', path, `${expected.length} nodes`, `${actual.length} nodes`, options, mismatches);
    return;
  }
  for (let index = 0; index < expected.length; index += 1) {
    const expectedNode = expected[index]!;
    const actualNode = actual[index]!;
    const nodePath = `${path}/${index}`;
    if (expectedNode.nodeType !== actualNode.nodeType) {
      recordHydrationMismatch('structure', nodePath, describeNode(expectedNode), describeNode(actualNode), options, mismatches);
      continue;
    }
    if (expectedNode instanceof Text && actualNode instanceof Text) {
      if (expectedNode.data !== actualNode.data) {
        recordHydrationMismatch('text', nodePath, expectedNode.data, actualNode.data, options, mismatches);
      }
      continue;
    }
    if (expectedNode instanceof Comment && actualNode instanceof Comment) {
      if (expectedNode.data !== actualNode.data) {
        recordHydrationMismatch('structure', nodePath, expectedNode.data, actualNode.data, options, mismatches);
      }
      continue;
    }
    if (expectedNode instanceof Element && actualNode instanceof Element) {
      if (expectedNode.localName !== actualNode.localName || expectedNode.namespaceURI !== actualNode.namespaceURI) {
        recordHydrationMismatch('structure', nodePath, describeNode(expectedNode), describeNode(actualNode), options, mismatches);
        continue;
      }
      compareHydrationAttributes(expectedNode, actualNode, nodePath, options, mismatches);
      compareHydrationNodes(
        [...expectedNode.childNodes],
        [...actualNode.childNodes],
        nodePath,
        options,
        mismatches,
      );
    }
  }
}

function compareHydrationAttributes(
  expected: Element,
  actual: Element,
  path: string,
  options: HydrationOptions,
  mismatches: HydrationMismatch[],
): void {
  const names = new Set([
    ...[...expected.attributes].map((attribute) => attribute.name),
    ...[...actual.attributes].map((attribute) => attribute.name),
  ]);
  for (const name of names) {
    const expectedValue = expected.getAttribute(name);
    const actualValue = actual.getAttribute(name);
    if (expectedValue === actualValue || equivalentHydrationAttribute(name, expectedValue, actualValue, actual.ownerDocument.baseURI)) continue;
    recordHydrationMismatch(
      name === 'style' ? 'style' : 'attribute',
      `${path}@${name}`,
      expectedValue,
      actualValue,
      options,
      mismatches,
    );
  }
}

function equivalentHydrationAttribute(
  name: string,
  expected: string | null,
  actual: string | null,
  base: string,
): boolean {
  if (expected === null || actual === null || !urlAttributes.has(name.toLowerCase())) return false;
  try {
    return new URL(expected, base).href === new URL(actual, base).href;
  } catch {
    return false;
  }
}

function recordHydrationMismatch(
  category: HydrationMismatchCategory,
  path: string,
  expected: unknown,
  actual: unknown,
  options: HydrationOptions,
  mismatches: HydrationMismatch[],
): void {
  const suppressed = options.suppress === true
    || (Array.isArray(options.suppress) && options.suppress.includes(category));
  const mismatch = Object.freeze({
    code: `GLUON_HYDRATION_${category.toUpperCase()}_MISMATCH` as HydrationMismatch['code'],
    category,
    path,
    expected: formatHydrationValue(expected),
    actual: formatHydrationValue(actual),
    recovery: options.recovery === 'throw' ? 'abort' as const : 'replace-root' as const,
    suppressed,
  });
  mismatches.push(mismatch);
  if (!suppressed) options.onMismatch?.(mismatch);
}

function formatHydrationValue(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  return typeof value === 'string' ? value : stableHydrationValue(value);
}

function stableHydrationValue(value: unknown): string {
  try {
    return JSON.stringify(value, (_key, entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return entry;
      return Object.fromEntries(Object.entries(entry).sort(([left], [right]) => left.localeCompare(right)));
    }) ?? String(value);
  } catch {
    return String(value);
  }
}

function describeNode(node: Node): string {
  if (node instanceof Element) return `<${node.localName}>`;
  if (node instanceof Text) return `text(${JSON.stringify(node.data)})`;
  if (node instanceof Comment) return `comment(${JSON.stringify(node.data)})`;
  return `node(${node.nodeType})`;
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
