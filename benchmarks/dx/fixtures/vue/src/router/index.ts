import { createMemoryHistory, createRouter, createWebHistory } from 'vue-router'
import ProductRoute from '../views/ProductRoute.vue'
import CheckoutRoute from '../views/CheckoutRoute.vue'

export function createDxRouter(ssr = false) {
  return createRouter({
    history: ssr ? createMemoryHistory() : createWebHistory(import.meta.env.BASE_URL),
    routes: [
      { path: '/', component: ProductRoute },
      { path: '/checkout', component: CheckoutRoute },
    ],
  })
}
