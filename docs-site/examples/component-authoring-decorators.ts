import {
  GluonElement,
  event,
  html,
  type ComponentEventMap,
  type EventDeclarations,
} from '@gluonjs/core';
import { customElement, property, state } from '@gluonjs/core/decorators';

interface ProductSummary {
  readonly id: string;
  readonly name: string;
}

interface ProductCardEvents {
  readonly 'add-to-bag': {
    readonly productId: string;
    readonly quantity: number;
  };
}

@customElement('product-card-decorated')
export class DecoratedProductCard extends GluonElement<ProductCardEvents> {
  static override readonly events = {
    'add-to-bag': { cancelable: true },
  } satisfies EventDeclarations<ProductCardEvents>;

  @property({
    type: Object,
    attribute: false,
    required: true,
    validate: (value: ProductSummary) => value.id.length > 0 || 'A product id is required.',
  })
  product!: ProductSummary;

  @property({
    type: Number,
    default: 1,
    reflect: true,
    validate: (value: number) => Number.isInteger(value) && value > 0
      || 'Quantity must be a positive integer.',
  })
  quantity!: number;

  @property({ type: Boolean })
  featured!: boolean;

  @state({ default: false })
  private accepted!: boolean;

  private addToBag(): void {
    this.accepted = this.emit('add-to-bag', {
      productId: this.product.id,
      quantity: this.quantity,
    });
    if (this.accepted) this.quantity = 1;
  }

  protected override render() {
    return html`
      <article data-featured=${this.featured}>
        <h2>${this.product.name}</h2>
        <button type="button" @click=${() => this.addToBag()}>
          Add ${this.quantity} to bag
        </button>
        <output>${this.accepted ? 'Accepted' : 'Not submitted'}</output>
      </article>
    `;
  }
}

const inventory = new Set(['orbit-lamp']);

function onAddToBag(nativeEvent: Event): void {
  const addEvent = nativeEvent as ComponentEventMap<ProductCardEvents>['add-to-bag'];
  if (!inventory.has(addEvent.detail.productId)) addEvent.preventDefault();
}

const product = { id: 'orbit-lamp', name: 'Orbit Lamp' } satisfies ProductSummary;

export const decoratedCard = html`
  <product-card-decorated
    .product=${product}
    .quantity=${2}
    featured
    @add-to-bag=${event(onAddToBag, { once: true })}
  ></product-card-decorated>
`;
