import {
  Teleport,
  Transition,
  TransitionGroup,
  compose,
  html,
  nothing,
  repeat,
  type TemplateValue,
} from '@gluonjs/core';
import { nextTick } from '@gluonjs/reactivity';
import { Input } from '@gluonjs/atoms';
import { createFocusScope, type FocusScope } from '@gluonjs/quarks';
import { RouterLink } from '@gluonjs/router';
import { categories, formatPrice, products, type Product } from './data.js';
import type { ShopStore } from './state.js';
import {
  ArrowIcon,
  CloseIcon,
  MenuIcon,
  SearchIcon,
} from './icons.js';
import { BagQuantityControl } from './bag-quantity-control.js';
import {
  ShopIconAction,
  ShopMenuAction,
  ShopTextAction,
} from './ui-extensions.js';

type ShopDialog = 'bag' | 'menu' | 'search';

const dialogSelectors: Record<ShopDialog, string> = {
  bag: '.bag-drawer',
  menu: '.mobile-menu',
  search: '.search-panel',
};
const dialogFocusScopes = new Map<ShopDialog, FocusScope>();

export function SiteHeader(store: ShopStore): TemplateValue {
  return html`
    <header class="site-header">
      ${compose(RouterLink, {
        to: '/',
        attributes: { class: 'wordmark', 'aria-label': 'GLUON GOODS home' },
      })`GLUON GOODS`}
      <nav class="desktop-nav" aria-label="Primary navigation">
        ${compose(RouterLink, { to: '/shop' })`Shop`}
        ${compose(RouterLink, { to: '/shop?sort=new' })`New`}
        <a href="#journal">Journal</a>
      </nav>
      <div class="header-actions">
        ${ShopTextAction({
          children: [SearchIcon(), html`<span>Search</span>`],
          attributes: { class: 'search-action' },
          onClick: (event) => {
            store.searchOpen = true;
            focusOpenedDialog('search', event.currentTarget as HTMLElement);
          },
        })}
        ${ShopTextAction({
          label: `Bag ${store.bagCount}`,
          attributes: {
            class: 'bag-action',
            aria: { label: `Open bag with ${store.bagCount} ${store.bagCount === 1 ? 'item' : 'items'}` },
          },
          onClick: (event) => {
            store.bagOpen = true;
            focusOpenedDialog('bag', event.currentTarget as HTMLElement);
          },
        })}
        ${ShopIconAction({
          children: [html`<span>Menu</span>`, MenuIcon()],
          attributes: { class: 'mobile-menu-button', aria: { label: 'Open menu' } },
          onClick: (event) => {
            store.menuOpen = true;
            focusOpenedDialog('menu', event.currentTarget as HTMLElement);
          },
        })}
      </div>
    </header>
    ${SearchPanel(store)}
    ${MobileMenu(store)}
  `;
}

export function ProductRail(items: readonly Product[] = products): TemplateValue {
  return html`
    <div class="product-rail" aria-label="Products">
      ${repeat(items, (product) => product.slug, ProductCard)}
    </div>
  `;
}

export function ProductCard(product: Product): TemplateValue {
  return compose(RouterLink, {
    to: `/products/${product.slug}`,
    attributes: { class: 'product-card', 'aria-label': `${product.name}, ${formatPrice(product.price)}` },
  })`
      <span class="product-media"><img src=${product.image} alt=${product.alt}></span>
      <span class="product-copy">
        <span><strong>${product.name}</strong><small>${formatPrice(product.price)}</small></span>
        <span class="product-arrow">${ArrowIcon()}</span>
      </span>
  `;
}

export function CategoryLinks(): TemplateValue {
  return html`
    <nav class="category-links" aria-label="Shop by category">
      ${repeat(categories, (category) => category, (category) => compose(RouterLink, {
        to: `/shop?category=${encodeURIComponent(category)}`,
        attributes: { class: 'category-link' },
      })`<span>${category}</span>${ArrowIcon()}`)}
    </nav>
  `;
}

export function BagOverlay(store: ShopStore): TemplateValue {
  return Teleport({
    to: 'body',
    children: Transition({
      duration: 140,
      transitionKey: store.bagOpen ? 'open' : 'closed',
      children: store.bagOpen ? BagDrawer(store) : nothing,
    }),
  });
}

function BagDrawer(store: ShopStore): TemplateValue {
  const close = (): void => dismissDialog('bag', () => { store.bagOpen = false; });
  return html`
    <div class="drawer-layer" @click=${(event: Event) => {
      if (event.target === event.currentTarget) close();
    }}>
      <aside class="bag-drawer" role="dialog" aria-modal="true" aria-labelledby="bag-title" @keydown=${(event: Event) => {
        handleDialogKeydown(event as KeyboardEvent, 'bag', close);
      }}>
        <header class="drawer-header">
          <h2 id="bag-title">Bag ${store.bagCount}</h2>
          ${ShopIconAction({
            children: CloseIcon(),
            attributes: { aria: { label: 'Close bag' }, data: { dialogInitialFocus: true } },
            onClick: close,
          })}
        </header>
        ${store.bag.length === 0 ? html`
          <div class="empty-bag">
            <p>Your bag is ready for something useful.</p>
            ${compose(RouterLink, {
              to: '/shop',
              attributes: { class: 'inline-link' },
            })`Shop all objects`}
          </div>
        ` : html`
          <div class="bag-lines">
            ${TransitionGroup({
              items: store.bag,
              key: (line) => line.key,
              duration: 140,
              children: (line) => html`
              <article class="bag-line">
                <img src=${line.product.image} alt="">
                <div class="bag-line-copy">
                  <div class="bag-line-heading">
                    <h3>${line.product.name}</h3>
                    <span>${formatPrice(line.product.price * line.quantity)}</span>
                  </div>
                  <p>${line.configuration.finish} · ${line.configuration.temperature} · ${line.configuration.cable}</p>
                  ${BagQuantityControl({
                    lineKey: line.key,
                    productName: line.product.name,
                    quantity: line.quantity,
                    onChange: ({ lineKey, delta }) => store.changeQuantity(lineKey, delta),
                    onRemove: ({ lineKey }) => store.removeFromBag(lineKey),
                  })}
                </div>
              </article>
              `,
            })}
          </div>
          <footer class="bag-summary">
            <div><span>Subtotal</span><strong>${formatPrice(store.bagTotal)}</strong></div>
            <p>Shipping calculated at checkout.</p>
            ${compose(RouterLink, { to: '/checkout', attributes: { class: 'primary-button' } })`Checkout`}
          </footer>
        `}
      </aside>
    </div>
  `;
}

export function SiteFooter(): TemplateValue {
  return html`
    <footer class="site-footer" id="journal">
      <strong>GLUON GOODS</strong>
      <nav aria-label="Footer navigation">
        ${compose(RouterLink, { to: '/shipping' })`Shipping`}
        ${compose(RouterLink, { to: '/returns' })`Returns`}
        ${compose(RouterLink, { to: '/#materials' })`Materials`}
        <a href="mailto:hello@example.com">Contact</a>
      </nav>
    </footer>
  `;
}

function SearchPanel(store: ShopStore): TemplateValue {
  if (!store.searchOpen) return nothing;
  const close = (): void => dismissDialog('search', () => { store.searchOpen = false; });
  const query = store.searchQuery.trim().toLocaleLowerCase();
  const matches = query
    ? products.filter((product) => `${product.name} ${product.category}`.toLocaleLowerCase().includes(query))
    : products;
  return html`
    <section class="search-panel" role="dialog" aria-modal="true" aria-labelledby="search-title" @keydown=${(event: Event) => {
      handleDialogKeydown(event as KeyboardEvent, 'search', close);
    }}>
      <div class="search-bar">
        <label id="search-title" for="shop-search">Search the collection</label>
        <div class="search-input-wrap">${SearchIcon()}${Input({
          value: store.searchQuery,
          type: 'search',
          placeholder: 'Lamp, carry, workspace…',
          onInput: (event) => {
            store.searchQuery = (event.currentTarget as HTMLInputElement).value;
          },
          attributes: {
            id: 'shop-search',
            class: 'shop-search-input',
            data: { dialogInitialFocus: true },
          },
        })}</div>
        ${ShopIconAction({
          children: CloseIcon(),
          attributes: { aria: { label: 'Close search' } },
          onClick: close,
        })}
      </div>
      <div class="search-results">
        <p>${matches.length} ${matches.length === 1 ? 'object' : 'objects'}</p>
        ${ProductRail(matches)}
      </div>
    </section>
  `;
}

function MobileMenu(store: ShopStore): TemplateValue {
  if (!store.menuOpen) return nothing;
  const close = (): void => dismissDialog('menu', () => { store.menuOpen = false; });
  return html`
    <div class="drawer-layer menu-layer" @click=${(event: Event) => {
      if (event.target === event.currentTarget) close();
    }}>
      <aside class="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" @keydown=${(event: Event) => {
        handleDialogKeydown(event as KeyboardEvent, 'menu', close);
      }}>
        <header class="drawer-header">
          <strong>GLUON GOODS</strong>
          ${ShopIconAction({
            children: CloseIcon(),
            attributes: { aria: { label: 'Close menu' }, data: { dialogInitialFocus: true } },
            onClick: close,
          })}
        </header>
        <nav aria-label="Mobile navigation">
          ${ShopMenuAction({
            children: [html`<span>Search</span>`, SearchIcon()],
            onClick: () => {
              store.menuOpen = false;
              store.searchOpen = true;
              const returnTarget = document.querySelector<HTMLElement>('.mobile-menu-button');
              if (returnTarget) focusOpenedDialog('search', returnTarget);
            },
          })}
          ${compose(RouterLink, { to: '/shop' })`<span>Shop</span>${ArrowIcon()}`}
          ${compose(RouterLink, { to: '/shop?sort=new' })`<span>New</span>${ArrowIcon()}`}
          <a href="#journal" @click=${close}><span>Journal</span>${ArrowIcon()}</a>
        </nav>
        <div class="menu-categories">${CategoryLinks()}</div>
      </aside>
    </div>
  `;
}

export function focusOpenedDialog(dialog: ShopDialog, trigger: HTMLElement): void {
  void nextTick(() => {
    const container = document.querySelector<HTMLElement>(dialogSelectors[dialog]);
    if (!container) return;
    dialogFocusScopes.get(dialog)?.deactivate();
    const scope = createFocusScope(container, {
      initialFocus: '[data-dialog-initial-focus]',
      returnFocus: trigger,
    });
    dialogFocusScopes.set(dialog, scope);
    scope.activate();
  });
}

function dismissDialog(dialog: ShopDialog, close: () => void): void {
  close();
  dialogFocusScopes.get(dialog)?.deactivate();
  dialogFocusScopes.delete(dialog);
}

export function disposeShopDialogs(): void {
  for (const scope of dialogFocusScopes.values()) scope.deactivate();
  dialogFocusScopes.clear();
}

function handleDialogKeydown(
  event: KeyboardEvent,
  dialog: ShopDialog,
  close: () => void,
): void {
  if (event.key === 'Escape') {
    event.preventDefault();
    close();
    return;
  }
  dialogFocusScopes.get(dialog)?.handleKeydown(event);
}
