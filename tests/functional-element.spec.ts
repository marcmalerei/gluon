import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createApp,
  createInjectionKey,
  css,
  defineElement,
  defineGluonElement,
  elementEvent,
  elementProperty,
  html,
  GluonElement,
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
    const disabled = vi.fn();
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
        context.form.onDisabled(disabled);
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
    expect(element.validity).toBeDefined();
    expect(element.willValidate).toBe(true);
    expect(element.reportValidity()).toBe(true);

    (element as typeof element & { formDisabledCallback(disabled: boolean): void }).formDisabledCallback(true);
    expect(disabled).toHaveBeenCalledWith(true);

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

    element.setAttribute('value', '2');
    await expect.poll(() => element.quantity).toBe(2);

    element.focus();
    expect(element.shadowRoot?.activeElement).toBe(element.shadowRoot?.querySelector('button'));
    element.required = true;
    element.setQuantity(0);
    await element.updateComplete;
    expect(element.checkValidity()).toBe(false);
    expect(element.validationMessage).toBe('Choose at least one item.');

    form.reset();
    await element.updateComplete;
    expect(element.quantity).toBe(2);
    (element as typeof element & {
      formStateRestoreCallback(state: string, mode: 'restore'): void;
    }).formStateRestoreCallback('3', 'restore');
    await element.updateComplete;
    expect(element.quantity).toBe(3);

    element.remove();
    expect(cleanup).toHaveBeenCalledOnce();
    expect(disconnected).toHaveBeenCalledOnce();
    form.append(element);
    await element.updateComplete;
    expect(setupCount).toBe(2);
    expect(element.quantity).toBe(3);
    expect(captured).toEqual([]);
  });

  it('owns reactive objects, effects, async lifecycle work, injection, and exposed accessors', async () => {
    const tagName = `gluon-functional-owned-state-${functionalElementSequence += 1}` as `${string}-${string}`;
    const key = createInjectionKey<string>('functional-fallback');
    const cleanup = vi.fn();
    const beforeUpdate = vi.fn(async () => Promise.resolve());
    const updated = vi.fn(async () => Promise.resolve());
    let stateInitializations = 0;
    let effectRuns = 0;

    const OwnedState = defineGluonElement({
      tagName,
      setup(context) {
        const model = context.reactiveState('model', () => {
          stateInitializations += 1;
          return { count: 1 };
        });
        const direct = context.reactiveState('direct', { label: 'direct' });
        const doubled = context.computed(() => model.count * 2);
        const fallback = context.inject(key, 'fallback');
        context.watchEffect(() => {
          void model.count;
          effectRuns += 1;
        });
        context.onBeforeUpdate(beforeUpdate);
        context.onUpdated(updated);
        context.onCleanup(cleanup);
        return {
          expose: {
            plain: 'public',
            get count() { return model.count; },
            set count(value: number) { model.count = value; },
            get fallback() { return fallback; },
            get directLabel() { return direct.label; },
            refresh: () => context.requestUpdate(),
          },
          render: () => html`<output>${model.count}:${doubled.value}</output>`,
        };
      },
    });

    const element = document.createElement(tagName) as InstanceType<typeof OwnedState> & {
      plain: string;
      count: number;
      fallback: string;
      directLabel: string;
      refresh(): Promise<void>;
    };
    document.body.append(element);
    await element.updateComplete;

    expect(element.plain).toBe('public');
    expect(element.count).toBe(1);
    expect(element.fallback).toBe('fallback');
    expect(element.directLabel).toBe('direct');
    expect(element.shadowRoot?.textContent).toContain('1:2');
    element.count = 3;
    await element.updateComplete;
    await Promise.resolve();
    expect(element.shadowRoot?.textContent).toContain('3:6');
    expect(effectRuns).toBeGreaterThan(0);
    await element.refresh();
    expect(beforeUpdate).toHaveBeenCalled();
    expect(updated).toHaveBeenCalled();

    element.remove();
    expect(cleanup).toHaveBeenCalledOnce();
    document.body.append(element);
    await element.updateComplete;
    expect(stateInitializations).toBe(1);
    expect(element.count).toBe(3);
  });

  it('captures descendant render failures through the functional boundary', async () => {
    const childTag = 'gluon-functional-error-child-fixture';
    const boundaryTag = `gluon-functional-error-boundary-${functionalElementSequence += 1}` as `${string}-${string}`;
    const captured: ComponentErrorInfo[] = [];

    class ErrorChild extends GluonElement {
      fail = false;

      triggerFailure(): void {
        this.fail = true;
        this.requestUpdate();
      }

      protected override render() {
        if (this.fail) throw new Error('descendant failure');
        return html`<p>Ready</p>`;
      }
    }
    defineElement(childTag, ErrorChild);
    const Boundary = defineGluonElement({
      tagName: boundaryTag,
      setup(context) {
        context.onErrorCaptured(() => false);
        context.onErrorCaptured((info) => {
          captured.push(info);
          return true;
        });
        return { render: () => html`<gluon-functional-error-child-fixture></gluon-functional-error-child-fixture>` };
      },
    });

    const boundary = document.createElement(boundaryTag) as InstanceType<typeof Boundary>;
    document.body.append(boundary);
    await boundary.updateComplete;
    const child = boundary.shadowRoot?.querySelector(childTag) as ErrorChild;
    await child.updateComplete;
    child.triggerFailure();
    await expect(child.updateComplete).rejects.toThrow('descendant failure');
    expect(captured).toEqual([
      expect.objectContaining({ source: 'render', element: child }),
    ]);
  });

  it('provides safe standalone fallbacks and a DOM-free server render contract', async () => {
    const tagName = `gluon-functional-standalone-${functionalElementSequence += 1}` as `${string}-${string}`;
    const cleanup = vi.fn();
    const Standalone = defineGluonElement({
      tagName,
      setup(context) {
        context.onCleanup(cleanup);
        return { render: () => html`<p>Standalone</p>` };
      },
    }, { register: false });

    expect(customElements.get(tagName)).toBeUndefined();
    customElements.define(tagName, Standalone);
    const element = new Standalone();
    const formPublic = element as typeof element & {
      readonly form: HTMLFormElement | null;
      readonly labels: NodeList;
      readonly validity: ValidityState | undefined;
      readonly validationMessage: string;
      readonly willValidate: boolean;
      checkValidity(): boolean;
      reportValidity(): boolean;
      setCustomValidity(message: string): void;
    };
    expect(formPublic.form).toBeNull();
    expect(formPublic.labels.length).toBe(0);
    expect(formPublic.labels.item(0)).toBeNull();
    expect(formPublic.labels.forEach(() => undefined)).toBeUndefined();
    expect(formPublic.validity).toBeUndefined();
    expect(formPublic.validationMessage).toBe('');
    expect(formPublic.willValidate).toBe(false);
    expect(formPublic.checkValidity()).toBe(true);
    expect(formPublic.reportValidity()).toBe(true);
    expect(() => formPublic.setCustomValidity('ignored')).not.toThrow();
    expect(element.renderForServer().strings.join('')).toContain('<p>Standalone</p>');
    expect(cleanup).toHaveBeenCalledOnce();
    expect(() => (element as unknown as { render(): unknown }).render()).toThrow(
      `${tagName} setup has no active connection owner.`,
    );

    element.connectedCallback();
    element.connectedCallback();
    element.endHydration();
    await element.updateComplete;
    element.disconnectedCallback();
    element.disconnectedCallback();
  });

  it('resolves setup injection without a fallback from the owning application', async () => {
    const key = createInjectionKey<string>('functional-provided');
    const tagName = 'gluon-functional-injected-fixture';
    defineGluonElement({
      tagName,
      setup(context) {
        const value = context.inject(key);
        return { render: () => html`<p>${value}</p>` };
      },
    });
    const app = createApp(html`<gluon-functional-injected-fixture></gluon-functional-injected-fixture>`);
    app.provide(key, 'provided');
    const root = document.createElement('div');
    document.body.append(root);
    app.mount(root);
    const element = root.querySelector(tagName) as HTMLElement & { updateComplete: Promise<void>; shadowRoot: ShadowRoot };
    await element.updateComplete;
    expect(element.shadowRoot.textContent).toContain('provided');
    app.unmount();
  });

  it('rejects a setup result without a render contract', () => {
    const tagName = `gluon-functional-missing-render-${functionalElementSequence += 1}` as `${string}-${string}`;
    const MissingRender = defineGluonElement({
      tagName,
      setup: (() => undefined) as never,
    }, { register: false });
    customElements.define(tagName, MissingRender);
    const element = new MissingRender();
    expect(() => element.renderForServer()).toThrow(
      `${tagName} setup did not return a render contract.`,
    );
  });

  it('reports unavailable ElementInternals for a browser form boundary', () => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'attachInternals');
    expect(descriptor).toBeDefined();
    Object.defineProperty(HTMLElement.prototype, 'attachInternals', {
      configurable: true,
      value: undefined,
    });
    try {
      const tagName = `gluon-functional-missing-internals-${functionalElementSequence += 1}` as `${string}-${string}`;
      const MissingInternals = defineGluonElement({
        tagName,
        formAssociated: true,
        setup: () => ({ render: () => html`<p>Unavailable</p>` }),
      }, { register: false });
      customElements.define(tagName, MissingInternals);
      expect(() => new MissingInternals()).toThrow(
        `${tagName} requires ElementInternals for form participation.`,
      );
    } finally {
      Object.defineProperty(HTMLElement.prototype, 'attachInternals', descriptor!);
    }
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
    let deferredCleanup!: () => void;
    defineGluonElement({
      tagName,
      setup(context) {
        deferred = () => context.onUpdated(() => undefined);
        deferredCleanup = () => context.onCleanup(() => undefined);
        return { render: () => html`<p>Ready</p>` };
      },
    });
    const element = document.createElement(tagName) as HTMLElement & { updateComplete: Promise<void> };
    document.body.append(element);
    await element.updateComplete;
    expect(deferred).toThrow(`${tagName} onUpdated must be registered synchronously during setup.`);
    expect(deferredCleanup).toThrow(`${tagName} cleanup must be registered during setup.`);
  });
});
