import { renderToString } from '@vue/server-renderer'
import { createDxApp } from './app'
export async function render(url: string): Promise<string> {
  const { app, router } = createDxApp(true)
  await router.push(url)
  await router.isReady()
  return renderToString(app)
}
