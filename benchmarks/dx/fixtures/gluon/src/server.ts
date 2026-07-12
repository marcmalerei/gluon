import { renderRequest, type SsrRequestResult } from '@gluonjs/ssr';
import { createStarterApplication } from './app.js';
import { routes } from './routes.js';
import { createStarterStyleSelection } from './styles.js';

export function render(url: string): Promise<SsrRequestResult> {
  return renderRequest({
    url,
    routes,
    styles: createStarterStyleSelection('light'),
    createApp: ({ router, store }) => createStarterApplication({
      router,
      storeManager: store,
    }).app,
  });
}
