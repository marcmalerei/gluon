<script setup lang="ts">import { useCartStore } from '../stores/cart'; import CheckoutShell from '../components/CheckoutShell.vue'; const cart = useCartStore()</script>
<template><CheckoutShell title="Checkout"><p data-checkout-summary>{{ cart.quantity }} × Evidence Tote for {{ cart.email || 'guest' }}</p><RouterLink to="/">Back to product</RouterLink></CheckoutShell></template>
