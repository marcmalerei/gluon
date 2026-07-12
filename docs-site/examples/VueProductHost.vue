<script setup lang="ts">
import { computed, ref } from 'vue';
import { products, type Product } from '../../examples/shop/src/data.js';
import {
  createDefaultProductConfiguration,
  type ProductConfiguration,
} from '../../examples/shop/src/product-configuration.js';
import type {
  ProductConfiguratorEvent,
} from '../../examples/shop/src/product-configurator.js';

const product = ref<Product>(products[0]!);
const configuration = ref<ProductConfiguration>(createDefaultProductConfiguration());
const addedLine = ref('No configured item has been added.');
const submittedValue = ref('The host form has not been submitted.');

const alternateProduct = computed(() => (
  product.value.slug === 'orbit-lamp' ? products[2]! : products[0]!
));

function changeProduct(): void {
  product.value = alternateProduct.value;
  configuration.value = createDefaultProductConfiguration();
  addedLine.value = `Vue changed the structured product property to ${product.value.name}.`;
}

function updateConfiguration(
  event: ProductConfiguratorEvent<'configuration-change'>,
): void {
  configuration.value = event.detail.configuration;
}

function addConfiguredProduct(event: ProductConfiguratorEvent<'add-to-bag'>): void {
  const { product: selectedProduct, configuration: selected } = event.detail;
  addedLine.value = [
    selectedProduct.name,
    selected.finish,
    selected.temperature,
    selected.cable,
  ].join(' · ');
}

function submitConfiguration(event: Event): void {
  const form = event.currentTarget as HTMLFormElement;
  submittedValue.value = String(new FormData(form).get('configuration'));
}
</script>

<template>
  <main class="vue-migration-host">
    <header class="vue-host-header">
      <div>
        <p class="eyebrow">Vue 3 host · incremental migration</p>
        <h1>One production Gluon boundary, two application owners.</h1>
      </div>
      <button class="host-action" type="button" data-use-product @click="changeProduct">
        Use {{ alternateProduct.name }}
      </button>
    </header>

    <section class="vue-host-layout" aria-label="Vue and Gluon coexistence fixture">
      <form @submit.prevent="submitConfiguration">
        <label class="visually-hidden" for="vue-product-configurator">Product configuration</label>
        <gluon-product-configurator
          id="vue-product-configurator"
          class="product-configurator"
          name="configuration"
          required
          :product.prop="product"
          :configuration.prop="configuration"
          @configuration-change="updateConfiguration"
          @add-to-bag="addConfiguredProduct"
        >
          <div slot="title" class="product-title-row">
            <div><h2 id="vue-product-title">{{ product.name }}</h2><p>{{ product.description }}</p></div>
            <strong>€{{ product.price }}</strong>
          </div>
          <ul class="product-facts">
            <li>Vue owns this light DOM</li>
            <li>Gluon owns the controls</li>
            <li>Native events cross the boundary</li>
          </ul>
        </gluon-product-configurator>
        <button class="host-submit" type="submit">Read native form value</button>
      </form>

      <aside class="vue-host-evidence" aria-live="polite">
        <p class="eyebrow">Observed by Vue</p>
        <h2>Boundary evidence</h2>
        <dl>
          <div><dt>Current configuration</dt><dd data-current-configuration>{{ configuration.finish }} · {{ configuration.temperature }} · {{ configuration.cable }}</dd></div>
          <div><dt>Last add event</dt><dd data-added-line>{{ addedLine }}</dd></div>
          <div><dt>Form value</dt><dd data-form-value>{{ submittedValue }}</dd></div>
        </dl>
      </aside>
    </section>
  </main>
</template>
