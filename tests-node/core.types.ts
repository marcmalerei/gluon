import {
  directive,
  event,
  html,
  repeat,
  setGluonRenderDebugHook,
  suspendRender,
  unmount,
  unsafeHTML,
  unsafeURL,
  type DirectiveLifecycle,
  type EventBinding,
  type GluonRenderDebugEvent,
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

// @ts-expect-error keys cannot be null
repeat(rows, () => null, (row) => row.label);

// @ts-expect-error item renderers must return a TemplateValue
repeat(rows, (row) => row.id, () => new Date());

// @ts-expect-error event options follow AddEventListenerOptions
event(() => undefined, { capture: 'yes' });

// @ts-expect-error unsafe URLs accept strings or URL objects
unsafeURL(42);
