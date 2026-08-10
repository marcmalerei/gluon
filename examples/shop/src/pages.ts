import { LayoutTransition, compose, html, repeat, type TemplateValue } from '@gluonjs/core';
import { Select } from '@gluonjs/atoms';
import { Accordion, InlineNotice, NavigationStrip, SegmentedControl, TableRegion, Tabs } from '@gluonjs/molecules';
import { RouterLink, useRoute, useRouter } from '@gluonjs/router';
import {
  categories,
  findProduct,
  formatPrice,
  heroImage,
  products,
  type Product,
} from './data.js';
import type { ShopStore } from './state.js';
import { ArrowIcon } from './icons.js';
import {
  ProductConfigurator,
  type ProductConfiguratorRenderer,
} from './product-configurator.js';
import {
  CategoryLinks,
  ProductCard,
  ProductRail,
  focusOpenedDialog,
} from './components.js';
import { CheckoutExperience } from './ui-extensions.js';

export function HomePage(_store: ShopStore): TemplateValue {
  return html`
    <section class="home-hero">
      <div class="hero-copy">
        <h1>Objects that work the way you do.</h1>
        <p>Modular essentials, made for changing spaces.</p>
        ${compose(RouterLink, {
          to: '/shop',
          attributes: { class: 'primary-button' },
        })`<span>Shop the collection</span>${ArrowIcon()}`}
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
  const router = useRouter();
  const selected = typeof route.query.category === 'string' ? route.query.category : 'All';
  const sort = typeof route.query.sort === 'string' ? route.query.sort : 'featured';
  const view = route.query.view === 'list' ? 'list' : 'grid';
  const filtered = selected === 'All'
    ? products
    : products.filter((product) => product.category === selected);
  const visible = sortProducts(filtered, sort);
  return html`
    <section class="catalog-page">
      <header class="catalog-heading">
        <h1>Shop all objects</h1>
        <p>${visible.length} ${visible.length === 1 ? 'object' : 'objects'} made to move with you.</p>
      </header>
      ${NavigationStrip({
        label: 'Filter products',
        attributes: { class: 'catalog-filters' },
        children: [
          RouterLink({
            to: '/shop',
            children: 'All',
            attributes: { class: selected === 'All' ? 'is-selected' : '' },
          }),
          repeat(categories, (category) => category, (category) => RouterLink({
            to: `/shop?category=${encodeURIComponent(category)}`,
            children: category,
            attributes: { class: selected === category ? 'is-selected' : '' },
          })),
        ],
      })}
      <div class="catalog-sort">
        ${SegmentedControl({
          label: 'Product view',
          value: view,
          options: [
            { value: 'grid', label: 'Grid' },
            { value: 'list', label: 'List' },
          ],
          onChange: (nextView) => {
            void router.push(catalogUrl(selected, sort, nextView));
          },
          attributes: { class: 'catalog-view' },
        })}
        <label for="catalog-sort">Sort by</label>
        ${Select({
          value: sort,
          attributes: { id: 'catalog-sort', 'aria-label': 'Sort products' },
          onChange: (event) => {
            const value = (event.currentTarget as HTMLSelectElement).value;
            void router.push(catalogUrl(selected, value, view));
          },
          children: html`
            <option value="featured">Featured</option>
            <option value="new">Newest</option>
            <option value="name">Name</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
          `,
        })}
      </div>
      ${LayoutTransition({
        layoutId: 'catalog-grid',
        transitionKey: `${selected}:${sort}:${view}`,
        duration: 180,
        children: html`<div class=${view === 'list' ? 'catalog-grid is-list-view' : 'catalog-grid'}>
          ${repeat(visible, (product) => product.slug, ProductCard)}
        </div>`,
      })}
    </section>
  `;
}

function catalogUrl(category: string, sort: string, view: string): string {
  const query = new URLSearchParams();
  if (category !== 'All') query.set('category', category);
  if (sort !== 'featured') query.set('sort', sort);
  if (view !== 'grid') query.set('view', view);
  const suffix = query.toString();
  return suffix ? `/shop?${suffix}` : '/shop';
}

function sortProducts(items: readonly Product[], sort: string): readonly Product[] {
  const sorted = [...items];
  if (sort === 'new') return sorted.reverse();
  if (sort === 'name') return sorted.sort((left, right) => left.name.localeCompare(right.name));
  if (sort === 'price-low') return sorted.sort((left, right) => left.price - right.price);
  if (sort === 'price-high') return sorted.sort((left, right) => right.price - left.price);
  return items;
}

export function ProductPage(
  store: ShopStore,
  renderProductConfigurator: ProductConfiguratorRenderer = ProductConfigurator,
): TemplateValue {
  const route = useRoute();
  const router = useRouter();
  const product = findProduct(route.params.slug);
  if (!product) return NotFoundPage(store);
  const productInfo = route.query.info === 'details' ? 'details' : 'story';
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
        ${renderProductConfigurator({
          product,
          configuration: store.configuration,
          onConfigurationChange: ({ detail }) => {
            store.configure('finish', detail.configuration.finish);
            store.configure('temperature', detail.configuration.temperature);
            store.configure('cable', detail.configuration.cable);
          },
          onAddToBag: (event) => {
            store.configure('finish', event.detail.configuration.finish);
            store.configure('temperature', event.detail.configuration.temperature);
            store.configure('cable', event.detail.configuration.cable);
            store.addToBag(event.detail.product);
            focusOpenedDialog('bag', event.currentTarget as HTMLElement);
          },
        })}
      </div>
      <section class="product-story">
        ${Tabs({
          label: 'Product information',
          value: productInfo,
          attributes: { class: 'product-info-tabs' },
          items: [
            {
              id: `${product.slug}-story`,
              value: 'story',
              label: 'Story',
              panel: html`<div><h2>Designed around change</h2><p>${product.name} is built from modular components that are easy to adjust, maintain, and repair. Precise materials make it useful now and adaptable later.</p></div>`,
            },
            {
              id: `${product.slug}-details`,
              value: 'details',
              label: 'Details',
              panel: html`<dl>
                <div><dt>Materials</dt><dd>Powder-coated steel, replaceable hardware</dd></div>
                <div><dt>Delivery & returns</dt><dd>Ships in 2–3 days, 30-day returns</dd></div>
                <div><dt>Care</dt><dd>Wipe clean, parts available individually</dd></div>
              </dl>`,
            },
          ],
          onChange: (nextInfo) => {
            const suffix = nextInfo === 'details' ? '?info=details' : '';
            void router.push(`/products/${product.slug}${suffix}`).then(() => {
              document.getElementById(`${product.slug}-${nextInfo}-tab`)?.focus();
            });
          },
        })}
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
  const route = useRoute();
  const router = useRouter();
  const topic = typeof route.query.topic === 'string' && ['tracking', 'packaging', 'remote'].includes(route.query.topic)
    ? route.query.topic
    : undefined;
  return PolicyPage(
    'Shipping',
    'In-stock objects leave our workshop in 2–3 working days. Every order includes tracked delivery and repair guidance for the objects inside.',
    Accordion({
      label: 'Delivery service details',
      value: topic,
      collapsible: true,
      attributes: { class: 'policy-details' },
      items: [
        { id: 'shipping-tracking', value: 'tracking', summary: 'Tracking', children: html`<p>Sent by email as soon as the workshop dispatches your order.</p>` },
        { id: 'shipping-packaging', value: 'packaging', summary: 'Packaging', children: html`<p>Recyclable board, sized to protect replaceable parts.</p>` },
        { id: 'shipping-remote', value: 'remote', summary: 'Remote areas', children: html`<p>Allow one additional working day after dispatch.</p>` },
      ],
      onChange: (value) => {
        void router.push(value ? `/shipping?topic=${encodeURIComponent(value)}` : '/shipping');
      },
    }),
  );
}

export function ReturnsPage(_store: ShopStore): TemplateValue {
  return PolicyPage(
    'Returns',
    'Unused objects can be returned within 30 days. Start with a message to hello@example.com and we will provide the closest return route.',
  );
}

export function CheckoutPage(store: ShopStore): TemplateValue {
  const router = useRouter();
  if (store.bag.length === 0) return html`
    <section class="checkout-empty"><h1>Your bag is empty.</h1>
      ${RouterLink({ to: '/shop', children: 'Return to the collection', attributes: { class: 'primary-button' } })}
    </section>`;
  const itemCount = store.bag.reduce((count, line) => count + line.quantity, 0);
  const summary = html`<aside class="order-summary"><h2 id="checkout-order-summary-title">Order summary</h2>
    ${TableRegion({
      id: 'checkout-order-summary-table',
      labelledBy: 'checkout-order-summary-title',
      summary: `${itemCount} ${itemCount === 1 ? 'object' : 'objects'} ready to order.`,
      scrollHint: 'Scroll horizontally to review every order column.',
      attributes: { class: 'checkout-order-table-region' },
      children: html`<table class="checkout-order-table">
        <caption class="visually-hidden">Objects and prices in this order</caption>
        <thead><tr><th scope="col">Object</th><th scope="col">Quantity</th><th scope="col">Price</th></tr></thead>
        <tbody>${repeat(store.bag, (line) => line.key, (line) => html`<tr><th scope="row">${line.product.name}</th><td>${line.quantity}</td><td>${formatPrice(line.product.price * line.quantity)}</td></tr>`)}</tbody>
        <tfoot><tr><th scope="row" colspan="2">Total</th><td><strong>${formatPrice(store.bagTotal)}</strong></td></tr></tfoot>
      </table>`,
    })}
  </aside>`;
  return CheckoutExperience({
    values: store.checkout,
    totalLabel: formatPrice(store.bagTotal),
    summary,
    onFieldInput: (name, value) => store.updateCheckout(name, value),
    onSubmit: (event) => {
      event.preventDefault();
      const order = store.placeOrder();
      void router.push(`/orders/${encodeURIComponent(order.id)}`);
    },
  });
}

export function OrderConfirmationPage(store: ShopStore): TemplateValue {
  const route = useRoute();
  const order = store.order;
  if (!order || route.params.id !== order.id) return NotFoundPage(store);
  return html`<section class="order-confirmation"><p class="eyebrow">Order confirmed</p>
    <h1>Thank you, your objects are reserved.</h1>
    ${InlineNotice({
      tone: 'success',
      announcement: 'polite',
      title: `Order ${order.id} is confirmed.`,
      attributes: { class: 'order-confirmation-notice' },
      children: html`<p>We sent the delivery details to ${order.email}.</p><strong class="order-total">${formatPrice(order.total)}</strong>`,
      action: RouterLink({ to: '/shop', children: 'Continue shopping', attributes: { class: 'primary-button' } }),
    })}
  </section>`;
}

function ProductGallery(product: Product): TemplateValue {
  return html`
    <section class="product-gallery" aria-label=${`${product.name} gallery`} tabindex="0">
      <figure class="gallery-primary"><img src=${product.image} alt=${product.alt}></figure>
      <figure><img src=${product.image} alt="" class="detail-crop detail-top"></figure>
      <figure><img src=${product.image} alt="" class="detail-crop detail-base"></figure>
      <div class="gallery-dots" aria-hidden="true"><span class="is-active"></span><span></span><span></span></div>
    </section>
  `;
}

function PolicyPage(title: string, copy: string, details?: TemplateValue): TemplateValue {
  return html`
    <article class="policy-page">
      <h1>${title}</h1>
      <p>${copy}</p>
      ${details}
      ${RouterLink({ to: '/shop', children: html`<span>Return to the collection</span>${ArrowIcon()}`, attributes: { class: 'primary-button' } })}
    </article>
  `;
}
