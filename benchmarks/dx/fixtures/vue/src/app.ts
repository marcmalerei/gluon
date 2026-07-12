import { createApp, createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { createDxRouter } from './router'
export function createDxApp(ssr: boolean, hydrate = false) {
  const app = ssr || hydrate ? createSSRApp(App) : createApp(App)
  const pinia = createPinia()
  const router = createDxRouter(ssr)
  app.use(pinia)
  app.use(router)
  return { app, pinia, router }
}
