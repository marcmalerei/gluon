import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from '@gluonjs/reactivity';
import {
  GluonElement,
  createApp,
  defineElement,
  elementRef,
  exposedRef,
  html,
  model,
  render,
  renderScopedSlot,
  unmount,
  type AppErrorInfo,
  type AppWarningInfo,
  type EventDeclarations,
  type PropertyDeclarations,
  type ScopedSlot,
  type SlotDeclarations,
} from '../src/index.js';

describe('typed component contracts', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('validates declared props and events while preserving host fallthrough attributes', async () => {
    interface Props {
      count: number;
      explosive: string;
      label: string;
    }
    interface Events {
      advance: { value: number };
    }

    class ContractFixture extends GluonElement<Events> {
      static override readonly properties = {
        count: {
          type: Number,
          required: true,
          validate: (value) => value >= 0 || 'count must be non-negative',
        },
        explosive: {
          attribute: false,
          validate: () => { throw new Error('prop validator failed'); },
        },
        label: { type: String, default: 'ready' },
      } satisfies PropertyDeclarations<Props>;

      static override readonly events = {
        advance: {
          cancelable: true,
          validate: ({ value }) => value >= 0,
        },
      } satisfies EventDeclarations<Events>;

      static override readonly slots = {
        header: { required: true, fallback: true },
        default: { fallback: true },
      } satisfies SlotDeclarations<'header' | 'default'>;

      declare count: number;
      declare explosive: string;
      declare label: string;

      fire(value: number): boolean {
        return this.emit('advance', { value });
      }

      fireUndeclared(): boolean {
        const emit = this.emit as (type: string, detail: unknown) => boolean;
        return emit.call(this, 'missing', { value: 1 });
      }

      protected override render() {
        return html`
          <slot name="header"><h2>Fallback header</h2></slot>
          <output>${this.count}:${this.label}</output>
          <slot><p>Fallback body</p></slot>
        `;
      }
    }

    defineElement('gluon-component-contract-fixture', ContractFixture);
    const warnings: AppWarningInfo[] = [];
    const errors: AppErrorInfo[] = [];
    const app = createApp(html`
      <gluon-component-contract-fixture
        id="complete"
        .count=${-1}
        .explosive=${'boom'}
        data-fallthrough="preserved"
      >
        <strong slot="header">Projected header</strong>
        <span>Projected body</span>
      </gluon-component-contract-fixture>
      <gluon-component-contract-fixture id="missing"></gluon-component-contract-fixture>
    `);
    app.config.warnHandler = (info) => { warnings.push(info); };
    app.config.errorHandler = (info) => { errors.push(info); };
    const root = document.createElement('div');
    document.body.append(root);
    app.mount(root);
    const complete = root.querySelector('#complete') as ContractFixture;
    const missing = root.querySelector('#missing') as ContractFixture;
    await Promise.all([complete.updateComplete, missing.updateComplete]);

    expect(complete.count).toBe(-1);
    expect(complete.getAttribute('data-fallthrough')).toBe('preserved');
    expect(complete.shadowRoot?.querySelector('[data-fallthrough]')).toBeNull();
    expect(warnings.map(({ code }) => code)).toEqual(expect.arrayContaining([
      'GLUON_PROP_INVALID',
      'GLUON_PROP_REQUIRED',
      'GLUON_SLOT_REQUIRED',
    ]));
    expect(errors).toEqual([
      expect.objectContaining({
        source: 'application',
        error: expect.objectContaining({ message: 'prop validator failed' }),
      }),
    ]);

    complete.count = 2;
    await complete.updateComplete;
    expect(complete.count).toBe(2);

    const listener = vi.fn((event: Event) => event.preventDefault());
    complete.addEventListener('advance', listener);
    expect(complete.fire(-2)).toBe(false);
    const emitted = listener.mock.calls[0]?.[0] as CustomEvent<{ value: number }>;
    expect(emitted.detail).toEqual({ value: -2 });
    expect(emitted.bubbles).toBe(true);
    expect(emitted.composed).toBe(true);
    expect(emitted.cancelable).toBe(true);
    expect(warnings.at(-1)).toEqual(expect.objectContaining({ code: 'GLUON_EVENT_INVALID' }));
    complete.fireUndeclared();
    expect(warnings.at(-1)).toEqual(expect.objectContaining({ code: 'GLUON_EVENT_UNDECLARED' }));

    app.unmount();
  });

  it('keeps native slot ownership and scoped slot output with their callers', async () => {
    class SlotFixture extends GluonElement {
      static override readonly slots = {
        header: { required: true, fallback: true },
        default: { fallback: true },
      } satisfies SlotDeclarations<'header' | 'default'>;

      protected override render() {
        return html`
          <slot name="header"><h2>Fallback header</h2></slot>
          <slot><p>Fallback body</p></slot>
        `;
      }
    }

    defineElement('gluon-native-slot-fixture', SlotFixture);
    const element = document.createElement('gluon-native-slot-fixture') as SlotFixture;
    const header = document.createElement('strong');
    header.slot = 'header';
    header.textContent = 'Owned by consumer';
    const body = document.createElement('span');
    body.textContent = 'Body';
    element.append(header, body);
    document.body.append(element);
    await element.updateComplete;

    const headerSlot = element.shadowRoot?.querySelector('slot[name="header"]') as HTMLSlotElement;
    const bodySlot = element.shadowRoot?.querySelector('slot:not([name])') as HTMLSlotElement;
    expect(headerSlot.assignedNodes()).toEqual([header]);
    expect(bodySlot.assignedNodes()).toEqual([body]);
    expect(header.parentNode).toBe(element);

    const changed = new Promise<void>((resolve) => {
      headerSlot.addEventListener('slotchange', () => resolve(), { once: true });
    });
    header.remove();
    await changed;
    expect(headerSlot.assignedNodes()).toEqual([]);
    expect(headerSlot.querySelector('h2')?.textContent).toBe('Fallback header');
    expect(header.isConnected).toBe(false);

    const scoped: ScopedSlot<{ value: string }> = ({ value }) => html`<b>${value}</b>`;
    const root = document.createElement('div');
    render(html`
      ${renderScopedSlot(scoped, { value: 'scoped' })}
      ${renderScopedSlot(undefined, { value: 'unused' }, html`<i>fallback</i>`)}
    `, root);
    expect(root.textContent?.replace(/\s+/g, ' ').trim()).toBe('scoped fallback');
    unmount(root);
    expect(root.childNodes).toHaveLength(0);
  });

  it('binds text, checkbox, radio, select, and custom-element models', async () => {
    interface ModelEvents {
      'update:modelValue': string;
    }

    class CustomModelFixture extends GluonElement<ModelEvents> {
      static override readonly properties: PropertyDeclarations = {
        modelValue: { attribute: false },
        modelValueModifiers: { attribute: false },
      };

      static override readonly events = {
        'update:modelValue': {},
      } satisfies EventDeclarations<ModelEvents>;

      declare modelValue: string;
      declare modelValueModifiers: Record<string, boolean>;

      updateValue(value: string): void {
        this.emit('update:modelValue', value);
      }

      protected override render() {
        return html`<span>${this.modelValue}</span>`;
      }
    }

    defineElement('gluon-custom-model-fixture', CustomModelFixture);
    const text = ref<string | number>('start');
    const lazy = ref('lazy');
    const checked = ref(false);
    const selectedChecks = ref<string[]>([]);
    const radio = ref('a');
    const selected = ref('a');
    const selectedMany = ref<string[]>(['a']);
    const custom = ref('before');
    const app = createApp(() => html`
      <input id="text" ...=${model(text, { modifiers: { trim: true, number: true } })}>
      <input id="lazy" ...=${model(lazy, {
        modifiers: { lazy: true },
        transform: (value) => String(value).toUpperCase(),
      })}>
      <input id="boolean" type="checkbox" ...=${model(checked, { kind: 'checkbox' })}>
      <input id="check-a" type="checkbox" ...=${model(selectedChecks, { kind: 'checkbox', value: 'a' })}>
      <input id="check-b" type="checkbox" ...=${model(selectedChecks, { kind: 'checkbox', value: 'b' })}>
      <input id="radio-a" name="choice" type="radio" ...=${model(radio, { kind: 'radio', value: 'a' })}>
      <input id="radio-b" name="choice" type="radio" ...=${model(radio, { kind: 'radio', value: 'b' })}>
      <select id="select" ...=${model(selected, { kind: 'select' })}>
        <option value="a">A</option><option value="b">B</option>
      </select>
      <select id="many" multiple ...=${model(selectedMany, { kind: 'select' })}>
        <option value="a">A</option><option value="b">B</option>
      </select>
      <gluon-custom-model-fixture
        id="custom"
        ...=${model(custom, { kind: 'custom', modifiers: { trim: true } })}
      ></gluon-custom-model-fixture>
    `);
    const root = document.createElement('div');
    document.body.append(root);
    app.mount(root);

    const textInput = root.querySelector('#text') as HTMLInputElement;
    textInput.value = ' 12.5 ';
    textInput.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    expect(text.value).toBe(12.5);
    expect(textInput.value).toBe('12.5');

    const lazyInput = root.querySelector('#lazy') as HTMLInputElement;
    lazyInput.value = 'changed';
    lazyInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(lazy.value).toBe('lazy');
    lazyInput.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();
    expect(lazy.value).toBe('CHANGED');

    const booleanInput = root.querySelector('#boolean') as HTMLInputElement;
    booleanInput.checked = true;
    booleanInput.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();
    expect(checked.value).toBe(true);

    const checkA = root.querySelector('#check-a') as HTMLInputElement;
    const checkB = root.querySelector('#check-b') as HTMLInputElement;
    checkA.checked = true;
    checkA.dispatchEvent(new Event('change', { bubbles: true }));
    checkB.checked = true;
    checkB.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();
    expect(selectedChecks.value).toEqual(['a', 'b']);
    checkA.checked = false;
    checkA.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();
    expect(selectedChecks.value).toEqual(['b']);

    const radioB = root.querySelector('#radio-b') as HTMLInputElement;
    radioB.checked = true;
    radioB.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();
    expect(radio.value).toBe('b');
    const radioA = root.querySelector('#radio-a') as HTMLInputElement;
    radioA.checked = false;
    radioA.dispatchEvent(new Event('change', { bubbles: true }));
    expect(radio.value).toBe('b');

    const select = root.querySelector('#select') as HTMLSelectElement;
    select.value = 'b';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();
    expect(selected.value).toBe('b');

    const many = root.querySelector('#many') as HTMLSelectElement;
    many.options[0]!.selected = false;
    many.options[1]!.selected = true;
    many.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();
    expect(selectedMany.value).toEqual(['b']);

    const customElement = root.querySelector('#custom') as CustomModelFixture;
    await customElement.updateComplete;
    expect(customElement.modelValue).toBe('before');
    expect(customElement.modelValueModifiers).toEqual({ trim: true });
    customElement.updateValue(' after ');
    await nextTick();
    expect(custom.value).toBe('after');
    expect(customElement.modelValue).toBe('after');

    app.unmount();
  });

  it('rejects model event handlers attached to incompatible targets', () => {
    const handlers = [
      (model({ value: '' }) as Record<string, EventListener>).onInput,
      (model({ value: false }, { kind: 'checkbox' }) as Record<string, EventListener>).onChange,
      (model({ value: 'a' }, { kind: 'radio', value: 'b' }) as Record<string, EventListener>).onChange,
      (model({ value: 'a' }, { kind: 'select' }) as Record<string, EventListener>).onChange,
      (model({ value: 'a' }, { kind: 'custom' }) as Record<string, EventListener>)['@update:modelValue'],
    ];

    for (const handler of handlers) {
      expect(() => handler?.(new Event('invalid'))).toThrow(TypeError);
    }
  });

  it('resolves element, callback, component-host, and exposed-instance refs once per owner', async () => {
    class RefFixture extends GluonElement {
      constructor() {
        super();
        this.expose({ label: () => 'public' });
      }

      protected override render() {
        return html`<span>private</span>`;
      }
    }

    defineElement('gluon-component-ref-fixture', RefFixture);
    const button = elementRef<HTMLButtonElement>();
    const componentCalls: Array<Element | undefined> = [];
    const publicCalls: Array<Readonly<{ label(): string }> | undefined> = [];
    const publicObject: { value: Readonly<{ label(): string }> | undefined } = {
      value: undefined,
    };
    const componentRef = (element: Element | undefined) => { componentCalls.push(element); };
    const publicRef = exposedRef<{ label(): string }>((value) => { publicCalls.push(value); });
    const publicObjectRef = exposedRef<{ label(): string }>(publicObject);
    const app = createApp(html`
      <button ...=${{ ref: button }}>button</button>
      <gluon-component-ref-fixture id="component" ...=${{ ref: componentRef }}></gluon-component-ref-fixture>
      <gluon-component-ref-fixture id="public" ...=${{ ref: publicRef }}></gluon-component-ref-fixture>
      <gluon-component-ref-fixture id="public-object" ...=${{ ref: publicObjectRef }}></gluon-component-ref-fixture>
    `);
    const root = document.createElement('div');
    document.body.append(root);
    app.mount(root);
    const component = root.querySelector('#component') as RefFixture;
    await Promise.resolve();
    await Promise.resolve();

    expect(button.value).toBeInstanceOf(HTMLButtonElement);
    expect(componentCalls).toEqual([component]);
    expect(publicCalls).toHaveLength(1);
    expect(publicCalls[0]?.label()).toBe('public');
    expect(publicObject.value?.label()).toBe('public');

    app.unmount();
    expect(button.value).toBeUndefined();
    expect(componentCalls).toEqual([component, undefined]);
    expect(publicCalls).toEqual([expect.any(Object), undefined]);
    expect(publicObject.value).toBeUndefined();
  });
});
