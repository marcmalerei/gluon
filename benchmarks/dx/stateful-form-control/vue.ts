import {
  computed,
  createApp,
  createSSRApp,
  defineComponent,
  h,
  onUnmounted,
  reactive,
  ref,
  watch,
  type App,
  type PropType,
} from 'vue';
import { renderToString } from '@vue/server-renderer';
import type { ProductInput, QuantityChange, QuantityControlPublic } from './shared.js';
import { adoptQuantityStyles } from './shared.js';

export const vueQuantityTag = 'dx-vue-quantity';
export const vueLifecycleEvidence = { cleanups: 0 };

// DX_COMPONENT_START
export const VueQuantityView = defineComponent({
  name: 'VueQuantityView',
  props: {
    product: { type: Object as PropType<ProductInput>, required: true },
    value: { type: Number, required: true },
    requestChange: { type: Function as PropType<(quantity: number) => boolean>, required: true },
  },
  setup(props) {
    const draft = ref(props.value);
    const total = computed(() => draft.value * props.product.price);
    watch(() => props.value, (value) => { draft.value = value; });
    onUnmounted(() => { vueLifecycleEvidence.cleanups += 1; });
    const change = (quantity: number): void => {
      if (props.requestChange(Math.max(0, quantity))) draft.value = Math.max(0, quantity);
    };
    return () => h('section', { class: 'control', 'aria-label': `${props.product.name} quantity` }, [
      h('slot'),
      h('div', { class: 'stepper' }, [
        h('button', { type: 'button', 'aria-label': 'Decrease quantity', onClick: () => change(draft.value - 1) }, '−'),
        h('output', { 'aria-live': 'polite' }, String(draft.value)),
        h('button', { type: 'button', 'aria-label': 'Increase quantity', onClick: () => change(draft.value + 1) }, '+'),
        h('strong', `Total €${total.value.toFixed(2)}`),
      ]),
      h('slot', { name: 'help' }, 'Choose a quantity.'),
    ]);
  },
});
// DX_COMPONENT_END

const fallbackProduct: ProductInput = Object.freeze({ id: 'missing', name: 'Missing product', price: 0 });

export function registerVueQuantityControl(): CustomElementConstructor {
  const existing = customElements.get(vueQuantityTag);
  if (existing) return existing;

  class VueQuantityElement extends HTMLElement implements QuantityControlPublic {
    static readonly formAssociated = true;
    static readonly observedAttributes = ['value', 'required'];
    private readonly internals = this.attachInternals();
    private readonly state = reactive({ product: fallbackProduct, value: 1, required: false });
    private app?: App<Element>;

    get product(): ProductInput { return this.state.product; }
    set product(value: ProductInput) { this.state.product = value; }
    get value(): number { return this.state.value; }
    set value(value: number) { this.state.value = value; this.synchronizeForm(); }
    get required(): boolean { return this.state.required; }
    set required(value: boolean) { this.state.required = value; this.toggleAttribute('required', value); this.synchronizeForm(); }
    get quantity(): number { return this.state.value; }
    get form(): HTMLFormElement | null { return this.internals.form; }
    get validationMessage(): string { return this.internals.validationMessage; }

    connectedCallback(): void {
      this.state.value = numberAttribute(this, 'value', this.state.value);
      this.state.required = this.hasAttribute('required');
      const root = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
      adoptQuantityStyles(root);
      const AppRoot = defineComponent(() => () => h(VueQuantityView, {
        product: this.state.product,
        value: this.state.value,
        requestChange: (quantity: number) => this.setQuantity(quantity),
      }));
      this.app = root.hasChildNodes() ? createSSRApp(AppRoot) : createApp(AppRoot);
      this.app.mount(root as unknown as Element);
      this.synchronizeForm();
    }

    disconnectedCallback(): void { this.app?.unmount(); this.app = undefined; }

    attributeChangedCallback(name: string, _oldValue: string | null, value: string | null): void {
      if (name === 'value' && value !== null) this.state.value = Number(value);
      if (name === 'required') this.state.required = value !== null;
      this.synchronizeForm();
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

    private synchronizeForm(): void {
      this.internals.setFormValue(String(this.state.value), String(this.state.value));
      const invalid = this.state.required && this.state.value < 1;
      this.internals.setValidity(invalid ? { rangeUnderflow: true } : {}, invalid ? 'Choose at least one item.' : '');
    }
  }

  customElements.define(vueQuantityTag, VueQuantityElement);
  return VueQuantityElement;
}

export async function renderVueQuantityShadow(product: ProductInput, value: number): Promise<string> {
  const app = createSSRApp(defineComponent(() => () => h(VueQuantityView, {
    product,
    value,
    requestChange: () => true,
  })));
  return renderToString(app);
}

function numberAttribute(element: Element, name: string, fallback: number): number {
  const value = element.getAttribute(name);
  const parsed = value === null ? fallback : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
