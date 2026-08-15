import { createServer as createHttpServer } from 'node:http';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { createServer as createViteServer } from 'vite';

const fixtureId = '/trusted-types-fixture.js';
const resolvedFixtureId = '\0gluon:trusted-types-fixture';
const root = resolve(import.meta.dirname, '..');
const fixtureSource = `
import {
  GluonElement,
  createApp,
  defineElement,
  html,
  hydrate,
  render,
  svg,
  trustedHTML,
  unsafeHTML,
} from '@gluonjs/core';
import { applyProgressivePatch } from '@gluonjs/ssr/streaming';

const results = { supportedViolations: 0 };
const violations = [];
document.addEventListener('securitypolicyviolation', (event) => violations.push({ directive: event.violatedDirective, sample: event.sample }));

try {
  const policy = trustedTypes.createPolicy('gluon-test', { createHTML: (value) => value });
  const trustedTypesConfig = { policyName: 'gluon-test', policy };
  class TrustedTypesElement extends GluonElement {
    render() { return html\`<output>custom element</output>\`; }
  }
  defineElement('gluon-trusted-types-fixture', TrustedTypesElement);
  const root = document.querySelector('#app');
  const rawView = (value) => html\`<section data-raw>\${value}</section>\`;
  const app = createApp(() => html\`
    <main>
      <h1>Trusted Types</h1>
      \${rawView(trustedHTML('<strong>owned</strong>'))}
      <div data-unsafe>\${unsafeHTML('<em>compatible</em>')}</div>
      \${svg\`<circle cx=\${4} cy=\${4} r=\${3}></circle>\`}
      <iframe srcdoc=\${trustedHTML('<p>attribute frame</p>')}></iframe>
      <iframe .srcdoc=\${trustedHTML('<p>property frame</p>')}></iframe>
      <gluon-trusted-types-fixture></gluon-trusted-types-fixture>
    </main>
  \`);
  app.config.trustedTypes = trustedTypesConfig;
  app.mount(root);
  results.rendered = root.querySelector('[data-raw] strong')?.textContent === 'owned';
  results.unsafeCompatibility = root.querySelector('[data-unsafe] em')?.textContent === 'compatible';
  results.svg = root.querySelector('circle')?.getAttribute('r') === '3';
  results.srcdoc = [...root.querySelectorAll('iframe')].map((frame) => frame.srcdoc).join('|')
    === '<p>attribute frame</p>|<p>property frame</p>';
  await new Promise((resolve) => setTimeout(resolve, 0));
  results.customElement = root.querySelector('gluon-trusted-types-fixture')?.shadowRoot?.textContent === 'custom element';

  const hydrationRoot = document.createElement('div');
  const hydrationMarkup = '<p><!--gluon:h:0-->hydrated<!--gluon:/h:0--></p>';
  hydrationRoot.innerHTML = policy.createHTML(hydrationMarkup);
  document.body.append(hydrationRoot);
  const hydration = hydrate(html\`<p>\${'hydrated'}</p>\`, hydrationRoot, {
    expectedMarkup: hydrationMarkup,
    trustedTypes: trustedTypesConfig,
  });
  results.hydration = hydration.retained && !hydration.recovered;

  const recoveryRoot = document.createElement('div');
  recoveryRoot.innerHTML = policy.createHTML('<p><!--gluon:h:0-->stale<!--gluon:/h:0--></p>');
  document.body.append(recoveryRoot);
  const recovery = hydrate(html\`<p>\${'fresh'}</p>\`, recoveryRoot, {
    expectedMarkup: hydrationMarkup,
    trustedTypes: trustedTypesConfig,
  });
  results.recovery = recovery.recovered && recoveryRoot.textContent === 'fresh';

  const progressiveRoot = document.createElement('div');
  progressiveRoot.append(document.createComment('gluon:async:7'), document.createComment('gluon:/async:7'));
  document.body.append(progressiveRoot);
  const progressive = applyProgressivePatch(progressiveRoot, {
    kind: 'boundary', id: 7, html: '<span>streamed</span>', styles: { version: 1, entries: [] },
  }, { trustedTypes: trustedTypesConfig });
  results.progressive = progressive.insertedNodes === 1 && progressiveRoot.textContent === 'streamed';

  await new Promise((resolve) => setTimeout(resolve, 0));
  results.supportedViolations = violations.length;

  const cachedView = (value) => html\`<aside data-cached>\${value}</aside>\`;
  const cacheHost = document.createElement('div');
  document.body.append(cacheHost);
  app.run(() => render(cachedView('safe'), cacheHost));
  try {
    render(cachedView(trustedHTML('<b>blocked</b>')), cacheHost);
  } catch (error) {
    results.missingPolicy = String(error).includes('GLUON_TRUSTED_TYPES_POLICY_REQUIRED');
  }

  const unconfiguredPatchRoot = document.createElement('div');
  unconfiguredPatchRoot.append(document.createComment('gluon:async:9'), document.createComment('gluon:/async:9'));
  try {
    applyProgressivePatch(unconfiguredPatchRoot, {
      kind: 'boundary', id: 9, html: '<span>blocked</span>', styles: { version: 1, entries: [] },
    });
  } catch (error) {
    results.progressiveMissingError = String(error);
    results.progressiveMissingPolicy = error?.code === 'GLUON_SSR_TRUSTED_TYPES_POLICY_REQUIRED';
  }

  const invalidRoot = document.createElement('div');
  invalidRoot.append(document.createElement('p'));
  try {
    hydrate(html\`<p>invalid</p>\`, invalidRoot, {
      expectedMarkup: '<p>invalid</p>',
      trustedTypes: { policyName: 'gluon-test', policy: { createHTML: (value) => value } },
    });
  } catch (error) {
    results.incompatiblePolicy = String(error).includes('GLUON_TRUSTED_TYPES_POLICY_INCOMPATIBLE');
  }

  try {
    hydrate(html\`<p>throwing</p>\`, invalidRoot, {
      expectedMarkup: '<p>throwing</p>',
      trustedTypes: { policyName: 'throws', policy: { createHTML: () => { throw new Error('no'); } } },
    });
  } catch (error) {
    results.throwingPolicy = String(error).includes('GLUON_TRUSTED_TYPES_POLICY_FAILED');
  }

  const malformedApp = createApp(html\`<p>malformed</p>\`);
  malformedApp.config.trustedTypes = { policyName: 'bad name', policy };
  try {
    malformedApp.mount(document.createElement('div'));
  } catch (error) {
    results.invalidName = String(error).includes('GLUON_TRUSTED_TYPES_POLICY_NAME_INVALID');
  }
} catch (error) {
  results.fatal = error instanceof Error ? error.stack ?? error.message : String(error);
}
window.__gluonTrustedTypesResults = results;
window.__gluonTrustedTypesDone = true;
`;

const vite = await createViteServer({
  appType: 'custom',
  configFile: false,
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true },
  resolve: { alias: {
    '@gluonjs/core': resolve(root, 'dist/index.js'),
    '@gluonjs/ssr/streaming': resolve(root, 'packages/ssr/dist/streaming.js'),
  } },
  plugins: [{
    name: 'gluon-trusted-types-fixture',
    resolveId(id) { return id === fixtureId ? resolvedFixtureId : null; },
    load(id) { return id === resolvedFixtureId ? fixtureSource : null; },
  }],
  server: { middlewareMode: true },
});

const server = createHttpServer((request, response) => {
  if (request.url === '/') {
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; frame-src 'self'; require-trusted-types-for 'script'; trusted-types gluon-test",
    });
    response.end('<!doctype html><html><body><div id="app"></div><script type="module" src="/trusted-types-fixture.js"></script></body></html>');
    return;
  }
  vite.middlewares(request, response, () => {
    response.writeHead(404);
    response.end('not found');
  });
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Trusted Types fixture server did not bind a TCP port.');

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gluonTrustedTypesDone === true);
  const results = await page.evaluate(() => window.__gluonTrustedTypesResults);
  const expected = ['rendered', 'unsafeCompatibility', 'svg', 'srcdoc', 'customElement', 'hydration', 'recovery', 'progressive', 'missingPolicy', 'progressiveMissingPolicy', 'incompatiblePolicy', 'throwingPolicy', 'invalidName'];
  const failed = expected.filter((name) => results?.[name] !== true);
  if (results?.fatal || failed.length > 0 || results?.supportedViolations !== 0 || pageErrors.length > 0) {
    throw new Error(`Trusted Types Chromium evidence failed: ${JSON.stringify({ results, failed, pageErrors }, null, 2)}`);
  }
  console.log(`Trusted Types Chromium evidence valid: ${expected.length} contracts, 0 supported-flow CSP violations`);
} finally {
  await browser.close();
  await vite.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
