import type { GluonFeatures } from './index.js';

const versions = Object.freeze({
  gluon: '0.0.0',
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
  files.set('src/main.ts', mainSource(features));
  files.set('src/styles.ts', stylesSource());
  if (features.router) files.set('src/routes.ts', routesSource());
  if (features.store) files.set('src/counter-store.ts', storeSource());
  if (features.ssr) files.set('src/server.ts', serverSource());
  if (features.testing) {
    files.set('src/app.spec.ts', testSource(features));
    files.set('vitest.config.ts', vitestConfig());
  }
  return files;
}

function packageJson(name: string, features: GluonFeatures): string {
  const dependencies: Record<string, string> = { '@gluonjs/core': versions.gluon };
  const devDependencies: Record<string, string> = {
    '@gluonjs/vite': versions.gluon,
    '@types/node': versions.nodeTypes,
    typescript: versions.typescript,
    vite: versions.vite,
  };
  if (features.router) dependencies['@gluonjs/router'] = versions.gluon;
  if (features.store) dependencies['@gluonjs/store'] = versions.gluon;
  if (features.ssr) dependencies['@gluonjs/ssr'] = versions.gluon;
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
    "import { createApp, html, type GluonApp } from '@gluonjs/core';",
    features.ui ? "import { Button } from '@gluonjs/core/atoms';" : '',
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
  const navigation = features.router
    ? `      <nav aria-label="Primary">
        \${RouterLink({ to: '/', children: 'Home' })}
        \${RouterLink({ to: '/about', children: 'About' })}
      </nav>`
    : '';
  const content = features.router
    ? '${RouterView()}'
    : '<h1>Built with Gluon</h1><p>Edit <code>src/app.ts</code> to get started.</p>';
  const counter = features.store
    ? features.ui
      ? `\${Button({
          label: \`Count: \${counter.count}\`,
          onClick: () => counter.increment(),
          attributes: { 'aria-label': 'Increment counter' },
        })}`
      : `<button type="button" @click=\${() => counter.increment()}>Count: \${counter.count}</button>`
    : features.ui
      ? "${Button({ label: 'Gluon UI is ready' })}"
      : '';
  const plugin = features.router ? '  app.use(createRouterPlugin(options.router));\n' : '';
  const cleanup = features.store ? '  if (ownsStoreManager) app.onUnmounted(() => storeManager.dispose());\n' : '';
  const result = features.store ? '  return { app, storeManager, counter };' : '  return { app };';

  return `${imports}

export interface StarterApplicationOptions {
${optionFields}
}

export interface StarterApplication {
${resultFields}
}

export function createStarterApplication(options: StarterApplicationOptions${features.router ? '' : ' = {}'}): StarterApplication {
${storeSetup}  const app = createApp(() => html\`
    <header>
      <a class="brand" href="/">Gluon Starter</a>
${navigation}
    </header>
    <main>
      ${content}
      ${counter}
    </main>
  \`);
${plugin}${cleanup}${result}
}
`;
}

function mainSource(features: GluonFeatures): string {
  const imports = [
    "import { adoptStyles } from '@gluonjs/core';",
    features.router
      ? "import { createRouter, createWebHistory } from '@gluonjs/router';\nimport { routes } from './routes.js';"
      : '',
    features.store && features.ssr ? "import { createStoreManager } from '@gluonjs/store';" : '',
    features.ssr
      ? "import { createStyleManifest } from '@gluonjs/ssr';\nimport { hydrateApplication, hydrateRequestState, readHydrationState } from '@gluonjs/ssr/hydration';"
      : '',
    "import { createStarterApplication } from './app.js';",
    "import { starterStyles } from './styles.js';",
  ].filter(Boolean).join('\n');
  const routerSetup = features.router
    ? `const router = createRouter({ history: createWebHistory(), routes });
await router.isReady();
`
    : '';
  if (features.ssr) {
    return `${imports}

const container = document.querySelector<HTMLElement>('#app');
if (!container) throw new Error('The Gluon starter requires an #app mount element.');

${routerSetup}if (document.querySelector('script[data-gluon-state]')) {
  const state = readHydrationState();
  const storeManager = createStoreManager();
  await hydrateRequestState(state, router, storeManager);
  const { app } = createStarterApplication({ router, storeManager });
  await hydrateApplication(app, container, {
    state: { server: state.store, client: storeManager.dehydrate() },
    styles: createStyleManifest([starterStyles]),
    styleRoot: document,
  });
} else {
  adoptStyles(document, starterStyles);
  createStarterApplication({ router }).app.mount(container);
}
`;
  }
  const options = features.router ? '{ router }' : '';
  return `${imports}

const container = document.querySelector<HTMLElement>('#app');
if (!container) throw new Error('The Gluon starter requires an #app mount element.');

adoptStyles(document, starterStyles);
${routerSetup}createStarterApplication(${options}).app.mount(container);
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

function serverSource(): string {
  return `import { renderRequest, type SsrRequestResult } from '@gluonjs/ssr';
import { createStarterApplication } from './app.js';
import { routes } from './routes.js';
import { starterStyles } from './styles.js';

export function render(url: string): Promise<SsrRequestResult> {
  return renderRequest({
    url,
    routes,
    styles: [starterStyles],
    createApp: ({ router, store }) => createStarterApplication({
      router,
      storeManager: store,
    }).app,
  });
}
`;
}

function stylesSource(): string {
  return `import { css } from '@gluonjs/core';

export const starterStyles = css\`
  *, *::before, *::after { box-sizing: border-box; }
  :root { font-family: Inter, system-ui, sans-serif; color: #111; background: #fff; }
  body { margin: 0; min-width: 320px; }
  header { display: flex; min-height: 64px; align-items: center; justify-content: space-between; padding: 0 24px; border-bottom: 1px solid #d7d7d2; }
  nav { display: flex; gap: 24px; }
  a { color: inherit; }
  .brand { font-weight: 700; text-decoration: none; }
  main { width: min(720px, 100%); margin: 0 auto; padding: 64px 24px; }
  button { min-height: 44px; padding: 10px 18px; border: 1px solid #111; background: #c8ff00; color: #111; font: inherit; cursor: pointer; }
  :focus-visible { outline: 3px solid #173f91; outline-offset: 3px; }
\`;
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
  const uiImport = features.ui ? "import { Button } from '@gluonjs/core/atoms';\n" : '';
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
  return `# ${name}

Generated by \`create-gluon\` with ${enabled.length ? enabled.join(', ') : 'the minimal'} feature selection.

## Commands

- \`npm run dev\` starts Vite.
- \`npm run typecheck\` checks the TypeScript public API usage.
- \`npm test\` ${features.testing ? 'runs the browser fixture test in Chromium' : 'runs the TypeScript check because browser testing was not selected'}.
- \`npm run build\` builds the ${features.ssr ? 'client and SSR server entries' : 'client entry'}.

Application source imports only documented package entry points. Styles are installed through constructable stylesheets and \`adoptedStyleSheets\`.
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
