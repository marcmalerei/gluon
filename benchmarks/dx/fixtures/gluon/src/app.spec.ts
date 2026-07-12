import { afterEach, expect, test } from 'vitest';
import { createStyleSheetOwner } from '@gluonjs/core';
import { buttonStyles, installUi } from '@gluonjs/atoms';
import { nextTick } from '@gluonjs/reactivity';
import { createMemoryHistory, createRouter } from '@gluonjs/router';
import { routes } from './routes.js';
import { createStoreManager } from '@gluonjs/store';
import { hydrateApplication, hydrateRequestState, readHydrationState } from '@gluonjs/ssr/hydration';
import { render } from './server.js';
import { createStarterApplication } from './app.js';
import { starterHydrationStyleSelection, starterStyles } from './styles.js';

afterEach(() => {
  document.body.replaceChildren();
  document.querySelectorAll('style[data-gluon-style]').forEach((carrier) => carrier.remove());
});

test('renders a themed, accessible, reactive Atom consumer', async () => {
  document.adoptedStyleSheets = [];
  const uiOwner = installUi(document, { theme: 'light' });
  const appStyleOwner = createStyleSheetOwner(document);
  appStyleOwner.retain(starterStyles);
  const router = createRouter({ history: createMemoryHistory(['/']), routes });
  await router.isReady();
  const { app } = createStarterApplication({ router });
  app.onUnmounted(() => {
    appStyleOwner.dispose();
    uiOwner.dispose();
  });
  const root = document.createElement('div');
  document.body.append(root);
  const mounted = app.mount(root);
  const button = root.querySelector<HTMLButtonElement>('[data-starter-action]')!;

  expect(button.textContent).toBe('Actions: 0');
  expect(button.getAttribute('aria-label')).toBe('Increment starter action count');
  expect(button.classList.contains('is-primary')).toBe(true);
  expect(getComputedStyle(button).minBlockSize).toBe('44px');
  expect(getComputedStyle(button).backgroundColor).toBe('rgb(200, 255, 0)');
  expect(getComputedStyle(document.documentElement).getPropertyValue('--gluon-color-canvas').trim()).toBe('#ffffff');
  expect(document.adoptedStyleSheets).toContain(buttonStyles);
  expect(document.adoptedStyleSheets).toContain(starterStyles);

  button.click();
  await nextTick();
  expect(button.textContent).toBe('Actions: 1');
  expect(button.classList.contains('is-secondary')).toBe(true);
  mounted.unmount();
  expect(document.adoptedStyleSheets).not.toContain(buttonStyles);
  expect(document.adoptedStyleSheets).not.toContain(starterStyles);
});

test('hydrates the generated UI selection without duplication or recovery', async () => {
  document.adoptedStyleSheets = [];
  const response = await render('/');
  expect(response.styles.entries.map(({ id }) => id)).toEqual([
    'gluon-ui-layer-order',
    'gluon-ui-foundation',
    'gluon-ui-tokens',
    'gluon-ui-theme',
    'gluon-atom-button',
    'gluon-starter',
  ]);
  const carriers = document.createElement('template');
  carriers.innerHTML = response.head;
  document.head.append(...carriers.content.querySelectorAll('style[data-gluon-style]'));
  const root = document.createElement('div');
  root.innerHTML = response.html;
  document.body.append(root);
  document.body.insertAdjacentHTML('beforeend', response.stateScript);

  const state = readHydrationState(document);
  const router = createRouter({ history: createMemoryHistory(['/']), routes });
  const storeManager = createStoreManager();
  await hydrateRequestState(state, router, storeManager);
  const uiOwner = installUi(document, { theme: 'light', hydrate: true });
  const { app } = createStarterApplication({ router, storeManager });
  app.onUnmounted(() => {
    uiOwner.dispose();
    storeManager.dispose();
  });
  const serverRoot = root.firstElementChild;
  const hydrated = await hydrateApplication(app, root, {
    state: { server: state.store, client: storeManager.dehydrate() },
    styleSelection: starterHydrationStyleSelection,
    styleRoot: document,
  });

  expect(hydrated.hydration).toEqual(expect.objectContaining({ retained: true, recovered: false, mismatches: [] }));
  expect(root.firstElementChild).toBe(serverRoot);
  expect(document.querySelector('style[data-gluon-style]')).toBeNull();
  expect(document.adoptedStyleSheets.filter((sheet) => sheet === buttonStyles)).toHaveLength(1);
  expect(document.adoptedStyleSheets.filter((sheet) => sheet === starterStyles)).toHaveLength(1);
  root.querySelector<HTMLButtonElement>('[data-starter-action]')!.click();
  await nextTick();
  expect(root.querySelector('[data-starter-action]')?.textContent).toBe('Actions: 1');
  hydrated.mount.unmount();
  expect(document.adoptedStyleSheets).not.toContain(buttonStyles);
  expect(document.adoptedStyleSheets).not.toContain(starterStyles);
  root.remove();
  document.querySelector('script[data-gluon-state]')?.remove();
});
