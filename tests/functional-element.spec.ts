import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  css,
  defineGluonElement,
  elementEvent,
  elementProperty,
  html,
  type ComponentErrorInfo,
} from '../src/index.js';

let functionalElementSequence = 0;

interface ProductInput {
  readonly id: string;
  readonly price: number;
}

interface QuantityChange {
  readonly productId: string;
  readonly quantity: number;
}

describe('functional GluonElement authoring', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('infers and owns a stateful form-associated autonomous Custom Element', async () => {
    const tagName = `gluon-functional-quantity-${functionalElementSequence += 1}` as `${string}-${string}`;
    const cleanup = vi.fn();
    const connected = vi.fn();
    const disconnected = vi.fn();
    const captured: ComponentErrorInfo[] = [];
    let setupCount = 0;

    const QuantityControl = defineGluonElement({
      tagName,
      formAssociated: true,
      properties: {
        product: elementProperty<ProductInput>({ type: Object, required: true }),
        value: { type: Number, reflect: true, default: 1 },
        required: { type: Boolean, reflect: true, default: false },
      },
      events: {
        'quantity-change': elementEvent<QuantityChange>({ cancelable: true }),
      },
      slots: {
        default: { required: true },
        help: { fallback: true },
      },
      styles: css`:host { display: block; } button { min-width: 44px; min-height: 44px; }`,
      setup(context) {
        setupCount += 1;
        const draft = context.state('draft', () => context.props.value);
        const total = context.computed(() => draft.value * context.props.product.price);
        context.watch(
          () => context.props.value,
          (value) => { draft.value = value ?? 1; },
        );
        context.onCleanup(cleanup);
        context.onConnected(connected);
        context.onDisconnected(disconnected);
        context.onErrorCaptured((info) => {
          captured.push(info);
          return true;
        });
        context.form.onReset(() => { draft.value = context.props.value; });
        context.form.onRestore((state) => {
          if (typeof state === 'string') draft.value = Number(state);
        });
        context.onUpdated(() => {
          context.form.setValue(String(draft.value), String(draft.value));
          context.form.setValidity(
            context.props.required && draft.value < 1 ? { rangeUnderflow: true } : {},
            context.props.required && draft.value < 1 ? 'Choose at least one item.' : '',
          );
        });

        const setQuantity = (quantity: number): boolean => {
          const previous = draft.value;
          draft.value = quantity;
          const accepted = context.emit('quantity-change', {
            productId: context.props.product.id,
            quantity,
          });
          if (!accepted) draft.value = previous;
          return accepted;
        };

        return {
          expose: {
            focus(options?: FocusOptions) {
              context.host.shadowRoot?.querySelector('button')?.focus(options);
            },
            setQuantity,
            get quantity() { return draft.value; },
          },
          render: () => html`
            <div>
              <slot></slot>
              <button type="button" aria-label="Decrease quantity" @click=${() => setQuantity(draft.value - 1)}>−</button>
              <output aria-live="polite">${draft.value}</output>
              <button type="button" aria-label="Increase quantity" @click=${() => setQuantity(draft.value + 1)}>+</button>
              <span>€${total.value.toFixed(2)}</span>
              <slot name="help">Choose a quantity.</slot>
            </div>
          `,
        };
      },
    });

    expect(customElements.get(tagName)).toBe(QuantityControl);
    expect(QuantityControl.formAssociated).toBe(true);
    const form = document.createElement('form');
    const label = document.createElement('label');
    label.htmlFor = 'quantity-control';
    label.textContent = 'Quantity';
    const element = document.createElement(tagName) as InstanceType<typeof QuantityControl>;
    element.id = 'quantity-control';
    element.setAttribute('name', 'quantity');
    element.product = { id: 'orbit-lamp', price: 12.5 };
    element.append('Orbit Lamp');
    const help = document.createElement('span');
    help.slot = 'help';
    help.textContent = 'One to five';
    element.append(help);
    form.append(label, element);
    document.body.append(form);
    await element.updateComplete;

    expect(setupCount).toBe(1);
    expect(connected).toHaveBeenCalledOnce();
    expect(element.shadowRoot?.adoptedStyleSheets).toHaveLength(1);
    expect(element.shadowRoot?.textContent).toContain('€12.50');
    expect(element.form).toBe(form);
    expect([...element.labels]).toContain(label);
    expect(new FormData(form).get('quantity')).toBe('1');

    const changes = vi.fn();
    element.addEventListener('quantity-change', changes);
    expect(element.setQuantity(3)).toBe(true);
    await element.updateComplete;
    expect(element.quantity).toBe(3);
    expect(element.shadowRoot?.querySelector('output')?.textContent).toBe('3');
    expect(element.shadowRoot?.textContent).toContain('€37.50');
    expect(new FormData(form).get('quantity')).toBe('3');
    expect((changes.mock.calls[0]?.[0] as CustomEvent<QuantityChange>).detail).toEqual({
      productId: 'orbit-lamp',
      quantity: 3,
    });

    element.addEventListener('quantity-change', (event) => event.preventDefault(), { once: true });
    expect(element.setQuantity(4)).toBe(false);
    await element.updateComplete;
    expect(element.quantity).toBe(3);

    element.focus();
    expect(element.shadowRoot?.activeElement).toBe(element.shadowRoot?.querySelector('button'));
    element.required = true;
    element.setQuantity(0);
    await element.updateComplete;
    expect(element.checkValidity()).toBe(false);
    expect(element.validationMessage).toBe('Choose at least one item.');

    form.reset();
    await element.updateComplete;
    expect(element.quantity).toBe(1);
    (element as typeof element & {
      formStateRestoreCallback(state: string, mode: 'restore'): void;
    }).formStateRestoreCallback('2', 'restore');
    await element.updateComplete;
    expect(element.quantity).toBe(2);

    element.remove();
    expect(cleanup).toHaveBeenCalledOnce();
    expect(disconnected).toHaveBeenCalledOnce();
    form.append(element);
    await element.updateComplete;
    expect(setupCount).toBe(2);
    expect(element.quantity).toBe(2);
    expect(captured).toEqual([]);
  });

  it('routes setup failures through the existing application error boundary path', async () => {
    const tagName = `gluon-functional-failure-${functionalElementSequence += 1}` as `${string}-${string}`;
    const reportError = vi.spyOn(globalThis, 'reportError').mockImplementation(() => undefined);
    defineGluonElement({
      tagName,
      setup() {
        throw new Error('setup failed');
      },
    });

    const element = document.createElement(tagName);
    document.body.append(element);
    await Promise.resolve();
    expect(reportError).toHaveBeenCalledWith(expect.objectContaining({ message: 'setup failed' }));
    reportError.mockRestore();
  });

  it('rejects lifecycle registration after synchronous setup has closed', async () => {
    const tagName = `gluon-functional-deferred-${functionalElementSequence += 1}` as `${string}-${string}`;
    let deferred!: () => void;
    defineGluonElement({
      tagName,
      setup(context) {
        deferred = () => context.onUpdated(() => undefined);
        return { render: () => html`<p>Ready</p>` };
      },
    });
    const element = document.createElement(tagName) as HTMLElement & { updateComplete: Promise<void> };
    document.body.append(element);
    await element.updateComplete;
    expect(deferred).toThrow(`${tagName} onUpdated must be registered synchronously during setup.`);
  });
});
