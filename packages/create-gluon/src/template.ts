import type { GluonFeatures } from './index.js';

const versions = Object.freeze({
  gluon: '1.0.9',
  nodeTypes: '^22.10.0',
  playwright: '^1.58.2',
  typescript: '^5.7.0',
  vite: '^8.1.4',
  vitest: '^4.0.18',
  vitestBrowser: '^4.0.18',
});

export function createStarterFiles(
  name: string,
  features: GluonFeatures,
): ReadonlyMap<string, string> {
  const files = new Map<string, string>();
  files.set('.gitignore', 'dist\ndist-server\nnode_modules\n*.local\n');
  files.set('package.json', packageJson(name, features));
  files.set('tsconfig.json', tsconfig());
  files.set('vite.config.ts', viteConfig(features));
  files.set('index.html', indexHtml(name));
  files.set('README.md', starterReadme(name, features));
  files.set('src/app.ts', appSource(features));
  files.set('src/quantity-control.ts', quantityControlSource());
  files.set('src/main.ts', mainSource(features));
  files.set('src/styles.ts', stylesSource(features));
  if (features.router) files.set('src/routes.ts', routesSource());
  if (features.store) files.set('src/counter-store.ts', storeSource());
  if (features.ssr) files.set('src/server.ts', serverSource(features));
  if (features.testing) {
    files.set('src/app.spec.ts', testSource(features));
    files.set('vitest.config.ts', vitestConfig());
  }
  return files;
}

function packageJson(name: string, features: GluonFeatures): string {
  const dependencies: Record<string, string> = { '@gluonjs/core': versions.gluon };
  const devDependencies: Record<string, string> = {
    '@gluonjs/language-server': versions.gluon,
    '@gluonjs/vite': versions.gluon,
    '@types/node': versions.nodeTypes,
    typescript: versions.typescript,
    vite: versions.vite,
  };
  if (features.router) dependencies['@gluonjs/router'] = versions.gluon;
  if (features.store) dependencies['@gluonjs/store'] = versions.gluon;
  if (features.ssr) dependencies['@gluonjs/ssr'] = versions.gluon;
  if (features.ui) {
    dependencies['@gluonjs/atoms'] = versions.gluon;
    dependencies['@gluonjs/reactivity'] = versions.gluon;
  }
  if (features.testing) {
    devDependencies['@gluonjs/test-utils'] = versions.gluon;
    devDependencies['@vitest/browser-playwright'] = versions.vitestBrowser;
    devDependencies.playwright = versions.playwright;
    devDependencies.vitest = versions.vitest;
  }
  const scripts: Record<string, string> = {
    dev: 'vite',
    build: features.ssr
      ? 'vite build && vite build --ssr src/server.ts --outDir dist-server'
      : 'vite build',
    typecheck: 'tsc --noEmit',
    'check:templates': 'gluon-template-check src',
    test: features.testing ? 'vitest run' : 'npm run typecheck',
  };
  return `${JSON.stringify({
    name,
    version: '0.0.0',
    private: true,
    type: 'module',
    scripts,
    dependencies,
    devDependencies,
    engines: { node: '^22.12.0 || ^24.0.0' },
  }, null, 2)}\n`;
}

function tsconfig(): string {
  return `${JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      useDefineForClassFields: true,
      module: 'ESNext',
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      skipLibCheck: true,
      moduleResolution: 'Bundler',
      allowImportingTsExtensions: false,
      isolatedModules: true,
      moduleDetection: 'force',
      noEmit: true,
      strict: true,
      noUncheckedIndexedAccess: true,
      verbatimModuleSyntax: true,
      types: ['node'],
    },
    include: ['src', 'vite.config.ts', 'vitest.config.ts'],
  }, null, 2)}\n`;
}

function viteConfig(features: GluonFeatures): string {
  return `import { defineConfig } from 'vite';
import gluon from '@gluonjs/vite';

export default defineConfig({
  plugins: [gluon(${features.ssr ? '{ universal: true }' : ''})],
});
`;
}

function indexHtml(name: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${escapeHtml(name)} — a Gluon application">
    <title>${escapeHtml(name)}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`;
}

function appSource(features: GluonFeatures): string {
  const imports = [
    "import { compose, createApp, html, type GluonApp } from '@gluonjs/core';",
    features.ui ? "import { Button } from '@gluonjs/atoms';" : '',
    features.ui ? "import { ref } from '@gluonjs/reactivity';" : '',
    features.router
      ? "import { RouterLink, RouterView, createRouterPlugin, type Router } from '@gluonjs/router';"
      : '',
    features.store
      ? "import { createStoreManager, type StoreManager } from '@gluonjs/store';\nimport { useCounterStore, type CounterStore } from './counter-store.js';"
      : '',
  ].filter(Boolean).join('\n');
  const optionFields = [
    features.router ? '  readonly router: Router;' : '',
    features.store ? '  readonly storeManager?: StoreManager;' : '',
  ].filter(Boolean).join('\n');
  const resultFields = [
    '  readonly app: GluonApp;',
    features.store ? '  readonly storeManager: StoreManager;\n  readonly counter: CounterStore;' : '',
  ].filter(Boolean).join('\n');
  const storeSetup = features.store
    ? `  const ownsStoreManager = options.storeManager === undefined;
  const storeManager = options.storeManager ?? createStoreManager();
  const counter = useCounterStore.use(storeManager);
`
    : '';
  const uiSetup = features.ui ? '  const actionCount = ref(0);\n' : '';
  const navigation = features.router
    ? `      <nav aria-label="Primary">
        \${compose(RouterLink, { to: '/' })\`Home\`}
        \${compose(RouterLink, { to: '/about' })\`About\`}
      </nav>`
    : '';
  const content = features.router
    ? '${RouterView()}'
    : '<h1>Built with Gluon</h1><p>Edit <code>src/app.ts</code> to get started.</p>';
  const counter = features.ui
    ? `\${StarterAction({
          count: ${features.store ? 'counter.count' : 'actionCount.value'},
          onIncrement: () => {
            actionCount.value += 1;${features.store ? '\n            counter.increment();' : ''}
          },
        })}`
    : features.store
      ? `<button type="button" @click=\${() => counter.increment()}>Count: \${counter.count}</button>`
      : '';
  const plugin = features.router ? '  app.use(createRouterPlugin(options.router));\n' : '';
  const cleanup = features.store ? '  if (ownsStoreManager) app.onUnmounted(() => storeManager.dispose());\n' : '';
  const result = features.store ? '  return { app, storeManager, counter };' : '  return { app };';
  const uiComponent = features.ui ? `
export interface StarterActionProps {
  readonly count: number;
  readonly onIncrement: () => void;
}

/** App-owned Atom consumer. Vite hot-updates this function without recreating application state. */
export function StarterAction({ count, onIncrement }: StarterActionProps) {
  return Button({
    label: \`Actions: \${count}\`,
    variant: count % 2 === 0 ? 'primary' : 'secondary',
    size: 'large',
    onClick: onIncrement,
    attributes: {
      class: 'starter-action',
      'aria-label': 'Increment starter action count',
      data: { starterAction: true },
    },
  });
}
` : '';

  return `${imports}
${uiComponent}

export interface StarterApplicationOptions {
${optionFields}
}

export interface StarterApplication {
${resultFields}
}

export function createStarterApplication(options: StarterApplicationOptions${features.router ? '' : ' = {}'}): StarterApplication {
${storeSetup}${uiSetup}  const app = createApp(() => html\`
    <header>
      <a class="brand" href="/">Gluon Starter</a>
${navigation}
    </header>
    <main>
      <section class="starter-panel">
      ${content}
      ${counter}
      </section>
    </main>
  \`);
${plugin}${cleanup}${result}
}
`;
}

function mainSource(features: GluonFeatures): string {
  const imports = [
    features.ui
      ? "import { createStyleSheetOwner } from '@gluonjs/core';\nimport { installUi } from '@gluonjs/atoms';"
      : "import { adoptStyles } from '@gluonjs/core';",
    features.router
      ? "import { createRouter, createWebHistory } from '@gluonjs/router';\nimport { routes } from './routes.js';"
      : '',
    features.store && features.ssr ? "import { createStoreManager } from '@gluonjs/store';" : '',
    features.ssr && !features.ui
      ? "import { createStyleManifest } from '@gluonjs/ssr';\nimport { hydrateApplication, hydrateRequestState, readHydrationState } from '@gluonjs/ssr/hydration';"
      : features.ssr
        ? "import { hydrateApplication, hydrateRequestState, readHydrationState } from '@gluonjs/ssr/hydration';"
      : '',
    "import { createStarterApplication } from './app.js';",
    features.ui && features.ssr
      ? "import { starterHydrationStyleSelection, starterStyles } from './styles.js';"
      : "import { starterStyles } from './styles.js';",
  ].filter(Boolean).join('\n');
  const routerSetup = features.router
    ? `const router = createRouter({ history: createWebHistory(), routes });
await router.isReady();
`
    : '';
  const options = features.router ? '{ router }' : '';
  const mountClient = features.ui
    ? `const uiOwner = installUi(document, { theme: 'light' });
const appStyleOwner = createStyleSheetOwner(document);
appStyleOwner.retain(starterStyles);
try {
  const { app } = createStarterApplication(${options});
  app.onUnmounted(() => {
    appStyleOwner.dispose();
    uiOwner.dispose();
  });
  app.mount(container);
} catch (error) {
  appStyleOwner.dispose();
  uiOwner.dispose();
  throw error;
}`
    : `adoptStyles(document, starterStyles);
createStarterApplication(${options}).app.mount(container);`;
  if (features.ssr) {
    const hydrateClient = features.ui
      ? `const uiOwner = installUi(document, { theme: 'light', hydrate: true });
  const state = readHydrationState();
  const storeManager = createStoreManager();
  try {
    await hydrateRequestState(state, router, storeManager);
    const { app } = createStarterApplication({ router, storeManager });
    app.onUnmounted(() => {
      uiOwner.dispose();
      storeManager.dispose();
    });
    await hydrateApplication(app, container, {
      state: { server: state.store, client: storeManager.dehydrate() },
      styleSelection: starterHydrationStyleSelection,
      styleRoot: document,
    });
  } catch (error) {
    storeManager.dispose();
    uiOwner.dispose();
    throw error;
  }`
      : `const state = readHydrationState();
  const storeManager = createStoreManager();
  await hydrateRequestState(state, router, storeManager);
  const { app } = createStarterApplication({ router, storeManager });
  await hydrateApplication(app, container, {
    state: { server: state.store, client: storeManager.dehydrate() },
    styles: createStyleManifest([starterStyles]),
    styleRoot: document,
  });`;
    return `${imports}

const container = document.querySelector<HTMLElement>('#app');
if (!container) throw new Error('The Gluon starter requires an #app mount element.');

${routerSetup}if (document.querySelector('script[data-gluon-state]')) {
  ${hydrateClient}
} else {
  ${mountClient}
}
`;
  }
  return `${imports}

const container = document.querySelector<HTMLElement>('#app');
if (!container) throw new Error('The Gluon starter requires an #app mount element.');

${routerSetup}${mountClient}
`;
}

function routesSource(): string {
  return `import { html } from '@gluonjs/core';
import type { RouteRecordRaw } from '@gluonjs/router';

export const routes: readonly RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => html\`<h1>Built with Gluon</h1><p>Start in <code>src/app.ts</code>.</p>\`,
  },
  {
    path: '/about',
    name: 'about',
    component: () => html\`<h1>About</h1><p>This route uses the public Gluon Router API.</p>\`,
  },
];
`;
}

function storeSource(): string {
  return `import { defineStore, type Store } from '@gluonjs/store';

export const useCounterStore = defineStore({
  id: 'counter',
  state: () => ({ count: 0 }),
  actions: (state) => ({
    increment() {
      state.count += 1;
    },
  }),
});

export type CounterStore = ReturnType<typeof useCounterStore.use>;
`;
}

function quantityControlSource(): string {
  return `import { defineGluonElement, elementEvent, html } from '@gluonjs/core';

export const StarterQuantityControl = defineGluonElement({
  tagName: 'starter-quantity-control',
  formAssociated: true,
  properties: {
    value: { type: Number, reflect: true, default: 1 },
    required: { type: Boolean, reflect: true, default: false },
  },
  events: {
    'quantity-change': elementEvent<{ quantity: number }>({ cancelable: true }),
  },
  slots: { default: { required: true }, help: { fallback: true } },
  setup(context) {
    const quantity = context.state('quantity', context.props.value);
    const change = (next: number) => {
      const previous = quantity.value;
      quantity.value = Math.max(0, next);
      if (!context.emit('quantity-change', { quantity: quantity.value })) quantity.value = previous;
    };
    context.onUpdated(() => {
      context.form.setValue(String(quantity.value), String(quantity.value));
      const invalid = context.props.required && quantity.value < 1;
      context.form.setValidity(invalid ? { rangeUnderflow: true } : {}, invalid ? 'Choose at least one item.' : '');
    });
    return { render: () => html\`
      <label><slot></slot></label>
      <button type="button" aria-label="Decrease quantity" @click=\${() => change(quantity.value - 1)}>−</button>
      <output aria-live="polite">\${quantity.value}</output>
      <button type="button" aria-label="Increase quantity" @click=\${() => change(quantity.value + 1)}>+</button>
      <slot name="help">Choose a quantity.</slot>
    \` };
  },
});
`;
}

function serverSource(features: GluonFeatures): string {
  const styleImport = features.ui
    ? "import { createStarterStyleSelection } from './styles.js';"
    : "import { starterStyles } from './styles.js';";
  const styles = features.ui ? "createStarterStyleSelection('light')" : '[starterStyles]';
  return `import { renderRequest, type SsrRequestResult } from '@gluonjs/ssr';
import { createStarterApplication } from './app.js';
import { routes } from './routes.js';
${styleImport}

export function render(url: string): Promise<SsrRequestResult> {
  return renderRequest({
    url,
    routes,
    styles: ${styles},
    createApp: ({ router, store }) => createStarterApplication({
      router,
      storeManager: store,
    }).app,
  });
}
`;
}

function stylesSource(features: GluonFeatures): string {
  const imports = features.ui
    ? `import { createStyleSheetSelection, css } from '@gluonjs/core';
import { createUiStyleSelection, type UiThemeName } from '@gluonjs/atoms';`
    : "import { css } from '@gluonjs/core';";
  const selections = features.ui ? `

/** Shared UI carriers followed by the app-owned starter token and layout sheet. */
export function createStarterStyleSelection(theme: UiThemeName = 'light') {
  const ui = createUiStyleSelection(theme);
  return createStyleSheetSelection([
    ...ui.entries,
    { id: 'gluon-starter', scope: 'gluon-starter', sheet: starterStyles },
  ]);
}

/** App-owned carrier left after installUi() consumes the shared UI carriers. */
export const starterHydrationStyleSelection = createStyleSheetSelection([
  { id: 'gluon-starter', scope: 'gluon-starter', sheet: starterStyles },
]);` : '';
  return `${imports}

export const starterStyles = css\`
  @layer starter {
    *, *::before, *::after { box-sizing: border-box; }
    :root {
      font-family: Inter, system-ui, sans-serif;
      color: #111111;
      background: #f6f7f2;
      --starter-accent: #c8ff00;
      --starter-ink: #111111;
      --starter-rule: #c8cbc1;
      --starter-surface: #ffffff;
    }
    body { margin: 0; min-width: 320px; }
    header { display: flex; min-height: 64px; align-items: center; justify-content: space-between; gap: 24px; padding: 0 24px; border-bottom: 1px solid var(--starter-rule); background: var(--starter-surface); }
    nav { display: flex; gap: 24px; }
    a { color: inherit; }
    .brand { font-weight: 750; letter-spacing: -0.02em; text-decoration: none; }
    main { width: min(760px, 100%); margin: 0 auto; padding: clamp(40px, 9vw, 96px) 24px; }
    .starter-panel { display: grid; gap: 24px; padding: clamp(28px, 6vw, 56px); border: 1px solid var(--starter-rule); background: var(--starter-surface); }
    .starter-panel h1 { margin: 0; font-size: clamp(2.5rem, 9vw, 5.5rem); line-height: 0.95; letter-spacing: -0.055em; }
    .starter-panel p { max-width: 52ch; margin: 0; color: #51534d; }
    .starter-action {
      justify-self: start;
      --gluon-button-background: var(--starter-accent);
      --gluon-button-border-color: var(--starter-ink);
      --gluon-button-color: var(--starter-ink);
    }
    :focus-visible { outline: 3px solid #173f91; outline-offset: 3px; }
    @media (max-width: 480px) {
      header { align-items: flex-start; flex-direction: column; padding-block: 16px; }
      main { padding-inline: 16px; }
      .starter-panel { padding: 24px; }
    }
  }
\`;
${selections}
`;
}

function vitestConfig(): string {
  return `import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
    include: ['src/**/*.spec.ts'],
  },
});
`;
}

function testSource(features: GluonFeatures): string {
  if (features.ui) {
    const routerImports = features.router
      ? "import { createMemoryHistory, createRouter } from '@gluonjs/router';\nimport { routes } from './routes.js';"
      : '';
    const storeImports = features.ssr ? "import { createStoreManager } from '@gluonjs/store';" : '';
    const ssrImports = features.ssr
      ? "import { hydrateApplication, hydrateRequestState, readHydrationState } from '@gluonjs/ssr/hydration';\nimport { render } from './server.js';"
      : '';
    const styleImports = features.ssr
      ? 'import { starterHydrationStyleSelection, starterStyles } from \'./styles.js\';'
      : 'import { starterStyles } from \'./styles.js\';';
    const routerSetup = features.router
      ? `const router = createRouter({ history: createMemoryHistory(['/']), routes });
  await router.isReady();`
      : '';
    const options = features.router ? '{ router }' : '';
    const ssrTest = features.ssr ? `

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
});` : '';
    return `import { afterEach, expect, test } from 'vitest';
import { createStyleSheetOwner } from '@gluonjs/core';
import { buttonStyles, installUi } from '@gluonjs/atoms';
import { nextTick } from '@gluonjs/reactivity';
${routerImports}
${storeImports}
${ssrImports}
import { createStarterApplication } from './app.js';
${styleImports}

afterEach(() => {
  document.body.replaceChildren();
  document.querySelectorAll('style[data-gluon-style]').forEach((carrier) => carrier.remove());
});

test('renders a themed, accessible, reactive Atom consumer', async () => {
  document.adoptedStyleSheets = [];
  const uiOwner = installUi(document, { theme: 'light' });
  const appStyleOwner = createStyleSheetOwner(document);
  appStyleOwner.retain(starterStyles);
  ${routerSetup}
  const { app } = createStarterApplication(${options});
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
});${ssrTest}
`;
  }
  const uiImport = features.ui ? "import { Button } from '@gluonjs/atoms';\n" : '';
  const render = features.ui
    ? "Button({ label: 'Ready' })"
    : "html`<button type=\"button\">Ready</button>`";
  return `import { afterEach, expect, test } from 'vitest';
import { html } from '@gluonjs/core';
${uiImport}import { cleanupFixtures, renderFixture } from '@gluonjs/test-utils';

afterEach(() => cleanupFixtures());

test('renders an operable starter control', () => {
  const fixture = renderFixture(() => ${render});
  expect(fixture.get<HTMLButtonElement>('button').textContent).toBe('Ready');
});
`;
}

function starterReadme(name: string, features: GluonFeatures): string {
  const enabled = Object.entries(features).filter(([, value]) => value).map(([key]) => key);
  const uiGuidance = features.ui ? `

## UI ownership and extension points

- \`src/main.ts\` calls \`installUi(document, { theme: 'light' })\` once, owns the
  returned shared UI/theme handle, and disposes it with the application.
- \`src/styles.ts\` owns \`--starter-*\` application tokens and maps the
  \`.starter-action\` class to documented Button custom properties. Add or edit
  application tokens there; do not target every native \`button\`.
- \`src/app.ts\` contains the typed \`StarterAction\` Atom consumer. Add local
  components beside it or generate them with the documented create-gluon
  component command, then import them through the local application barrel.
- To add an application theme, extend the typed theme choice passed to
  \`installUi()\` and add app-token values under the matching
  \`[data-gluon-theme]\` selector in \`src/styles.ts\`.
- Rendered Atoms retain their exact component sheets automatically. The starter
  never imports the deprecated aggregate Atom sheet.
` : '';
  return `# ${name}

Generated by \`create-gluon\` with ${enabled.length ? enabled.join(', ') : 'the minimal'} feature selection.

## Commands

- \`npm run dev\` starts Vite.
- \`npm run typecheck\` checks the TypeScript public API usage.
- \`npm run check:templates\` runs Gluon template diagnostics used by the editor service.
- \`npm test\` ${features.testing ? 'runs the browser fixture test in Chromium' : 'runs the TypeScript check because browser testing was not selected'}.
- \`npm run build\` builds the ${features.ssr ? 'client and SSR server entries' : 'client entry'}.

Application source imports only documented package entry points. Styles are installed through constructable stylesheets and \`adoptedStyleSheets\`.${features.ui ? ' Rendered UI components retain their exact stylesheet dependencies automatically; do not adopt the deprecated aggregate Atom sheet.' : ''}
${uiGuidance}

## Add app-local components

Run \`create-gluon add-component\` from this directory for an ownership-guided
interactive choice, or use stable flags such as:

\`\`\`sh
create-gluon add-component PurchaseAction --kind atom --yes
create-gluon add-component CheckoutRegion --kind organism --dry-run --yes
create-gluon add-component AccountControl --kind element --tag app-account-control --yes
\`\`\`

The command creates production source, a strict browser test, constructable
style ownership where visual, and a deterministic \`src/components/index.ts\`
export. It updates only managed package fields and its marked barrel region.
Generated source/test collisions require \`--overwrite\` plus a separate
\`--confirm-overwrite\`.

\`src/quantity-control.ts\` is a typed \`defineGluonElement\` example with local state, a cancelable event, slots, and form participation. Import it once, then use \`<starter-quantity-control name="quantity">Quantity</starter-quantity-control>\` from Gluon, plain HTML, Vue, or React.
`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
