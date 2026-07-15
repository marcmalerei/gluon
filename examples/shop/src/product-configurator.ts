import {
  GluonElement,
  Suspense,
  css,
  html,
  repeat,
  type AsyncLoadContext,
  type EventDeclarations,
  type SlotDeclarations,
  type TemplateValue,
} from '@gluonjs/core';
import { customElement, property } from '@gluonjs/core/decorators';
import { formatPrice, type Product } from './data.js';
import { InventoryRetryAction, ProductAddAction } from './ui-extensions.js';
import {
  cloneProductConfiguration,
  createDefaultProductConfiguration,
  isProductConfiguration,
  parseProductConfiguration,
  productConfigurationChoices,
  serializeProductConfiguration,
  type ProductConfiguration,
} from './product-configuration.js';

export const productConfiguratorTag = 'gluon-product-configurator';

export interface ProductConfiguratorEvents {
  readonly 'configuration-change': {
    readonly product: Product;
    readonly configuration: ProductConfiguration;
  };
  readonly 'add-to-bag': {
    readonly product: Product;
    readonly configuration: ProductConfiguration;
  };
}

export type ProductConfiguratorEvent<Name extends keyof ProductConfiguratorEvents> = CustomEvent<
  ProductConfiguratorEvents[Name]
>;

export interface ProductConfiguratorRenderOptions {
  readonly product: Product;
  readonly configuration: ProductConfiguration;
  readonly onConfigurationChange: (
    event: ProductConfiguratorEvent<'configuration-change'>,
  ) => void;
  readonly onAddToBag: (event: ProductConfiguratorEvent<'add-to-bag'>) => void;
}

export type ProductConfiguratorRenderer = (
  options: ProductConfiguratorRenderOptions,
) => TemplateValue;

export const productConfiguratorStyles = css`
  :host {
    display: block;
    min-width: 0;
    color: var(--shop-black, #111111);
    font: inherit;
  }

  *, *::before, *::after { box-sizing: border-box; }
  button, input { font: inherit; }

  .surface { min-width: 0; }
  .product-title-row {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 20px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--shop-rule, #d5d5d1);
  }
  .product-title-row h1 {
    margin: 0 0 16px;
    font-size: clamp(42px, 4.3vw, 72px);
    font-weight: 540;
    line-height: 0.95;
    letter-spacing: -0.06em;
  }
  .product-title-row p { margin: 0; }
  .product-title-row > strong { font-size: 22px; font-weight: 520; white-space: nowrap; }

  .choice-group {
    padding: 18px 0 20px;
    border: 0;
    border-bottom: 1px solid var(--shop-rule, #d5d5d1);
    margin: 0;
  }
  .choice-group legend { margin-bottom: 12px; font-size: 14px; }
  .choice-group > div {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }
  .choice-group label {
    position: relative;
    display: flex;
    align-items: center;
    min-height: 48px;
    gap: 9px;
    padding: 8px 10px;
    border: 1px solid var(--shop-rule, #d5d5d1);
    cursor: pointer;
    font-size: 13px;
  }
  .choice-group label:hover,
  .choice-group label.is-selected { border-color: var(--shop-cobalt, #173f91); }
  .choice-group label:has(input:focus-visible),
  button:focus-visible {
    outline: var(--shop-focus, 3px solid #173f91);
    outline-offset: 3px;
  }
  .choice-group input {
    width: 17px;
    height: 17px;
    margin: 0;
    accent-color: var(--shop-cobalt, #173f91);
  }
  .choice-temperature > div,
  .choice-cable > div { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .finish-swatch { width: 18px; height: 18px; border: 1px solid #888888; border-radius: 50%; }
  .swatch-graphite { background: #313131; }
  .swatch-cobalt { background: var(--shop-cobalt, #173f91); }
  .swatch-bone { background: #ebe8de; }

  .add-to-bag {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: 54px;
    gap: 28px;
    padding: 14px 24px;
    margin-top: 20px;
    border: 1px solid var(--shop-action, #c8ff00);
    border-radius: 3px;
    background: var(--shop-action, #c8ff00);
    color: var(--shop-black, #111111);
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background 160ms ease, border-color 160ms ease;
  }
  .add-to-bag:hover { border-color: var(--shop-black, #111111); background: var(--shop-white, #ffffff); }
  .add-to-bag:disabled,
  .choice-group input:disabled + * { cursor: not-allowed; opacity: 0.52; }

  .product-facts {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    padding: 19px 0;
    margin: 0;
    border-bottom: 1px solid var(--shop-rule, #d5d5d1);
    list-style: none;
    font-size: 11px;
  }
  .product-facts li { padding-right: 8px; border-right: 1px solid var(--shop-rule, #d5d5d1); }
  .product-facts li:last-child { border-right: 0; }
  .inventory-status {
    min-height: 44px;
    display: flex;
    align-items: center;
    gap: 8px;
    border-top: 1px solid var(--shop-rule, #d5d5d1);
    border-bottom: 1px solid var(--shop-rule, #d5d5d1);
    font-size: 12px;
  }
  .inventory-dot {
    width: 8px;
    height: 8px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: var(--shop-action, #c8ff00);
    box-shadow: 0 0 0 1px rgb(17 17 17 / 28%);
  }
  .inventory-low-stock { background: #ffb347; }
  .inventory-pending { color: var(--shop-muted, #656565); }
  .inventory-retry {
    min-height: 44px;
    border: 0;
    border-bottom: 1px solid;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }

  @media (max-width: 760px) {
    .product-title-row h1 { font-size: 39px; }
    .product-title-row > strong { font-size: 21px; }
    .choice-group { padding: 10px 0 12px; }
    .choice-group legend { margin-bottom: 6px; }
    .choice-group label { min-height: 44px; }
    .add-to-bag {
      position: sticky;
      bottom: 0;
      z-index: 12;
      min-height: 58px;
      margin: 12px calc(var(--shop-gutter, 18px) * -1) 0;
      width: calc(100% + var(--shop-gutter, 18px) * 2);
      border-radius: 0;
      padding-bottom: max(14px, env(safe-area-inset-bottom));
    }
    .product-facts { font-size: 10px; }
  }

  @media (max-width: 390px) {
    .choice-group label { padding-inline: 7px; font-size: 11px; }
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { transition-duration: 0.01ms !important; }
  }
`;

interface InventoryResult {
  readonly availability: import('@gluonjs/reactivity/signals').SignalBridge<{
    readonly label: string;
    readonly dispatch: string;
  }>;
}

const inventoryCache = new Map<string, InventoryResult>();

@customElement('gluon-product-configurator')
export class ProductConfiguratorElement extends GluonElement<ProductConfiguratorEvents> {
  static readonly formAssociated = true;

  static override readonly events = {
    'configuration-change': {},
    'add-to-bag': { cancelable: true },
  } satisfies EventDeclarations<ProductConfiguratorEvents>;

  static override readonly slots = {
    title: { fallback: true },
    inventory: { fallback: true },
    default: { fallback: true },
  } satisfies SlotDeclarations<'title' | 'inventory' | 'default'>;

  static override readonly styles = productConfiguratorStyles;

  @property({
    attribute: false,
    validate: (value) => value === undefined
      || isProduct(value)
      || 'product must be a complete Product value',
  })
  product!: Product | undefined;

  @property({
    attribute: false,
    default: createDefaultProductConfiguration,
    validate: (value) => isProductConfiguration(value) || 'configuration is invalid',
  })
  configuration!: ProductConfiguration;

  @property({ type: Boolean, reflect: true, default: true })
  required!: boolean;

  @property({ type: Boolean, reflect: true, default: false })
  disabled!: boolean;

  private readonly internals = typeof this.attachInternals === 'function'
    ? this.attachInternals()
    : undefined;
  private disabledByForm = false;
  private initialConfiguration?: ProductConfiguration;

  constructor() {
    super();
    this.onConnected(() => {
      this.initialConfiguration ??= cloneProductConfiguration(this.configuration);
      this.synchronizeFormState();
    });
  }

  get form(): HTMLFormElement | null {
    return this.internals?.form ?? null;
  }

  get labels(): NodeList {
    return this.internals?.labels ?? [] as unknown as NodeList;
  }

  get name(): string {
    return this.getAttribute('name') ?? '';
  }

  set name(value: string) {
    this.setAttribute('name', value);
  }

  get type(): string {
    return productConfiguratorTag;
  }

  get value(): string {
    return serializeProductConfiguration(this.configuration);
  }

  set value(value: string) {
    const configuration = parseProductConfiguration(value);
    if (configuration) this.configuration = configuration;
  }

  get validity(): ValidityState | undefined {
    return this.internals?.validity;
  }

  get validationMessage(): string {
    return this.internals?.validationMessage ?? '';
  }

  get willValidate(): boolean {
    return this.internals?.willValidate ?? false;
  }

  checkValidity(): boolean {
    return this.internals?.checkValidity() ?? this.product !== undefined;
  }

  reportValidity(): boolean {
    return this.internals?.reportValidity() ?? this.product !== undefined;
  }

  formDisabledCallback(disabled: boolean): void {
    this.disabledByForm = disabled;
    void this.requestUpdate();
  }

  formResetCallback(): void {
    this.configuration = cloneProductConfiguration(
      this.initialConfiguration ?? createDefaultProductConfiguration(),
    );
  }

  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state !== 'string') return;
    const configuration = parseProductConfiguration(state);
    if (configuration) this.configuration = configuration;
  }

  override focus(options?: FocusOptions): void {
    const selected = this.shadowRoot?.querySelector<HTMLInputElement>('input:checked');
    const first = this.shadowRoot?.querySelector<HTMLInputElement>('input');
    (selected ?? first)?.focus(options);
  }

  protected override update(): void {
    super.update();
    this.synchronizeFormState();
  }

  protected override render() {
    const product = this.product;
    const disabled = this.disabled || this.disabledByForm || !product;
    return html`
      <section class="surface" aria-label=${product ? `${product.name} configuration` : 'Product configuration'}>
        <slot name="title">${product ? html`
          <div class="product-title-row">
            <div><h1>${product.name}</h1><p>${product.description}</p></div>
            <strong>${formatPrice(product.price)}</strong>
          </div>
        ` : html`<div class="product-title-row"><h1>Choose a product</h1></div>`}</slot>
        <slot name="inventory">${product ? renderInventoryStatus(product) : html`
          <div class="inventory-status" role="status">Product details are required.</div>
        `}</slot>
        ${this.renderChoiceGroup('Finish', 'finish', productConfigurationChoices.finish, disabled)}
        ${this.renderChoiceGroup('Light temperature', 'temperature', productConfigurationChoices.temperature, disabled)}
        ${this.renderChoiceGroup('Cable length', 'cable', productConfigurationChoices.cable, disabled)}
        ${ProductAddAction({
          disabled,
          label: `Add to bag — ${product ? formatPrice(product.price) : 'Select product'}`,
          onClick: () => this.requestAddToBag(),
        })}
        <slot><ul class="product-facts">
          <li>Ships in 2–3 days</li>
          <li>Repairable parts</li>
          <li>5-year warranty</li>
        </ul></slot>
      </section>
    `;
  }

  private renderChoiceGroup<Key extends keyof ProductConfiguration>(
    label: string,
    key: Key,
    choices: readonly ProductConfiguration[Key][],
    disabled: boolean,
  ): TemplateValue {
    return html`
      <fieldset class=${`choice-group choice-${key}`} ?disabled=${disabled}>
        <legend>${label}</legend>
        <div>${repeat(choices, String, (choice) => html`
          <label class=${this.configuration[key] === choice ? 'is-selected' : ''}>
            <input
              type="radio"
              name=${key}
              value=${String(choice)}
              .checked=${this.configuration[key] === choice}
              ?disabled=${disabled}
              @change=${() => this.select(key, choice)}
            >
            ${key === 'finish'
              ? html`<span class=${`finish-swatch swatch-${String(choice).toLowerCase()}`}></span>`
              : ''}
            <span>${choice}</span>
          </label>
        `)}</div>
      </fieldset>
    `;
  }

  private select<Key extends keyof ProductConfiguration>(
    key: Key,
    value: ProductConfiguration[Key],
  ): void {
    if (this.disabled || this.disabledByForm || !this.product) return;
    const configuration = { ...this.configuration, [key]: value };
    this.configuration = configuration;
    this.synchronizeFormState();
    this.emit('configuration-change', {
      product: this.product,
      configuration: cloneProductConfiguration(configuration),
    });
  }

  private requestAddToBag(): void {
    if (!this.product || !this.reportValidity() || this.disabled || this.disabledByForm) return;
    this.emit('add-to-bag', {
      product: this.product,
      configuration: cloneProductConfiguration(this.configuration),
    });
  }

  private synchronizeFormState(): void {
    if (!this.internals) return;
    const input = this.shadowRoot?.querySelector<HTMLInputElement>('input');
    if (this.required && !this.product) {
      this.internals.setFormValue(null);
      this.internals.setValidity(
        { valueMissing: true },
        'Choose a product before submitting its configuration.',
        input ?? undefined,
      );
      return;
    }
    const serialized = serializeProductConfiguration(this.configuration);
    this.internals.setFormValue(serialized, serialized);
    this.internals.setValidity({});
  }
}

export function registerProductConfigurator(): typeof ProductConfiguratorElement {
  return ProductConfiguratorElement;
}

export function ProductConfigurator(options: ProductConfiguratorRenderOptions): TemplateValue {
  registerProductConfigurator();
  return html`
    <gluon-product-configurator
      class="product-configurator"
      name="configuration"
      required
      .product=${options.product as unknown as Readonly<Record<string, unknown>>}
      .configuration=${options.configuration as unknown as Readonly<Record<string, unknown>>}
      @configuration-change=${options.onConfigurationChange as unknown as EventListener}
      @add-to-bag=${options.onAddToBag as unknown as EventListener}
    >${ProductConfiguratorLightContent(options.product)}</gluon-product-configurator>
  `;
}

export function ProductConfiguratorLightContent(product: Product) {
  return html`
    <div slot="title" class="product-title-row">
      <div><h1 id="product-title">${product.name}</h1><p>${product.description}</p></div>
      <strong>${formatPrice(product.price)}</strong>
    </div>
    ${renderInventoryStatus(product)}
    <ul class="product-facts">
      <li>Ships in 2–3 days</li>
      <li>Repairable parts</li>
      <li>5-year warranty</li>
    </ul>
  `;
}

function renderInventoryStatus(product: Product): TemplateValue {
  return html`<div slot="inventory" class="inventory-status" role="status" aria-live="polite">${Suspense({
    source: (context) => loadInventory(product, context),
    sourceKey: product.slug,
    fallback: html`<span class="inventory-pending">Checking workshop availability…</span>`,
    delay: 50,
    timeout: 2_000,
    children: (inventory) => html`
      <span class=${`inventory-dot inventory-${product.availability}`} aria-hidden="true"></span>
      <span>${inventory.availability.value.label} · dispatches in ${inventory.availability.value.dispatch}</span>
    `,
    error: (_error, retry) => html`
      <span>Availability could not be checked.</span>
      ${InventoryRetryAction({ label: 'Retry', onClick: () => retry() })}
    `,
  })}</div>`;
}

async function loadInventory(product: Product, { signal }: AsyncLoadContext): Promise<InventoryResult> {
  const cached = inventoryCache.get(product.slug);
  if (cached) {
    if (typeof window !== 'undefined') cached.availability.connect();
    signal.addEventListener('abort', () => cached.availability.disconnect(), { once: true });
    return cached;
  }
  const { inventorySignal, publishInventory } = await import('./inventory-signals.js');
  const availability = inventorySignal(product);
  if (typeof window !== 'undefined') availability.connect();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      publishInventory(product);
      const result = { availability };
      inventoryCache.set(product.slug, result);
      resolve(result);
    }, 200);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      availability.disconnect();
      reject(new DOMException('Inventory request aborted.', 'AbortError'));
    }, { once: true });
  });
}

function isProduct(value: unknown): value is Product {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Product>;
  return typeof candidate.slug === 'string'
    && typeof candidate.name === 'string'
    && typeof candidate.price === 'number'
    && Number.isFinite(candidate.price)
    && typeof candidate.category === 'string'
    && typeof candidate.description === 'string'
    && typeof candidate.image === 'string'
    && typeof candidate.alt === 'string'
    && (candidate.availability === 'in-stock' || candidate.availability === 'low-stock')
    && (candidate.dispatch === '1–2 days' || candidate.dispatch === '2–3 days');
}
