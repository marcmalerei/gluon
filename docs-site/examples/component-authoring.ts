import {
  GluonElement,
  defineElement,
  event,
  html,
  type ComponentEventMap,
  type EventDeclarations,
  type PropertyDeclarations,
} from '@gluonjs/core';

interface ProductSummary {
  readonly id: string;
  readonly name: string;
}

interface ProductCardProperties {
  product: ProductSummary;
  quantity: number;
  featured: boolean;
}

interface ProductCardEvents {
  readonly 'add-to-bag': {
    readonly productId: string;
    readonly quantity: number;
  };
}

export class ProductCard extends GluonElement<ProductCardEvents> {
  static override readonly properties = {
    product: {
      type: Object,
      attribute: false,
      required: true,
      validate: (value: ProductSummary) => value.id.length > 0 || 'A product id is required.',
    },
    quantity: {
      type: Number,
      default: 1,
      reflect: true,
      validate: (value: number) => Number.isInteger(value) && value > 0
        || 'Quantity must be a positive integer.',
    },
    featured: Boolean,
  } satisfies PropertyDeclarations<ProductCardProperties>;

  static override readonly events = {
    'add-to-bag': { cancelable: true },
  } satisfies EventDeclarations<ProductCardEvents>;

  declare product: ProductSummary;
  declare quantity: number;
  declare featured: boolean;

  private addToBag(): void {
    const accepted = this.emit('add-to-bag', {
      productId: this.product.id,
      quantity: this.quantity,
    });
    if (accepted) this.quantity = 1;
  }

  protected override render() {
    return html`
      <article data-featured=${this.featured}>
        <h2>${this.product.name}</h2>
        <button type="button" @click=${() => this.addToBag()}>
          Add ${this.quantity} to bag
        </button>
      </article>
    `;
  }
}

defineElement('product-card', ProductCard);

const inventory = new Set(['orbit-lamp']);

function onAddToBag(nativeEvent: Event): void {
  const addEvent = nativeEvent as ComponentEventMap<ProductCardEvents>['add-to-bag'];
  if (!inventory.has(addEvent.detail.productId)) addEvent.preventDefault();
}

const product = { id: 'orbit-lamp', name: 'Orbit Lamp' } satisfies ProductSummary;

export const card = html`
  <product-card
    .product=${product}
    .quantity=${2}
    featured
    @add-to-bag=${event(onAddToBag, { once: true })}
  ></product-card>
`;
