import { beforeEach, expect, test } from 'vitest';
import {
  GluonElement,
  createGluonElementRegistry,
  createRegistryShadowRoot,
  defineElement,
  defineGluonElement,
  html,
  initializeRegistryShadowRoot,
  render,
  supportsScopedCustomElementRegistries,
  type GluonElementRegistry,
} from '../src/index.js';
import { getNodeCustomElementRegistry } from '../src/element-registry.js';

beforeEach(() => {
  document.body.replaceChildren();
});

test('keeps explicit global and already-associated root fallbacks idempotent', () => {
  const supported = supportsScopedCustomElementRegistries();
  expect(supportsScopedCustomElementRegistries()).toBe(supported);
  const globalRegistry: GluonElementRegistry = {
    platformRegistry: customElements,
    scoped: false,
    requestedScoped: true,
    define: (name, constructor) => customElements.define(name, constructor),
    get: (name) => customElements.get(name),
    whenDefined: (name) => customElements.whenDefined(name),
  };
  const host = document.createElement('section');
  const root = createRegistryShadowRoot(host, globalRegistry);
  expect((root as ShadowRoot & { customElementRegistry?: CustomElementRegistry | null })
    .customElementRegistry ?? customElements).toBe(customElements);
  initializeRegistryShadowRoot(root, globalRegistry);
  const focusedRoot = createRegistryShadowRoot(
    document.createElement('section'),
    globalRegistry,
    { mode: 'open', delegatesFocus: true },
  );
  expect(focusedRoot.delegatesFocus).toBe(true);

  const serverStyleRegistry: GluonElementRegistry = {
    scoped: true,
    requestedScoped: true,
    define() {},
    get: () => undefined,
    whenDefined: () => Promise.reject(new Error('not defined')),
  };
  initializeRegistryShadowRoot(root, serverStyleRegistry);

  if (supported) {
    const nativeRegistry = createGluonElementRegistry();
    const nativeRoot = createRegistryShadowRoot(document.createElement('section'), nativeRegistry);
    initializeRegistryShadowRoot(nativeRoot, nativeRegistry);
    const emptyRegistryRoot = document.createElement('section').attachShadow({
      mode: 'open',
      customElementRegistry: null,
    } as unknown as ShadowRootInit);
    expect(getNodeCustomElementRegistry(emptyRegistryRoot)).toBe(customElements);
  }
});

test('isolates duplicate class element names in genuinely separate native roots', async () => {
  const firstRegistry = createGluonElementRegistry();
  const secondRegistry = createGluonElementRegistry();

  class FirstStatus extends GluonElement {
    protected override render() { return html`<p>First registry</p>`; }
  }
  class SecondStatus extends GluonElement {
    protected override render() { return html`<p>Second registry</p>`; }
  }

  defineElement('gluon-scoped-shared', FirstStatus, { registry: firstRegistry });
  if (!supportsScopedCustomElementRegistries()) {
    expect(firstRegistry.scoped).toBe(false);
    expect(customElements.get('gluon-scoped-shared')).toBe(FirstStatus);
    expect(() => defineElement('gluon-scoped-shared', SecondStatus, { registry: secondRegistry }))
      .toThrow('already defined');
    return;
  }

  defineElement('gluon-scoped-shared', SecondStatus, { registry: secondRegistry });
  expect(await firstRegistry.whenDefined('gluon-scoped-shared')).toBe(FirstStatus);
  defineElement('gluon-scoped-shared', FirstStatus, { registry: firstRegistry });
  expect(() => firstRegistry.define('gluon-scoped-shared', SecondStatus)).toThrow('already defined');
  class PendingStatus extends HTMLElement {}
  const pending = firstRegistry.whenDefined('gluon-scoped-pending');
  firstRegistry.define('gluon-scoped-pending', PendingStatus);
  expect(await pending).toBe(PendingStatus);
  const firstHost = document.createElement('section');
  const secondHost = document.createElement('section');
  document.body.append(firstHost, secondHost);
  const firstRoot = createRegistryShadowRoot(firstHost, firstRegistry);
  const secondRoot = createRegistryShadowRoot(secondHost, secondRegistry);
  render(html`<gluon-scoped-shared></gluon-scoped-shared>`, firstRoot);
  render(html`<gluon-scoped-shared></gluon-scoped-shared>`, secondRoot);
  const first = firstRoot.querySelector('gluon-scoped-shared') as FirstStatus;
  const second = secondRoot.querySelector('gluon-scoped-shared') as SecondStatus;
  await Promise.all([first.updateComplete, second.updateComplete]);

  expect(first).toBeInstanceOf(FirstStatus);
  expect(second).toBeInstanceOf(SecondStatus);
  expect(first.shadowRoot?.textContent).toContain('First registry');
  expect(second.shadowRoot?.textContent).toContain('Second registry');
  expect(customElements.get('gluon-scoped-shared')).toBeUndefined();
  expect(createRegistryShadowRoot(firstHost, firstRegistry)).toBe(firstRoot);
  expect(getNodeCustomElementRegistry(first)).toBe(firstRegistry.platformRegistry);
  expect(getNodeCustomElementRegistry(firstHost)).toBe(customElements);
});

test('owns functional elements across nested root reconnects without replacing the global default', async () => {
  const registry = createGluonElementRegistry();
  let connected = 0;
  let disconnected = 0;
  const ScopedCounter = defineGluonElement({
    tagName: 'gluon-scoped-counter',
    setup({ onConnected, onDisconnected }) {
      onConnected(() => { connected += 1; });
      onDisconnected(() => { disconnected += 1; });
      return { render: () => html`<output>Scoped counter</output>` };
    },
  }, { registry });

  class RegistryHost extends GluonElement {
    static override readonly shadowRootRegistry = registry;
    protected override render() {
      return html`<gluon-scoped-counter></gluon-scoped-counter>`;
    }
  }
  defineElement('gluon-scoped-registry-host', RegistryHost);
  const host = document.createElement('gluon-scoped-registry-host') as RegistryHost;
  document.body.append(host);
  await host.updateComplete;
  const counter = host.shadowRoot?.querySelector('gluon-scoped-counter') as InstanceType<typeof ScopedCounter>;
  await counter.updateComplete;
  expect(counter).toBeInstanceOf(ScopedCounter);
  expect(counter.shadowRoot?.textContent).toContain('Scoped counter');
  expect(connected).toBe(1);

  host.remove();
  expect(disconnected).toBe(1);
  document.body.append(host);
  await host.updateComplete;
  expect(host.shadowRoot?.querySelector('gluon-scoped-counter')).toBe(counter);
  expect(connected).toBe(2);
  expect(registry.get('gluon-scoped-counter')).toBe(ScopedCounter);
  if (registry.scoped) expect(customElements.get('gluon-scoped-counter')).toBeUndefined();
});

test('initializes a declarative-style empty registry root before upgrade', async () => {
  const registry = createGluonElementRegistry();
  class HydratedScopedChild extends GluonElement {
    protected override render() { return html`<span>Hydrated scoped child</span>`; }
  }
  defineElement('gluon-scoped-hydrated-child', HydratedScopedChild, { registry });

  const host = document.createElement('section');
  document.body.append(host);
  const root = registry.scoped
    ? host.attachShadow({
      mode: 'open',
      customElementRegistry: null,
    } as unknown as ShadowRootInit)
    : host.attachShadow({ mode: 'open' });
  root.innerHTML = '<gluon-scoped-hydrated-child></gluon-scoped-hydrated-child>';
  initializeRegistryShadowRoot(root, registry);
  const child = root.querySelector('gluon-scoped-hydrated-child') as HydratedScopedChild;
  await child.updateComplete;
  expect(child).toBeInstanceOf(HydratedScopedChild);
  expect(child.shadowRoot?.textContent).toContain('Hydrated scoped child');

  if (registry.scoped) {
    const other = createGluonElementRegistry();
    expect(() => initializeRegistryShadowRoot(root, other)).toThrow('already owned');
    const uninitializedHost = document.createElement('section');
    const uninitializedRoot = uninitializedHost.attachShadow({
      mode: 'open',
      customElementRegistry: null,
    } as unknown as ShadowRootInit);
    const incomplete = {
      scoped: true,
      requestedScoped: true,
      platformRegistry: {
        define() {},
        get: () => undefined,
        getName: () => null,
        upgrade() {},
        whenDefined: () => Promise.resolve(HydratedScopedChild),
      } as CustomElementRegistry,
      define() {},
      get: () => undefined,
      whenDefined: () => Promise.resolve(HydratedScopedChild),
    };
    expect(() => initializeRegistryShadowRoot(uninitializedRoot, incomplete))
      .toThrow('cannot initialize');
  }
});
