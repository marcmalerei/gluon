import { createInjectionKey, html, type GluonPlugin } from '@gluonjs/core';
import { defineStore } from '@gluonjs/store';
import {
  createRouterFixture,
  createStoreFixture,
  flushUpdates,
  mountComponent,
  mountElement,
  renderFixture,
  settle,
  testPlugin,
  testProvider,
  type ComponentFixture,
  type ElementFixture,
  type TestFixture,
} from '../packages/test-utils/dist/index.js';
import type { SsrRequestResult } from '../packages/ssr/dist/index.js';
import {
  activeSsrFixtureNames,
  assertNoSsrFixtureLeaks,
  cleanupSsrFixtures,
  hydrateSsrFixture,
  renderSsrFixture,
  type HydratedSsrFixture,
  type HydrationFixtureContext,
  type SsrFixture,
} from '../packages/test-utils/dist/ssr.js';

const renderServer = async (): Promise<SsrRequestResult> => { throw new Error('type fixture'); };
const serverFixture: Promise<SsrFixture> = renderSsrFixture(renderServer, { name: 'shop' });
const hydrationContext: HydrationFixtureContext | undefined = undefined;
void hydrationContext;
const hydratedFixture: Promise<HydratedSsrFixture<{ retained: boolean }>> = serverFixture.then((server) =>
  hydrateSsrFixture(server, {
    hydrate: async ({ container }) => ({ retained: container.childNodes.length > 0 }),
    dispose: (hydrated) => { void hydrated.retained; },
  }));
void hydratedFixture;
void cleanupSsrFixtures();
activeSsrFixtureNames().map((name) => name.toUpperCase());
assertNoSsrFixtureLeaks();

const messageKey = createInjectionKey<string>('message');
const plugin: GluonPlugin<{ enabled: boolean }> = { install: () => undefined };
const component = ({ count, save }: Readonly<{ count: number; save(value: number): void }>) => html`
  <button @click=${() => save(count)}>${count}</button>
`;
const fixture: ComponentFixture<{ count: number; save(value: number): void }> = mountComponent(
  component,
  {
    props: { count: 1, save: (value) => { void value; } },
    providers: [testProvider(messageKey, 'ready')],
    plugins: [testPlugin(plugin, { enabled: true })],
  },
);
void fixture.setProps({ count: 2 });
const button: HTMLButtonElement = fixture.get('button');
void button;

const elementFixture: ElementFixture<HTMLElement & { value: number }> = mountElement<HTMLElement & { value: number }>(
  'gluon-counter',
  { properties: { value: 1 }, slots: { default: 'Counter' } },
);
elementFixture.element.value.toFixed();
const templateFixture: TestFixture = renderFixture(() => html`<p>Template</p>`);
templateFixture.own(() => undefined);

type Routes = { report: { params: { id: string | number } } };
const routerFixture = createRouterFixture<Routes>({
  initial: '/',
  routes: [{ path: '/' }, { path: '/reports/:id', name: 'report' }],
});
void routerFixture.router.push({ name: 'report', params: { id: 1 } });

const storeFixture = createStoreFixture({ initialState: { counter: { count: 4 } } });
const counter = defineStore({ id: 'counter', state: () => ({ count: 0 }) });
storeFixture.manager.use(counter).count.toFixed();
void flushUpdates(() => 42);
void settle({ cycles: 2, timers: true });

// @ts-expect-error component props retain their declared type
fixture.setProps({ count: 'two' });
// @ts-expect-error provider values retain the injection-key type
testProvider(messageKey, 42);
// @ts-expect-error optioned plugins retain their option type
testPlugin(plugin, { enabled: 'yes' });
// @ts-expect-error typed routes retain named params
routerFixture.router.push({ name: 'report', params: {} });
