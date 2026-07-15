import type { SsrRequestResult } from '@gluonjs/ssr';

export interface SsrFixture {
  readonly name: string;
  readonly response: SsrRequestResult;
  readonly html: string;
  readonly head: string;
  readonly state: string;
  readonly stateScript: string;
  readonly styles: SsrRequestResult['styles'];
  readonly router: SsrRequestResult['router'];
  readonly store: SsrRequestResult['store'];
  contains(value: string): boolean;
}

export interface RenderSsrFixtureOptions {
  readonly name?: string;
}

/** Runs one public SSR request and retains its complete transport result for assertions or hydration. */
export async function renderSsrFixture(
  render: () => Promise<SsrRequestResult>,
  options: RenderSsrFixtureOptions = {},
): Promise<SsrFixture> {
  const name = options.name?.trim() || 'ssr-fixture';
  const response = await render();
  return Object.freeze({
    name,
    response,
    html: response.html,
    head: response.head,
    state: response.state,
    stateScript: response.stateScript,
    styles: response.styles,
    router: response.router,
    store: response.store,
    contains: (value: string) => response.html.includes(value),
  });
}

export interface HydrationFixtureContext {
  readonly container: HTMLElement;
  readonly stateRoot: HTMLElement;
  readonly document: Document;
}

export interface HydrateSsrFixtureOptions<Hydrated> {
  readonly attachTo?: Element;
  readonly document?: Document;
  readonly name?: string;
  readonly hydrate: (context: HydrationFixtureContext) => Promise<Hydrated>;
  readonly dispose?: (hydrated: Hydrated) => void | PromiseLike<void>;
}

export interface HydratedSsrFixture<Hydrated> extends HydrationFixtureContext {
  readonly name: string;
  readonly server: SsrFixture;
  readonly hydrated: Hydrated;
  readonly active: boolean;
  cleanup(): Promise<void>;
  query<ElementType extends Element = Element>(selector: string): ElementType | null;
  get<ElementType extends Element = Element>(selector: string): ElementType;
  text(): string;
}

interface HydrationFixtureInternals<Hydrated> {
  readonly name: string;
  readonly server: SsrFixture;
  readonly document: Document;
  readonly container: HTMLElement;
  readonly stateRoot: HTMLElement;
  readonly headNodes: readonly ChildNode[];
  readonly hydrated: Hydrated;
  readonly dispose?: (hydrated: Hydrated) => void | PromiseLike<void>;
  active: boolean;
}

const activeHydrationFixtures = new Set<HydrationFixtureInternals<unknown>>();

/** Installs one server result into a real document and hydrates it through the caller's public application boundary. */
export async function hydrateSsrFixture<Hydrated>(
  server: SsrFixture,
  options: HydrateSsrFixtureOptions<Hydrated>,
): Promise<HydratedSsrFixture<Hydrated>> {
  const document = options.document ?? globalThis.document;
  if (!document) throw new Error('A hydration fixture requires a Document.');
  const name = options.name?.trim() || `${server.name}-hydration`;
  const headTemplate = document.createElement('template');
  headTemplate.innerHTML = server.head;
  const headNodes = [...headTemplate.content.childNodes];
  document.head.append(...headNodes);
  const stateRoot = document.createElement('div');
  stateRoot.hidden = true;
  stateRoot.setAttribute('data-gluon-test-state', name);
  stateRoot.innerHTML = server.stateScript;
  const container = document.createElement('div');
  container.setAttribute('data-gluon-test-hydration', name);
  container.innerHTML = server.html;
  (options.attachTo ?? document.body).append(container, stateRoot);

  let hydrated: Hydrated;
  try {
    hydrated = await options.hydrate({ container, stateRoot, document });
  } catch (error) {
    container.remove();
    stateRoot.remove();
    for (const node of headNodes) node.remove();
    throw error;
  }

  const internals: HydrationFixtureInternals<Hydrated> = {
    name,
    server,
    document,
    container,
    stateRoot,
    headNodes,
    hydrated,
    dispose: options.dispose,
    active: true,
  };
  activeHydrationFixtures.add(internals as HydrationFixtureInternals<unknown>);

  return {
    name,
    server,
    document,
    container,
    stateRoot,
    hydrated,
    get active() { return internals.active; },
    cleanup: () => cleanupHydrationFixture(internals),
    query: (selector) => container.querySelector(selector),
    get<ElementType extends Element = Element>(selector: string): ElementType {
      const element = container.querySelector(selector);
      if (!element) throw new Error(`Hydration fixture "${name}" did not contain selector "${selector}".`);
      return element as ElementType;
    },
    text: () => container.textContent ?? '',
  };
}

async function cleanupHydrationFixture<Hydrated>(
  fixture: HydrationFixtureInternals<Hydrated>,
): Promise<void> {
  if (!fixture.active) return;
  fixture.active = false;
  const errors: string[] = [];
  try {
    await fixture.dispose?.(fixture.hydrated);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  fixture.container.remove();
  fixture.stateRoot.remove();
  for (const node of fixture.headNodes) node.remove();
  activeHydrationFixtures.delete(fixture as HydrationFixtureInternals<unknown>);
  if (errors.length > 0) throw new Error(`Hydration fixture "${fixture.name}" cleanup failed: ${errors.join('; ')}`);
}

/** Cleans active hydration fixtures in reverse creation order. */
export async function cleanupSsrFixtures(): Promise<void> {
  const errors: string[] = [];
  for (const fixture of [...activeHydrationFixtures].reverse()) {
    try {
      await cleanupHydrationFixture(fixture);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (errors.length > 0) throw new Error(`SSR fixture cleanup failed:\n- ${errors.join('\n- ')}`);
}

export function activeSsrFixtureNames(): readonly string[] {
  return Object.freeze([...activeHydrationFixtures].map(({ name }) => name));
}

export function assertNoSsrFixtureLeaks(): void {
  const names = activeSsrFixtureNames();
  if (names.length > 0) throw new Error(`Leaked SSR hydration fixtures: ${names.join(', ')}.`);
}
