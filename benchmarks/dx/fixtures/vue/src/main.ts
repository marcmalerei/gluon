import { createDxApp } from './app'
import { useCartStore } from './stores/cart'
const { app, router, pinia } = createDxApp(false, true)
await router.push(window.location.pathname)
await router.isReady()
app.mount('#app', true)
useCartStore(pinia).hydrate()
