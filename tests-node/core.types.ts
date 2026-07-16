import {
  GluonElement,
  KeepAlive,
  LayoutTransition,
  Suspense,
  Teleport,
  Transition,
  TransitionGroup,
  createApp,
  createIntersectionObserver,
  createGluonElementRegistry,
  createRegistryShadowRoot,
  createMutationObserver,
  createResizeObserver,
  createVirtualizer,
  createInjectionKey,
  compose,
  directive,
  defineAsyncComponent,
  defineElement,
  defineGluonElement,
  dynamicComponent,
  elementEvent,
  elementProperty,
  elementRef,
  event,
  exposedRef,
  getBuiltinServerContract,
  getPublicInstance,
  html,
  model,
  repeat,
  renderScopedSlot,
  runWithErrorHandling,
  setGluonRenderDebugHook,
  suspendRender,
  unmount,
  unsafeHTML,
  unsafeURL,
  type GluonElementRegistry,
  type DirectiveLifecycle,
  type EventBinding,
  type EventDeclarations,
  type GluonRenderDebugEvent,
  type GluonPlugin,
  type Key,
  type PropertyDeclarations,
  type RepeatResult,
  type ScopedSlot,
  type SlotDeclarations,
  type TemplateValue,
  type VirtualizerHandle,
} from '@gluonjs/core';

const intersection = createIntersectionObserver<HTMLDivElement>({ threshold: [0, 1] }, (entries) => {
  entries[0]?.intersectionRatio.toFixed(2);
});
intersection.ref(document.createElement('div'));
intersection.entries.value[0]?.isIntersecting;
intersection.supported.value satisfies boolean;
intersection.stop();

createResizeObserver<HTMLDivElement>({ box: 'border-box' }).ref(document.createElement('div'));
createMutationObserver<HTMLDivElement>({ attributes: true }).ref(document.createElement('div'));

const typedVirtualizer: VirtualizerHandle<{ readonly id: string; readonly label: string }> = createVirtualizer({
  items: [{ id: 'lamp', label: 'Orbit Lamp' }],
  key: (item) => item.id,
  renderItem: (item, index) => html`<span data-index=${index}>${item.label}</span>`,
  estimateSize: (item) => item.label.length * 4,
  layout: 'grid',
  columns: 2,
  ariaLabel: 'Products',
});
typedVirtualizer.range.value.start satisfies number;
typedVirtualizer.scrollToIndex(0, { behavior: 'smooth', focus: true });
typedVirtualizer.update({
  items: [], key: (item) => item.id, renderItem: (item) => item.label, estimateSize: 40, ariaLabel: 'Products',
});
typedVirtualizer.stop();
import {
  customElement,
  property,
  state,
  type StateDeclaration,
} from '@gluonjs/core/decorators';

const internalState = { default: 'idle' } satisfies StateDeclaration<string>;

@customElement('typed-decorated-element')
class TypedDecoratedElement extends GluonElement {
  @property({ type: Boolean, reflect: true })
  isLoop = false;

  @property({ type: Number, attribute: 'item-count', default: 1 })
  accessor itemCount = 1;

  @state(internalState)
  private status = 'idle';

  protected override render() {
    return html`<p>${this.isLoop}:${this.itemCount}:${this.status}</p>`;
  }
}

const typedScopedRegistry: GluonElementRegistry = createGluonElementRegistry();
class TypedScopedElement extends GluonElement {
  static override readonly shadowRootRegistry = typedScopedRegistry;
  protected override render() { return html`Scoped`; }
}
defineElement('typed-scoped-element', TypedScopedElement, { registry: typedScopedRegistry });
createRegistryShadowRoot(document.createElement('section'), typedScopedRegistry);
defineGluonElement({
  tagName: 'typed-functional-scoped-element',
  setup: () => ({ render: () => html`Functional scoped` }),
}, { registry: typedScopedRegistry, shadowRootRegistry: typedScopedRegistry });
// @ts-expect-error registry options require a CustomElementRegistry-compatible target
defineElement('typed-invalid-registry', TypedScopedElement, { registry: {} });

const typedDecoratedElement = new TypedDecoratedElement();
typedDecoratedElement.isLoop = true;
typedDecoratedElement.itemCount = 2;
// @ts-expect-error decorated public properties keep their declared TypeScript type
typedDecoratedElement.itemCount = 'invalid';
// @ts-expect-error a Custom Element name requires a hyphen
customElement('invalid');

interface Row {
  readonly id: string;
  readonly label: string;
}

interface PanelProps {
  readonly title: string;
  readonly onClose: (event: MouseEvent) => void;
  readonly actions?: TemplateValue;
  readonly children: TemplateValue;
}

function Panel(props: PanelProps): TemplateValue {
  return html`<section><h2>${props.title}</h2>${props.children}</section>`;
}

compose(Panel, {
  title: 'Checkout',
  onClose: (event) => event.preventDefault(),
  actions: html`<button>Save</button>`,
})`<p>Delivery</p>`;
Panel({ title: 'Direct', onClose: () => undefined, children: 'Still callable' });
// @ts-expect-error required title remains required at the author call
compose(Panel, { onClose: () => undefined })`missing title`;
// @ts-expect-error callback types remain checked at the author call
compose(Panel, { title: 'Invalid', onClose: (value: string) => value })`bad callback`;
// @ts-expect-error unknown props remain checked at the author call
compose(Panel, { title: 'Invalid', onClose: () => undefined, unknown: true })`bad prop`;
// @ts-expect-error only components with TemplateValue children accept a template body
compose((props: { readonly label: string }) => html`<p>${props.label}</p>`, { label: 'No children' })`invalid content`;

const rows: readonly Row[] = [{ id: 'first', label: 'First' }];
const keyed: RepeatResult = repeat(
  rows,
  (row, index): Key => index === 0 ? row.id : index,
  (row, index): TemplateValue => html`<p data-index=${index}>${row.label}</p>`,
);

html`<section>${keyed}</section>`;

const asyncGreeting = defineAsyncComponent<{ name: string }>({
  loader: async ({ signal, attempt }) => {
    signal.aborted;
    attempt.toFixed();
    return ({ name }) => html`<p>Hello ${name}</p>`;
  },
  loading: ({ name }) => html`<p>Loading ${name}</p>`,
  error: (error, retry, { name }) => html`<button @click=${retry}>${name}${String(error)}</button>`,
  delay: 10,
  timeout: 1_000,
});
const asyncView: TemplateValue = asyncGreeting({ name: 'Ada' });
const serverContract = getBuiltinServerContract(asyncView);
if (serverContract?.kind === 'suspense') void serverContract.resolve();
void asyncGreeting.preload();
asyncGreeting.reset();
Suspense({
  source: async ({ signal }) => signal.aborted ? 'stopped' : 'ready',
  fallback: 'Loading',
  children: (value) => html`<p>${value.toUpperCase()}</p>`,
});
Teleport({ to: document.body, children: asyncView });
KeepAlive({ cacheKey: 'route:/', max: 4, children: asyncView });
Transition({ transitionKey: 'open', children: asyncView, reducedMotion: 'system' });
TransitionGroup({
  items: rows,
  key: (row) => row.id,
  children: (row) => html`<p>${row.label}</p>`,
});
LayoutTransition({ layoutId: 'catalog-grid', transitionKey: 'lighting', children: html`<section></section>` });

const lifecycleDefinition: DirectiveLifecycle<[string]> = {
  mount(part, [value]) {
    part.setValue(value);
  },
  update(part, [value]) {
    part.setValue(value);
  },
};
const lifecycle = directive(lifecycleDefinition);
const click: EventBinding = event(() => undefined, { capture: true, once: true });
html`<button @click=${click}>${lifecycle('ready')}</button>`;
html`<div>${unsafeHTML('<strong>trusted</strong>')}</div>`;
html`<a href=${unsafeURL('data:text/plain,reviewed')}>Reviewed</a>`;
suspendRender(null);
unmount(null);
const restoreRenderDebugHook = setGluonRenderDebugHook((diagnostic: GluonRenderDebugEvent) => {
  diagnostic.element;
  diagnostic.duration.toFixed();
  for (const cause of diagnostic.causes) {
    if (cause.type === 'reactive') cause.dependency.key;
  }
});
restoreRenderDebugHook();

const counterKey = createInjectionKey<{ count: number }>('counter');
const counterPlugin: GluonPlugin<{ initial: number }> = {
  install(app, options) {
    app.provide(counterKey, { count: options.initial });
    return () => undefined;
  },
};
const application = createApp<{ reset(): void }>((context) => {
  const counter = context.inject(counterKey);
  context.expose({ reset: () => { counter.count = 0; } });
  return html`<main>${dynamicComponent(
    (props: { count: number }) => html`<output>${props.count}</output>`,
    counter,
  )}</main>`;
});
application.config.errorHandler = ({ error, source }) => { void error; void source; };
application.config.warnHandler = ({ message, code }) => { void message; void code; };
application.use(counterPlugin, { initial: 1 });
application.component<{ label: string }>('label', ({ label }) => html`<span>${label}</span>`);
application.onMounted(() => undefined).onUnmounted(() => undefined);
const appMount = application.mount(document.createElement('div'));
appMount.exposed?.reset();
void application.run(async () => 'complete');
void runWithErrorHandling(async () => 'complete');
appMount.unmount();
// @ts-expect-error plain DocumentFragments are drainable and cannot own an application
application.mount(document.createDocumentFragment());

class PublicElement extends GluonElement {
  constructor() {
    super();
    this.onConnected(() => undefined);
    this.onBeforeUpdate(() => undefined);
    this.onUpdated(() => undefined);
    this.onDisconnected(() => undefined);
    this.onErrorCaptured(({ error, source }) => { void error; void source; return true; });
    this.expose({ reset: () => undefined });
  }

  protected override render() {
    return html`<p>Public</p>`;
  }
}
const publicInstance = getPublicInstance<{ reset(): void }>(null as unknown as PublicElement);
publicInstance?.reset();

interface TypedProps {
  count: number;
  label: string;
}
interface TypedEvents {
  advance: { id: number };
}
class TypedElement extends GluonElement<TypedEvents> {
  static override readonly properties = {
    count: { type: Number, required: true, validate: (value) => value >= 0 },
    label: { type: String, default: 'typed' },
  } satisfies PropertyDeclarations<TypedProps>;

  static override readonly events = {
    advance: { cancelable: true, validate: ({ id }) => id > 0 },
  } satisfies EventDeclarations<TypedEvents>;

  static override readonly slots = {
    default: { fallback: true },
    actions: { required: true },
  } satisfies SlotDeclarations<'default' | 'actions'>;

  fire(): void {
    this.emit('advance', { id: 1 });
    // @ts-expect-error emitted details retain their declared type
    this.emit('advance', { id: 'invalid' });
    // @ts-expect-error undeclared event names are rejected
    this.emit('missing', { id: 1 });
  }

  protected override render() {
    return html`<slot></slot><slot name="actions"></slot>`;
  }
}
void TypedElement;

const FunctionalQuantityElement = defineGluonElement({
  tagName: 'typed-functional-quantity',
  formAssociated: true,
  properties: {
    product: elementProperty<{ id: string; price: number }>({ type: Object, required: true }),
    value: { type: Number, reflect: true, default: 1 },
  },
  events: {
    change: elementEvent<{ value: number }>({ cancelable: true }),
  },
  slots: {
    default: { required: true },
  },
  setup(context) {
    context.props.product.price.toFixed(2);
    context.props.value.toFixed();
    const draft = context.state('draft', context.props.value);
    const doubled = context.computed(() => draft.value * 2);
    context.watch(draft, (value) => { value.toFixed(); });
    context.form.setValue(String(draft.value));
    context.onCleanup(() => undefined);
    return {
      expose: {
        focus: (options?: FocusOptions) => context.host.shadowRoot?.querySelector('button')?.focus(options),
        setValue(value: number) { draft.value = value; },
      },
      render: () => html`<button>${doubled.value}</button><slot></slot>`,
    };
  },
});
const functionalQuantity = new FunctionalQuantityElement();
functionalQuantity.product = { id: 'lamp', price: 12 };
functionalQuantity.value = 2;
functionalQuantity.setValue(3);
functionalQuantity.focus();
functionalQuantity.checkValidity();
// @ts-expect-error inferred structured properties retain their value type
functionalQuantity.product = { id: 'lamp', price: 'invalid' };
// @ts-expect-error inferred primitive properties retain their value type
functionalQuantity.value = 'invalid';
// @ts-expect-error exposed methods retain their argument type
functionalQuantity.setValue('invalid');

const typedSlot: ScopedSlot<{ count: number }> = ({ count }) => html`<b>${count}</b>`;
renderScopedSlot(typedSlot, { count: 1 });
// @ts-expect-error scoped slot props retain their type
renderScopedSlot(typedSlot, { count: 'invalid' });

const typedModel = { value: 'first' };
model(typedModel, { kind: 'radio', value: 'second' });
model({ value: false }, { kind: 'checkbox' });
const arrayModel: { value: string[] } = { value: ['first'] };
model<string[]>(arrayModel, { kind: 'checkbox', value: 'second' });
// @ts-expect-error radio model values match the writable model type
model(typedModel, { kind: 'radio', value: 2 });
// @ts-expect-error array checkbox models require their item value
model<string[]>(arrayModel, { kind: 'checkbox' });
// @ts-expect-error boolean checkbox models do not accept an item value
model({ value: false }, { kind: 'checkbox', value: 'invalid' });

const buttonRef = elementRef<HTMLButtonElement>();
buttonRef.value?.disabled;
const exposedTarget: { value: Readonly<{ reset(): void }> | undefined } = { value: undefined };
exposedRef(exposedTarget);

const invalidPropertyDeclarations: PropertyDeclarations<TypedProps> = {
  // @ts-expect-error prop validators receive the declared prop value type
  count: { validate: (value: string) => value.length > 0 },
  label: String,
};
void invalidPropertyDeclarations;

// @ts-expect-error keys cannot be null
repeat(rows, () => null, (row) => row.label);

// @ts-expect-error item renderers must return a TemplateValue
repeat(rows, (row) => row.id, () => new Date());

// @ts-expect-error event options follow AddEventListenerOptions
event(() => undefined, { capture: 'yes' });

// @ts-expect-error unsafe URLs accept strings or URL objects
unsafeURL(42);
// @ts-expect-error async component props retain their declared type
asyncGreeting({ name: 42 });
// @ts-expect-error KeepAlive cache sizes are numeric
KeepAlive({ cacheKey: 'route', max: 'four', children: '' });
// @ts-expect-error injection keys retain their value type
application.provide(counterKey, { count: 'invalid' });
