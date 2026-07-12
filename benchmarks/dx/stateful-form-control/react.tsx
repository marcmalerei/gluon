import { createElement, useEffect, useMemo, useState, type ReactElement } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import type { ProductInput, QuantityChange, QuantityControlPublic } from './shared.js';
import { adoptQuantityStyles } from './shared.js';

export const reactQuantityTag = 'dx-react-quantity';
export const reactLifecycleEvidence = { cleanups: 0 };

export interface ReactQuantityViewProps {
  readonly product: ProductInput;
  readonly value: number;
  readonly requestChange: (quantity: number) => boolean;
}

// DX_COMPONENT_START
export function ReactQuantityView(props: ReactQuantityViewProps): ReactElement {
  const [draft, setDraft] = useState(props.value);
  const total = useMemo(() => draft * props.product.price, [draft, props.product.price]);
  useEffect(() => { setDraft(props.value); }, [props.value]);
  useEffect(() => () => { reactLifecycleEvidence.cleanups += 1; }, []);
  const change = (quantity: number): void => {
    const next = Math.max(0, quantity);
    if (props.requestChange(next)) setDraft(next);
  };
  return <section className="control" aria-label={`${props.product.name} quantity`}>
    <slot />
    <div className="stepper">
      <button type="button" aria-label="Decrease quantity" onClick={() => change(draft - 1)}>−</button>
      <output aria-live="polite">{draft}</output>
      <button type="button" aria-label="Increase quantity" onClick={() => change(draft + 1)}>+</button>
      <strong>Total €{total.toFixed(2)}</strong>
    </div>
    <slot name="help">Choose a quantity.</slot>
  </section>;
}
// DX_COMPONENT_END

const fallbackProduct: ProductInput = Object.freeze({ id: 'missing', name: 'Missing product', price: 0 });

export function registerReactQuantityControl(): CustomElementConstructor {
  const existing = customElements.get(reactQuantityTag);
  if (existing) return existing;

  class ReactQuantityElement extends HTMLElement implements QuantityControlPublic {
    static readonly formAssociated = true;
    static readonly observedAttributes = ['value', 'required'];
    private readonly internals = this.attachInternals();
    private currentProduct = fallbackProduct;
    private currentValue = 1;
    private currentRequired = false;
    private root?: Root;

    get product(): ProductInput { return this.currentProduct; }
    set product(value: ProductInput) { this.currentProduct = value; this.renderView(); }
    get value(): number { return this.currentValue; }
    set value(value: number) { this.currentValue = value; this.synchronizeForm(); this.renderView(); }
    get required(): boolean { return this.currentRequired; }
    set required(value: boolean) { this.currentRequired = value; this.toggleAttribute('required', value); this.synchronizeForm(); }
    get quantity(): number { return this.currentValue; }
    get form(): HTMLFormElement | null { return this.internals.form; }
    get validationMessage(): string { return this.internals.validationMessage; }

    connectedCallback(): void {
      this.currentValue = numberAttribute(this, 'value', this.currentValue);
      this.currentRequired = this.hasAttribute('required');
      const shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
      const view = this.view();
      this.root = shadow.hasChildNodes()
        ? hydrateRoot(shadow as unknown as Element, view)
        : createRoot(shadow);
      if (!shadow.hasChildNodes()) this.root.render(view);
      adoptQuantityStyles(shadow);
      this.synchronizeForm();
    }

    disconnectedCallback(): void { this.root?.unmount(); this.root = undefined; }

    attributeChangedCallback(name: string, _oldValue: string | null, value: string | null): void {
      if (name === 'value' && value !== null) this.currentValue = Number(value);
      if (name === 'required') this.currentRequired = value !== null;
      this.synchronizeForm();
      this.renderView();
    }

    override focus(options?: FocusOptions): void {
      this.shadowRoot?.querySelector<HTMLButtonElement>('button')?.focus(options);
    }

    checkValidity(): boolean { return this.internals.checkValidity(); }

    setQuantity(quantity: number): boolean {
      const detail: QuantityChange = { productId: this.product.id, quantity: Math.max(0, quantity) };
      const accepted = this.dispatchEvent(new CustomEvent('quantity-change', {
        bubbles: true,
        composed: true,
        cancelable: true,
        detail,
      }));
      if (accepted) this.value = detail.quantity;
      return accepted;
    }

    formResetCallback(): void { this.value = numberAttribute(this, 'value', 1); }
    formStateRestoreCallback(state: string | File | FormData | null): void {
      if (typeof state === 'string') this.value = Number(state);
    }

    private view(): ReactElement {
      return createElement(ReactQuantityView, {
        product: this.currentProduct,
        value: this.currentValue,
        requestChange: (quantity: number) => this.setQuantity(quantity),
      });
    }

    private renderView(): void { if (this.isConnected) this.root?.render(this.view()); }

    private synchronizeForm(): void {
      this.internals.setFormValue(String(this.currentValue), String(this.currentValue));
      const invalid = this.currentRequired && this.currentValue < 1;
      this.internals.setValidity(invalid ? { rangeUnderflow: true } : {}, invalid ? 'Choose at least one item.' : '');
    }
  }

  customElements.define(reactQuantityTag, ReactQuantityElement);
  return ReactQuantityElement;
}

export function renderReactQuantityShadow(product: ProductInput, value: number): string {
  return renderToString(createElement(ReactQuantityView, {
    product,
    value,
    requestChange: () => true,
  }));
}

function numberAttribute(element: Element, name: string, fallback: number): number {
  const value = element.getAttribute(name);
  const parsed = value === null ? fallback : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
