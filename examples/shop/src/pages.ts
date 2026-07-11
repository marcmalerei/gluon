import { html, repeat, type TemplateValue } from '@gluonjs/core';
import { RouterLink, useRoute } from '@gluonjs/router';
import {
  categories,
  findProduct,
  formatPrice,
  heroImage,
  products,
  type Product,
} from './data.js';
import type { ProductConfiguration, ShopStore } from './state.js';
import { ArrowIcon } from './icons.js';
import {
  CategoryLinks,
  ProductCard,
  ProductRail,
  focusOpenedDialog,
} from './components.js';

export function HomePage(_store: ShopStore): TemplateValue {
  return html`
    <section class="home-hero">
      <div class="hero-copy">
        <h1>Objects that work the way you do.</h1>
        <p>Modular essentials, made for changing spaces.</p>
        ${RouterLink({
          to: '/shop',
          attributes: { class: 'primary-button' },
          children: html`<span>Shop the collection</span>${ArrowIcon()}`,
        })}
      </div>
      <div class="hero-media">
        <img src=${heroImage} alt="Orbit Lamp and cobalt Stack Tray on a sunlit workspace">
      </div>
    </section>

    <section class="featured-products" aria-labelledby="featured-title">
      <h2 class="visually-hidden" id="featured-title">Featured products</h2>
      ${ProductRail()}
    </section>

    <section class="material-story" id="materials">
      <h2>Built to adapt</h2>
      <p>Every GLUON GOODS object is modular by design—made with considered materials and precise details so it can flex with your space, your routine, and your next move.</p>
      <div class="material-detail" aria-hidden="true"><img src=${heroImage} alt=""></div>
    </section>

    ${CategoryLinks()}
  `;
}

export function CatalogPage(_store: ShopStore): TemplateValue {
  const route = useRoute();
  const selected = typeof route.query.category === 'string' ? route.query.category : 'All';
  const visible = selected === 'All'
    ? products
    : products.filter((product) => product.category === selected);
  return html`
    <section class="catalog-page">
      <header class="catalog-heading">
        <h1>Shop all objects</h1>
        <p>${visible.length} ${visible.length === 1 ? 'object' : 'objects'} made to move with you.</p>
      </header>
      <nav class="catalog-filters" aria-label="Filter products">
        ${RouterLink({
          to: '/shop',
          children: 'All',
          attributes: { class: selected === 'All' ? 'is-selected' : '' },
        })}
        ${repeat(categories, (category) => category, (category) => RouterLink({
          to: `/shop?category=${encodeURIComponent(category)}`,
          children: category,
          attributes: { class: selected === category ? 'is-selected' : '' },
        }))}
      </nav>
      <div class="catalog-grid">
        ${repeat(visible, (product) => product.slug, ProductCard)}
      </div>
    </section>
  `;
}

export function ProductPage(store: ShopStore): TemplateValue {
  const route = useRoute();
  const product = findProduct(route.params.slug);
  if (!product) return NotFoundPage(store);
  return html`
    <article class="product-page">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        ${RouterLink({ to: '/shop', children: 'Shop' })}
        <span>/</span>
        ${RouterLink({
          to: `/shop?category=${encodeURIComponent(product.category)}`,
          children: product.category,
        })}
        <span>/</span>
        <span aria-current="page">${product.name}</span>
      </nav>
      <div class="mobile-product-back">
        ${RouterLink({ to: '/shop', children: 'Back' })}
      </div>
      <div class="product-layout">
        ${ProductGallery(product)}
        ${ProductConfigurator(product, store)}
      </div>
      <section class="product-story">
        <div>
          <h2>Designed around change</h2>
          <p>${product.name} is built from modular components that are easy to adjust, maintain, and repair. Precise materials make it useful now and adaptable later.</p>
        </div>
        <dl>
          <div><dt>Materials</dt><dd>Powder-coated steel, replaceable hardware</dd></div>
          <div><dt>Delivery & returns</dt><dd>Ships in 2–3 days, 30-day returns</dd></div>
          <div><dt>Care</dt><dd>Wipe clean, parts available individually</dd></div>
        </dl>
        <div class="paired-product">
          <h2>Pairs well with</h2>
          ${ProductCard(products.find((entry) => entry.slug === 'stack-tray')!)}
        </div>
      </section>
    </article>
  `;
}

export function NotFoundPage(_store: ShopStore): TemplateValue {
  return html`
    <section class="not-found">
      <h1>That object moved.</h1>
      <p>The page is no longer here, but the collection is.</p>
      ${RouterLink({ to: '/shop', children: 'Return to the shop', attributes: { class: 'primary-button' } })}
    </section>
  `;
}

export function ShippingPage(_store: ShopStore): TemplateValue {
  return PolicyPage(
    'Shipping',
    'In-stock objects leave our workshop in 2–3 working days. Every order includes tracked delivery and repair guidance for the objects inside.',
  );
}

export function ReturnsPage(_store: ShopStore): TemplateValue {
  return PolicyPage(
    'Returns',
    'Unused objects can be returned within 30 days. Start with a message to hello@example.com and we will provide the closest return route.',
  );
}

function ProductGallery(product: Product): TemplateValue {
  return html`
    <section class="product-gallery" aria-label=${`${product.name} gallery`}>
      <figure class="gallery-primary"><img src=${product.image} alt=${product.alt}></figure>
      <figure><img src=${product.image} alt="" class="detail-crop detail-top"></figure>
      <figure><img src=${product.image} alt="" class="detail-crop detail-base"></figure>
      <div class="gallery-dots" aria-hidden="true"><span class="is-active"></span><span></span><span></span></div>
    </section>
  `;
}

function ProductConfigurator(product: Product, store: ShopStore): TemplateValue {
  return html`
    <section class="product-configurator" aria-labelledby="product-title">
      <div class="product-title-row">
        <div><h1 id="product-title">${product.name}</h1><p>${product.description}</p></div>
        <strong>${formatPrice(product.price)}</strong>
      </div>
      ${ChoiceGroup(store, 'Finish', 'finish', ['Graphite', 'Cobalt', 'Bone'])}
      ${ChoiceGroup(store, 'Light temperature', 'temperature', ['Warm 2700K', 'Clear 3200K'])}
      ${ChoiceGroup(store, 'Cable length', 'cable', ['1.5 m', '2.5 m'])}
      <button class="primary-button add-to-bag" type="button" @click=${(event: Event) => {
        store.addToBag(product);
        focusOpenedDialog('bag', event.currentTarget as HTMLElement);
      }}>
        Add to bag — ${formatPrice(product.price)}
      </button>
      <ul class="product-facts">
        <li>Ships in 2–3 days</li>
        <li>Repairable parts</li>
        <li>5-year warranty</li>
      </ul>
    </section>
  `;
}

function ChoiceGroup<Key extends keyof ProductConfiguration>(
  store: ShopStore,
  label: string,
  key: Key,
  choices: readonly ProductConfiguration[Key][],
): TemplateValue {
  return html`
    <fieldset class=${`choice-group choice-${key}`}>
      <legend>${label}</legend>
      <div>
        ${repeat(choices, (choice) => String(choice), (choice) => html`
          <label class=${store.configuration[key] === choice ? 'is-selected' : ''}>
            <input
              type="radio"
              name=${key}
              .checked=${store.configuration[key] === choice}
              @change=${() => store.configure(key, choice)}
            >
            ${key === 'finish' ? html`<span class=${`finish-swatch swatch-${String(choice).toLowerCase()}`}></span>` : ''}
            <span>${choice}</span>
          </label>
        `)}
      </div>
    </fieldset>
  `;
}

function PolicyPage(title: string, copy: string): TemplateValue {
  return html`
    <article class="policy-page">
      <h1>${title}</h1>
      <p>${copy}</p>
      ${RouterLink({ to: '/shop', children: html`<span>Return to the collection</span>${ArrowIcon()}`, attributes: { class: 'primary-button' } })}
    </article>
  `;
}
