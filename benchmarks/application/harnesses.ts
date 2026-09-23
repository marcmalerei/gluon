import {
  createApp,
  html as gluonHtml,
  nothing as gluonNothing,
  repeat as gluonRepeat,
} from '@gluonjs/core';
import { nextTick as gluonNextTick, reactive as gluonReactive } from '@gluonjs/reactivity';
import { LitElement, html as litHtml } from 'lit';
import { repeat as litRepeat } from 'lit/directives/repeat.js';
import { createApp as createVueApp, h as vueH, nextTick as vueNextTick, reactive as vueReactive } from 'vue';

export const APP_PRODUCT_COUNT = 120;
export const applicationFrameworks = ['gluon', 'lit', 'vue'] as const;
export const applicationScenarios = ['mount', 'filter', 'sort', 'configure', 'bag', 'teardown'] as const;

export type ApplicationFramework = typeof applicationFrameworks[number];
export type ApplicationScenario = typeof applicationScenarios[number];

type Category = 'Lighting' | 'Carry' | 'Workspace' | 'Seating';

interface Product {
  readonly id: number;
  readonly name: string;
  readonly category: Category;
  readonly price: number;
}

interface AppState {
  filter: Category | 'All';
  reversed: boolean;
  selectedId: number | null;
  finish: 'Black' | 'Cobalt';
  bagQuantity: number;
}

export interface ApplicationSnapshot {
  readonly productCount: number;
  readonly firstProductId: string | null;
  readonly lastProductId: string | null;
  readonly selectedProductId: string | null;
  readonly finish: string | null;
  readonly bagQuantity: string | null;
}

export interface ApplicationHarness {
  readonly framework: ApplicationFramework;
  mount(): Promise<void>;
  action(scenario: Exclude<ApplicationScenario, 'mount' | 'teardown'>): Promise<void>;
  snapshot(): ApplicationSnapshot;
  dispose(): Promise<void>;
}

const categories: readonly Category[] = ['Lighting', 'Carry', 'Workspace', 'Seating'];
const products = Object.freeze(Array.from({ length: APP_PRODUCT_COUNT }, (_, id): Product => ({
  id,
  name: `Object ${String(id + 1).padStart(3, '0')}`,
  category: categories[id % categories.length]!,
  price: 48 + ((id * 17) % 280),
})));

export function createApplicationHarness(framework: ApplicationFramework): ApplicationHarness {
  if (framework === 'gluon') return createGluonHarness();
  if (framework === 'lit') return createLitHarness();
  return createVueHarness();
}

function createGluonHarness(): ApplicationHarness {
  const root = createBenchmarkRoot();
  const state = gluonReactive(createInitialState());
  const app = createApp(() => renderGluon(state));
  let mountHandle: { unmount(): void } | undefined;

  return {
    framework: 'gluon',
    async mount() {
      mountHandle = app.mount(root);
      await gluonNextTick();
    },
    async action(scenario) {
      const selector = actionSelector(scenario, state);
      clickRequired(root, selector);
      await gluonNextTick();
    },
    snapshot: () => readSnapshot(root),
    async dispose() {
      if (mountHandle) mountHandle.unmount();
      root.remove();
      await gluonNextTick();
    },
  };
}

class LitApplicationElement extends LitElement {
  state = createInitialState();

  protected override render() {
    return renderLit(this.state, this);
  }

  toggleFilter() {
    this.state.filter = this.state.filter === 'All' ? 'Lighting' : 'All';
    this.requestUpdate();
  }

  toggleSort() {
    this.state.reversed = !this.state.reversed;
    this.requestUpdate();
  }

  toggleSelection(id: number) {
    this.state.selectedId = this.state.selectedId === id ? null : id;
    this.requestUpdate();
  }

  toggleFinish() {
    this.state.finish = this.state.finish === 'Black' ? 'Cobalt' : 'Black';
    this.requestUpdate();
  }

  toggleBag() {
    this.state.bagQuantity = this.state.bagQuantity === 0 ? 1 : 0;
    this.requestUpdate();
  }
}

if (!customElements.get('gluon-benchmark-lit-app')) {
  customElements.define('gluon-benchmark-lit-app', LitApplicationElement);
}

function createLitHarness(): ApplicationHarness {
  const root = createBenchmarkRoot();
  let element: LitApplicationElement | undefined;

  return {
    framework: 'lit',
    async mount() {
      element = document.createElement('gluon-benchmark-lit-app') as LitApplicationElement;
      root.append(element);
      await element.updateComplete;
    },
    async action(scenario) {
      if (!element) throw new Error('Lit application is not mounted.');
      const selector = actionSelector(scenario, element.state);
      clickRequired(element.shadowRoot ?? element, selector);
      await element.updateComplete;
    },
    snapshot: () => readSnapshot(element?.shadowRoot ?? root),
    async dispose() {
      element?.remove();
      root.remove();
      element = undefined;
    },
  };
}

function createVueHarness(): ApplicationHarness {
  const root = createBenchmarkRoot();
  let state: AppState | undefined;
  const app = createVueApp({
    setup() {
      state = vueReactive(createInitialState());
      return () => renderVue(state!);
    },
  });

  return {
    framework: 'vue',
    async mount() {
      app.mount(root);
      await vueNextTick();
    },
    async action(scenario) {
      if (!state) throw new Error('Vue application is not mounted.');
      clickRequired(root, actionSelector(scenario, state));
      await vueNextTick();
    },
    snapshot: () => readSnapshot(root),
    async dispose() {
      app.unmount();
      root.remove();
      await vueNextTick();
    },
  };
}

function createInitialState(): AppState {
  return {
    filter: 'All',
    reversed: false,
    selectedId: null,
    finish: 'Black',
    bagQuantity: 0,
  };
}

function createBenchmarkRoot(): HTMLDivElement {
  const root = document.createElement('div');
  root.setAttribute('aria-hidden', 'true');
  document.body.append(root);
  return root;
}

function actionSelector(scenario: Exclude<ApplicationScenario, 'mount' | 'teardown'>, state: AppState): string {
  if (scenario === 'filter') return '[data-action="filter"]';
  if (scenario === 'sort') return '[data-action="sort"]';
  if (scenario === 'configure') {
    return state.selectedId === null ? '[data-action="select"]' : '[data-action="configure"]';
  }
  return '[data-action="bag"]';
}

function visibleProducts(state: AppState): readonly Product[] {
  const filtered = state.filter === 'All'
    ? products
    : products.filter((product) => product.category === state.filter);
  return state.reversed ? [...filtered].reverse() : filtered;
}

function selectedProduct(state: AppState): Product | undefined {
  return state.selectedId === null ? undefined : products[state.selectedId];
}

function renderGluon(state: AppState) {
  const selected = selectedProduct(state);
  return gluonHtml`<main data-app-root>
    <header data-role="header">
      <nav aria-label="Primary"><a href="/">GLUON GOODS</a><a href="/shop">Catalog</a><a href="/checkout">Checkout</a></nav>
      <h1>Objects that work the way you do.</h1>
      <div data-role="controls">
        <button type="button" data-action="filter" @click=${() => { state.filter = state.filter === 'All' ? 'Lighting' : 'All'; }}>${state.filter === 'All' ? 'Show lighting' : 'Show all'}</button>
        <button type="button" data-action="sort" @click=${() => { state.reversed = !state.reversed; }}>${state.reversed ? 'Featured order' : 'Reverse order'}</button>
      </div>
    </header>
    <section data-role="catalog" aria-label="Catalog">
      ${gluonRepeat(visibleProducts(state), (product) => product.id, (product) => gluonHtml`
        <article data-role="product" data-product-id=${product.id}>
          <h2>${product.name}</h2><p>${product.category}</p><p>€${product.price}</p>
          <button type="button" data-action="select" @click=${() => { state.selectedId = state.selectedId === product.id ? null : product.id; }} aria-label=${`View ${product.name}`}>View</button>
        </article>
      `)}
    </section>
    ${selected ? gluonHtml`<section data-role="detail" data-product-id=${selected.id} aria-label="Product details">
      <h2>${selected.name}</h2><p data-role="finish">Finish: ${state.finish}</p>
      <button type="button" data-action="configure" @click=${() => { state.finish = state.finish === 'Black' ? 'Cobalt' : 'Black'; }}>${state.finish === 'Black' ? 'Choose cobalt' : 'Choose black'}</button>
      <button type="button" data-action="bag" @click=${() => { state.bagQuantity = state.bagQuantity === 0 ? 1 : 0; }}>${state.bagQuantity === 0 ? 'Add to bag' : 'Remove from bag'}</button>
    </section>` : gluonNothing}
    ${state.bagQuantity > 0 ? gluonHtml`<aside data-role="bag" aria-label="Bag">Bag: ${state.bagQuantity}</aside>` : gluonNothing}
  </main>`;
}

function renderLit(state: AppState, element: LitApplicationElement) {
  const selected = selectedProduct(state);
  return litHtml`<main data-app-root>
    <header data-role="header">
      <nav aria-label="Primary"><a href="/">GLUON GOODS</a><a href="/shop">Catalog</a><a href="/checkout">Checkout</a></nav>
      <h1>Objects that work the way you do.</h1>
      <div data-role="controls">
        <button type="button" data-action="filter" @click=${() => element.toggleFilter()}>${state.filter === 'All' ? 'Show lighting' : 'Show all'}</button>
        <button type="button" data-action="sort" @click=${() => element.toggleSort()}>${state.reversed ? 'Featured order' : 'Reverse order'}</button>
      </div>
    </header>
    <section data-role="catalog" aria-label="Catalog">
      ${litRepeat(visibleProducts(state), (product) => product.id, (product) => litHtml`
        <article data-role="product" data-product-id=${product.id}>
          <h2>${product.name}</h2><p>${product.category}</p><p>€${product.price}</p>
          <button type="button" data-action="select" @click=${() => element.toggleSelection(product.id)} aria-label="View ${product.name}">View</button>
        </article>
      `)}
    </section>
    ${selected ? litHtml`<section data-role="detail" data-product-id=${selected.id} aria-label="Product details">
      <h2>${selected.name}</h2><p data-role="finish">Finish: ${state.finish}</p>
      <button type="button" data-action="configure" @click=${() => element.toggleFinish()}>${state.finish === 'Black' ? 'Choose cobalt' : 'Choose black'}</button>
      <button type="button" data-action="bag" @click=${() => element.toggleBag()}>${state.bagQuantity === 0 ? 'Add to bag' : 'Remove from bag'}</button>
    </section>` : ''}
    ${state.bagQuantity > 0 ? litHtml`<aside data-role="bag" aria-label="Bag">Bag: ${state.bagQuantity}</aside>` : ''}
  </main>`;
}

function renderVue(state: AppState) {
  const selected = selectedProduct(state);
  return vueH('main', { 'data-app-root': '' }, [
    vueH('header', { 'data-role': 'header' }, [
      vueH('nav', { 'aria-label': 'Primary' }, [
        vueH('a', { href: '/' }, 'GLUON GOODS'),
        vueH('a', { href: '/shop' }, 'Catalog'),
        vueH('a', { href: '/checkout' }, 'Checkout'),
      ]),
      vueH('h1', null, 'Objects that work the way you do.'),
      vueH('div', { 'data-role': 'controls' }, [
        vueH('button', { type: 'button', 'data-action': 'filter', onClick: () => { state.filter = state.filter === 'All' ? 'Lighting' : 'All'; } }, state.filter === 'All' ? 'Show lighting' : 'Show all'),
        vueH('button', { type: 'button', 'data-action': 'sort', onClick: () => { state.reversed = !state.reversed; } }, state.reversed ? 'Featured order' : 'Reverse order'),
      ]),
    ]),
    vueH('section', { 'data-role': 'catalog', 'aria-label': 'Catalog' }, visibleProducts(state).map((product) => vueH(
      'article',
      { 'data-role': 'product', 'data-product-id': String(product.id), key: product.id },
      [
        vueH('h2', null, product.name), vueH('p', null, product.category), vueH('p', null, `€${product.price}`),
        vueH('button', { type: 'button', 'data-action': 'select', 'aria-label': `View ${product.name}`, onClick: () => { state.selectedId = state.selectedId === product.id ? null : product.id; } }, 'View'),
      ],
    ))),
    selected ? vueH('section', { 'data-role': 'detail', 'data-product-id': String(selected.id), 'aria-label': 'Product details' }, [
      vueH('h2', null, selected.name), vueH('p', { 'data-role': 'finish' }, `Finish: ${state.finish}`),
      vueH('button', { type: 'button', 'data-action': 'configure', onClick: () => { state.finish = state.finish === 'Black' ? 'Cobalt' : 'Black'; } }, state.finish === 'Black' ? 'Choose cobalt' : 'Choose black'),
      vueH('button', { type: 'button', 'data-action': 'bag', onClick: () => { state.bagQuantity = state.bagQuantity === 0 ? 1 : 0; } }, state.bagQuantity === 0 ? 'Add to bag' : 'Remove from bag'),
    ]) : null,
    state.bagQuantity > 0 ? vueH('aside', { 'data-role': 'bag', 'aria-label': 'Bag' }, `Bag: ${state.bagQuantity}`) : null,
  ]);
}

function clickRequired(root: ParentNode, selector: string): void {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Application action target ${selector} was not rendered.`);
  element.click();
}

function readSnapshot(root: ParentNode): ApplicationSnapshot {
  const productsInDom = [...root.querySelectorAll<HTMLElement>('[data-role="product"]')];
  const detail = root.querySelector<HTMLElement>('[data-role="detail"]');
  const finish = root.querySelector<HTMLElement>('[data-role="finish"]');
  const bag = root.querySelector<HTMLElement>('[data-role="bag"]');
  return {
    productCount: productsInDom.length,
    firstProductId: productsInDom[0]?.dataset.productId ?? null,
    lastProductId: productsInDom.at(-1)?.dataset.productId ?? null,
    selectedProductId: detail?.dataset.productId ?? null,
    finish: finish?.textContent ?? null,
    bagQuantity: bag?.textContent?.replace('Bag: ', '') ?? '0',
  };
}
