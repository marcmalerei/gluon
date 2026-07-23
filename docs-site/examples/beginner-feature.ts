import {
  createApp,
  createStyleSheetOwner,
  css,
  html,
  repeat,
} from '@gluonjs/core';
import {
  computed,
  ref,
} from '@gluonjs/reactivity';

interface Product {
  readonly id: string;
  readonly name: string;
  readonly price: string;
}

const products: readonly Product[] = [
  { id: 'orbit-lamp', name: 'Orbit Lamp', price: '$128' },
  { id: 'field-tote', name: 'Field Tote', price: '$84' },
];
const query = ref('');
const visibleProducts = computed(() => {
  const needle = query.value.trim().toLowerCase();
  return needle
    ? products.filter((product) => product.name.toLowerCase().includes(needle))
    : products;
});
const styles = css`
  main { max-inline-size: 40rem; margin: 2rem auto; font: 1rem/1.5 system-ui; }
  label, article { display: grid; gap: 0.5rem; }
  section { display: grid; gap: 1rem; margin-block-start: 1.5rem; }
  article { padding: 1rem; border: 1px solid #d8d8d8; }
`;
const styleOwner = createStyleSheetOwner(document);
styleOwner.retain(styles);

const app = createApp(() => html`
  <main>
    <h1>Products</h1>
    <label>
      Search
      <input
        type="search"
        .value=${query.value}
        @input=${(event: Event) => {
          query.value = (event.currentTarget as HTMLInputElement).value;
        }}
      >
    </label>
    <p>${visibleProducts.value.length} result(s)</p>
    <section>
      ${repeat(
        visibleProducts.value,
        (product) => product.id,
        (product) => html`
          <article>
            <strong>${product.name}</strong>
            <span>${product.price}</span>
          </article>
        `,
      )}
    </section>
  </main>
`);

app.onUnmounted(() => styleOwner.dispose());
const mounted = app.mount(document.querySelector('#app')!);
window.addEventListener('pagehide', () => mounted.unmount(), { once: true });
