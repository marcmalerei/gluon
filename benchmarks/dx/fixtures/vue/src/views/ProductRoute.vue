<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import CheckoutShell from '../components/CheckoutShell.vue'
import PrimitiveButton from '../components/PrimitiveButton.vue'
import QuantityControl from '../components/QuantityControl.vue'
import { useCartStore } from '../stores/cart'
import { hmrMarker } from '../hmr-marker'
const product = { sku: 'GL-107', name: 'Evidence Tote', unitPrice: 24 } as const
const cart = useCartStore()
const router = useRouter()
const control = ref<InstanceType<typeof QuantityControl>>()
function updateQuantity(value: number) { cart.quantity = value; cart.persist() }
</script>
<template><CheckoutShell :title="product.name"><p>Production-valid comparator flow · <span data-hmr-marker>{{ hmrMarker }}</span></p><label class="field"><span>Email</span><input v-model="cart.email" type="email" @input="cart.persist" /></label><QuantityControl ref="control" :product="product" :initial-value="cart.quantity" @quantity-change="updateQuantity" /><div class="actions"><PrimitiveButton variant="purchase" data-analytics="add" @click="cart.persist(); router.push('/checkout')">Add to bag</PrimitiveButton><PrimitiveButton variant="danger" @click="cart.quantity = 1; cart.persist(); control?.focus()">Reset</PrimitiveButton></div></CheckoutShell></template>
