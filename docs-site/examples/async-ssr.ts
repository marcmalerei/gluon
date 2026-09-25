import { html, Suspense } from '@gluonjs/core';
import { prepareForHydration, renderProgressively } from '@gluonjs/ssr';

interface Product { readonly id: string; readonly name: string; }

async function loadProduct(id: string, signal: AbortSignal): Promise<Product> {
  const response = await fetch(`/api/products/${id}`, { signal });
  if (!response.ok) throw new Error(`Product request failed: ${response.status}`);
  return response.json() as Promise<Product>;
}

export function productBoundary(id: string) {
  return html`
    ${Suspense({
      source: ({ signal }) => loadProduct(id, signal),
      fallback: html`<p aria-busy="true">Loading product…</p>`,
      children: (product) => html`<h1>${product.name}</h1>`,
      error: (error, retry) => html`<p>${String(error)} <button @click=${retry}>Retry</button></p>`,
    })}
  `;
}

export async function renderBlockingProduct(id: string): Promise<string> {
  const prepared = await prepareForHydration(productBoundary(id));
  return prepared.html;
}

export async function renderStreamingProduct(id: string) {
  return renderProgressively(productBoundary(id));
}
