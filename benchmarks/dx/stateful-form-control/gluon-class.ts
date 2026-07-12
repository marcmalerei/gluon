import {
  GluonElement,
  css,
  defineElement,
  html,
  type EventDeclarations,
  type PropertyDeclarations,
  type SlotDeclarations,
} from '@gluonjs/core';
import type { ProductInput, QuantityChange } from './shared.js';
import { quantityControlCss } from './shared.js';

export const gluonClassTag = 'dx-class-quantity';
export const gluonClassLifecycleEvidence = { cleanups: 0 };

interface QuantityProperties {
  product: ProductInput;
  value: number;
  required: boolean;
}

interface QuantityEvents {
  'quantity-change': QuantityChange;
}

// DX_COMPONENT_START
export class ClassQuantityControl extends GluonElement<QuantityEvents> {
  static readonly formAssociated = true;
  static override readonly properties = {
    product: { attribute: false, required: true },
    value: { type: Number, reflect: true, default: 1 },
    required: { type: Boolean, reflect: true, default: false },
  } satisfies PropertyDeclarations<QuantityProperties>;
  static override readonly events = {
    'quantity-change': { cancelable: true },
  } satisfies EventDeclarations<QuantityEvents>;
  static override readonly slots = {
    default: { required: true },
    help: { fallback: true },
  } satisfies SlotDeclarations<'default' | 'help'>;
  static override readonly styles = css`${quantityControlCss}`;

  declare product: ProductInput;
  declare value: number;
  declare required: boolean;

  private readonly internals = typeof this.attachInternals === 'function' ? this.attachInternals() : undefined;
  private draft = 1;
  private initial = 1;
  private release?: () => void;

  constructor() {
    super();
    this.onConnected(() => {
      this.draft = this.value;
      this.initial = this.value;
      const abort = new AbortController();
      window.addEventListener('dx-quantity-refresh', () => void this.requestUpdate(), { signal: abort.signal });
      this.release = () => abort.abort();
    });
    this.onUpdated(() => this.synchronizeForm());
    this.onDisconnected(() => {
      this.release?.();
      this.release = undefined;
      gluonClassLifecycleEvidence.cleanups += 1;
    });
  }

  get quantity(): number { return this.draft; }
  get total(): number { return this.renderedQuantity * this.product.price; }
  get form(): HTMLFormElement | null { return this.internals?.form ?? null; }
  get validationMessage(): string { return this.internals?.validationMessage ?? ''; }

  override focus(options?: FocusOptions): void {
    this.shadowRoot?.querySelector<HTMLButtonElement>('button')?.focus(options);
  }

  checkValidity(): boolean { return this.internals?.checkValidity() ?? true; }

  setQuantity(quantity: number): boolean {
    const previous = this.draft;
    this.draft = Math.max(0, quantity);
    const accepted = this.emit('quantity-change', {
      productId: this.product.id,
      quantity: this.draft,
    });
    if (!accepted) this.draft = previous;
    void this.requestUpdate();
    return accepted;
  }

  formResetCallback(): void { this.setQuantity(this.initial); }
  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state === 'string') this.setQuantity(Number(state));
  }

  protected override render() {
    return html`
      <section class="control" aria-label=${`${this.product.name} quantity`}>
        <slot></slot>
        <div class="stepper">
          <button type="button" aria-label="Decrease quantity" @click=${() => this.setQuantity(this.draft - 1)}>−</button>
          <output aria-live="polite">${this.renderedQuantity}</output>
          <button type="button" aria-label="Increase quantity" @click=${() => this.setQuantity(this.draft + 1)}>+</button>
          <strong>Total €${this.total.toFixed(2)}</strong>
        </div>
        <slot name="help">Choose a quantity.</slot>
      </section>
    `;
  }

  private synchronizeForm(): void {
    if (!this.internals) return;
    this.internals.setFormValue(String(this.draft), String(this.draft));
    const invalid = this.required && this.draft < 1;
    this.internals.setValidity(invalid ? { rangeUnderflow: true } : {}, invalid ? 'Choose at least one item.' : '');
  }

  private get renderedQuantity(): number { return this.isConnected ? this.draft : this.value; }
}
// DX_COMPONENT_END

defineElement(gluonClassTag, ClassQuantityControl);
