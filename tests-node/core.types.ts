import {
  GluonElement,
  createApp,
  createInjectionKey,
  directive,
  dynamicComponent,
  event,
  getPublicInstance,
  html,
  repeat,
  runWithErrorHandling,
  setGluonRenderDebugHook,
  suspendRender,
  unmount,
  unsafeHTML,
  unsafeURL,
  type DirectiveLifecycle,
  type EventBinding,
  type GluonRenderDebugEvent,
  type GluonPlugin,
  type Key,
  type RepeatResult,
  type TemplateValue,
} from '@gluonjs/core';

interface Row {
  readonly id: string;
  readonly label: string;
}

const rows: readonly Row[] = [{ id: 'first', label: 'First' }];
const keyed: RepeatResult = repeat(
  rows,
  (row, index): Key => index === 0 ? row.id : index,
  (row, index): TemplateValue => html`<p data-index=${index}>${row.label}</p>`,
);

html`<section>${keyed}</section>`;

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

// @ts-expect-error keys cannot be null
repeat(rows, () => null, (row) => row.label);

// @ts-expect-error item renderers must return a TemplateValue
repeat(rows, (row) => row.id, () => new Date());

// @ts-expect-error event options follow AddEventListenerOptions
event(() => undefined, { capture: 'yes' });

// @ts-expect-error unsafe URLs accept strings or URL objects
unsafeURL(42);
// @ts-expect-error injection keys retain their value type
application.provide(counterKey, { count: 'invalid' });
