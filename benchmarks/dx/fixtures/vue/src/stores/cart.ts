import { defineStore } from 'pinia'
import { ref } from 'vue'
const key = 'dx-vue-cart-v1'
export const useCartStore = defineStore('cart', () => {
  const quantity = ref(1)
  const email = ref('')
  function persist() { if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify({ quantity: quantity.value, email: email.value })) }
  function hydrate() {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem(key)
    if (raw) { const saved = JSON.parse(raw) as { quantity: number; email: string }; quantity.value = saved.quantity; email.value = saved.email }
  }
  return { quantity, email, persist, hydrate }
})
