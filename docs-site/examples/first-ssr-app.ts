import { createApp, html } from '@gluonjs/core';
import { renderRequest } from '@gluonjs/ssr';
import { hydrateApplication } from '@gluonjs/ssr/hydration';

interface User { readonly name: string; }

async function loadUser(url: string, signal: AbortSignal): Promise<User> {
  const response = await fetch(`/api/user?from=${encodeURIComponent(url)}`, { signal });
  return response.json() as Promise<User>;
}

function readStateCarrier(): { readonly server: unknown; readonly client: unknown } {
  const carrier = document.querySelector('[data-gluon-state]');
  return carrier?.textContent
    ? JSON.parse(carrier.textContent) as { readonly server: unknown; readonly client: unknown }
    : { server: undefined, client: undefined };
}

// server-only — one request at a time
export async function handleRequest(url: string) {
  return renderRequest<{ readonly user: User }>({
    url,
    load: async ({ signal }) => ({ user: await loadUser(url, signal) }),
    createApp: ({ data }) => createApp(() => html`
      <main id="app"><h1>Hello ${data.user.name}</h1></main>
    `),
  });
}

// browser-only — after the server HTML is in #app
const app = createApp(() => html`<main id="app"><h1>Hello</h1></main>`);
await hydrateApplication(app, document.querySelector('#app')!, {
  state: readStateCarrier(),
  recovery: 'throw',
});

// Shared application code may define templates/components, but must not read
// window, document, localStorage, or a process-global live store during SSR.
