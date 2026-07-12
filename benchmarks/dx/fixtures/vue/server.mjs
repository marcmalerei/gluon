import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { createServer as createViteServer } from 'vite'
const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom' })
createServer((request, response) => vite.middlewares(request, response, async () => {
  try {
    const url = request.url ?? '/'
    let template = await readFile(new URL('./index.html', import.meta.url), 'utf8')
    template = await vite.transformIndexHtml(url, template)
    const { render } = await vite.ssrLoadModule('/src/entry-server.ts')
    const html = await render(url)
    template = template.replace('<div id="app"></div>', `<div id="app">${html}</div><script>window.__DX_SERVER_PRODUCT__=document.querySelector('[data-product-title]')</script>`)
    response.writeHead(200, { 'Content-Type': 'text/html' }); response.end(template)
  } catch (error) { vite.ssrFixStacktrace(error); response.statusCode = 500; response.end(String(error)) }
})).listen(4174, '127.0.0.1')
