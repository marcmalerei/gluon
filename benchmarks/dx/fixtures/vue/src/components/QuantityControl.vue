<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import FieldComposition from './FieldComposition.vue'
type Product = { sku: string; name: string; unitPrice: number }
const props = withDefaults(defineProps<{ product: Product; initialValue?: number }>(), { initialValue: 1 })
const emit = defineEmits<{ quantityChange: [value: number] }>()
const quantity = ref(props.initialValue)
const input = ref<HTMLInputElement>()
const total = computed(() => quantity.value * props.product.unitPrice)
const timer = typeof window === 'undefined' ? undefined : window.setInterval(() => undefined, 60_000)
onUnmounted(() => { if (timer !== undefined) window.clearInterval(timer) })
function update(event: Event) {
  const next = (event.currentTarget as HTMLInputElement).valueAsNumber
  if (Number.isInteger(next) && next >= 1 && next <= 9) { quantity.value = next; emit('quantityChange', next) }
}
defineExpose({ focus: () => input.value?.focus() })
</script>
<template><FieldComposition label="Quantity"><input ref="input" name="quantity" type="number" min="1" max="9" :value="quantity" aria-describedby="quantity-total" @input="update" /><output id="quantity-total">Total €{{ total }}</output></FieldComposition></template>
