<script setup lang="ts">
import CheckoutShell from './vue-checkout-shell.vue';
import DeliveryPanel from './vue-delivery-panel.vue';

function submit(event: Event): void {
  event.preventDefault();
}
</script>

<template>
  <CheckoutShell heading="Checkout">
    <template #actions><button form="checkout">Place order</button></template>
    <template #dialog><dialog open aria-labelledby="confirm-title"><h2 id="confirm-title">Confirm order</h2><button>Close</button></dialog></template>
    <DeliveryPanel title="Delivery" @submit="submit">
      <label>Email <input name="email" type="email" required></label>
    </DeliveryPanel>
  </CheckoutShell>
</template>
