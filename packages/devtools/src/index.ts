import { setGluonRenderDebugHook, type GluonApp, type GluonRenderDebugEvent } from '@gluonjs/core';
import {
  DevtoolsProtocol,
  toDevtoolsValue,
  type ApplicationSnapshot,
  type ComponentSnapshot,
  type DevtoolsEvent,
  type DevtoolsEventKind,
  type DevtoolsSnapshot,
  type DevtoolsValue,
} from '@gluonjs/devtools-api';
import type { Plugin } from 'vite';

export const GLUON_DEVTOOLS_GLOBAL = '__GLUON_DEVTOOLS__';

export interface InspectableRouter {
  readonly currentRoute: { readonly value: { readonly fullPath?: string; readonly path?: string } };
  afterEach(hook: (to: any, from: any, failure?: unknown) => void): () => void;
}

export interface InspectableStore {
  subscribe(callback: (transaction: unknown) => void): () => void;
  dehydrate(): unknown;
}

export interface RegisterApplicationOptions {
  readonly id: string;
  readonly name?: string;
  readonly app: Pick<GluonApp, 'mounted'>;
  readonly root: Element;
  readonly router?: InspectableRouter;
  readonly store?: InspectableStore;
  readonly context?: () => unknown;
  readonly state?: () => unknown;
}

export interface DevtoolsBridgeOptions {
  readonly enabled?: boolean;
  readonly exposeGlobal?: boolean;
  readonly globalObject?: Record<string, unknown>;
}

interface RegisteredApplication extends RegisterApplicationOptions { readonly cleanups: Array<() => void> }

export class GluonDevtoolsBridge {
  readonly protocol = new DevtoolsProtocol();
  readonly enabled: boolean;
  private readonly applications = new Map<string, RegisteredApplication>();
  private readonly restoreRenderHook?: () => void;
  private readonly globalObject?: Record<string, unknown>;

  constructor(options: DevtoolsBridgeOptions = {}) {
    this.enabled = options.enabled ?? false;
    if (!this.enabled) return;
    this.restoreRenderHook = setGluonRenderDebugHook((event) => this.recordRender(event));
    if (options.exposeGlobal) {
      this.globalObject = options.globalObject ?? globalThis as unknown as Record<string, unknown>;
      this.globalObject[GLUON_DEVTOOLS_GLOBAL] = this;
    }
  }

  registerApplication(options: RegisterApplicationOptions): () => void {
    if (!this.enabled) return () => undefined;
    const cleanups: Array<() => void> = [];
    const registered: RegisteredApplication = { ...options, name: options.name ?? options.id, cleanups };
    this.applications.set(options.id, registered);
    const unregisterProtocol = this.protocol.registerApplication({
      id: options.id,
      name: registered.name!,
      snapshot: (selected) => this.applicationSnapshot(registered, selected),
    });
    if (options.router) cleanups.push(options.router.afterEach((to, from, failure) => {
      this.protocol.record(options.id, 'router', {
        to: to?.fullPath ?? to?.path ?? '',
        from: from?.fullPath ?? from?.path ?? '',
        status: failure ? 'failed' : 'completed',
        failure,
      });
    }));
    if (options.store) cleanups.push(options.store.subscribe((transaction) => {
      this.protocol.record(options.id, 'store', transaction);
    }));
    return () => {
      if (!this.applications.delete(options.id)) return;
      for (const cleanup of cleanups.splice(0)) cleanup();
      unregisterProtocol();
    };
  }

  selectApplication(id: string): void { if (this.enabled) this.protocol.selectApplication(id); }

  recordScheduler(applicationId: string, payload: unknown): DevtoolsEvent | undefined {
    return this.record(applicationId, 'scheduler', payload);
  }

  recordEvent(applicationId: string, payload: unknown): DevtoolsEvent | undefined {
    return this.record(applicationId, 'event', payload);
  }

  recordError(applicationId: string, payload: unknown): DevtoolsEvent | undefined {
    return this.record(applicationId, 'error', payload);
  }

  snapshot(): DevtoolsSnapshot { return this.protocol.snapshot(); }

  dispose(): void {
    for (const application of [...this.applications.values()]) {
      for (const cleanup of application.cleanups.splice(0)) cleanup();
      this.applications.delete(application.id);
    }
    this.restoreRenderHook?.();
    if (this.globalObject?.[GLUON_DEVTOOLS_GLOBAL] === this) delete this.globalObject[GLUON_DEVTOOLS_GLOBAL];
  }

  private record(applicationId: string, kind: DevtoolsEventKind, payload: unknown): DevtoolsEvent | undefined {
    if (!this.enabled) return undefined;
    return this.protocol.record(applicationId, kind, payload);
  }

  private recordRender(event: GluonRenderDebugEvent): void {
    const application = [...this.applications.values()].find((candidate) => candidate.root === event.element || candidate.root.contains(event.element));
    if (!application) return;
    this.protocol.record(application.id, 'render', {
      component: event.element.localName,
      causes: event.causes.map((cause) => cause.type === 'reactive'
        ? { type: cause.type, dependency: String(cause.dependency.key) }
        : cause),
      dependencies: event.dependencies.length,
      duration: event.duration,
      failed: event.failed,
      error: event.error,
    }, event.endedAt);
  }

  private applicationSnapshot(application: RegisteredApplication, selected: boolean): ApplicationSnapshot {
    const rootNode = application.root.getRootNode();
    return Object.freeze({
      id: application.id,
      name: application.name!,
      selected,
      mounted: application.app.mounted,
      route: application.router?.currentRoute.value.fullPath ?? application.router?.currentRoute.value.path,
      state: toDevtoolsValue(application.state?.() ?? application.store?.dehydrate() ?? {}),
      context: toDevtoolsValue(application.context?.() ?? {}),
      components: Object.freeze(componentChildren(application.root, application.id)),
      stylesheets: 'adoptedStyleSheets' in rootNode ? (rootNode as Document | ShadowRoot).adoptedStyleSheets.length : 0,
    });
  }
}

export function createDevtoolsBridge(options: DevtoolsBridgeOptions = {}): GluonDevtoolsBridge {
  return new GluonDevtoolsBridge(options);
}

export interface MountedDevtools { readonly element: HTMLElement; unmount(): void }

export function mountGluonDevtools(
  bridge: GluonDevtoolsBridge,
  target: Element = document.body,
): MountedDevtools {
  if (!bridge.enabled) throw new Error('GLUON_DEVTOOLS_DISABLED');
  const host = document.createElement('aside');
  host.setAttribute('aria-label', 'Gluon Devtools');
  const shadow = host.attachShadow({ mode: 'open' });
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(`:host{position:fixed;right:12px;bottom:12px;z-index:2147483647;width:min(420px,calc(100vw - 24px));max-height:70vh;overflow:auto;background:#111;color:#fff;border:1px solid #555;font:12px/1.4 ui-monospace,monospace}header{position:sticky;top:0;display:flex;gap:8px;padding:10px;background:#181818}button{min-height:32px;background:#c8ff00;border:0;color:#111}section{padding:10px;border-top:1px solid #444}ol{padding-left:24px}code{white-space:pre-wrap}`);
  shadow.adoptedStyleSheets = [sheet];
  const render = (snapshot: DevtoolsSnapshot) => {
    const selected = snapshot.applications.find((application) => application.selected);
    shadow.replaceChildren();
    const header = document.createElement('header');
    for (const application of snapshot.applications) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = application.name;
      button.setAttribute('aria-pressed', String(application.selected));
      button.addEventListener('click', () => bridge.selectApplication(application.id));
      header.append(button);
    }
    shadow.append(header);
    if (selected) shadow.append(
      inspectorSection('Application', JSON.stringify(selected, null, 2)),
      inspectorSection('Timeline', JSON.stringify(snapshot.timeline.filter((event) => event.applicationId === selected.id), null, 2)),
    );
  };
  const unsubscribe = bridge.protocol.subscribe(render);
  target.append(host);
  return { element: host, unmount() { unsubscribe(); host.remove(); } };
}

export interface GluonDevtoolsPluginOptions { readonly virtualId?: string }

export function gluonDevtoolsPlugin(options: GluonDevtoolsPluginOptions = {}): Plugin {
  const publicId = options.virtualId ?? 'virtual:gluon-devtools';
  const resolvedId = `\0${publicId}`;
  let enabled = false;
  return {
    name: 'gluon-devtools',
    config(_config, environment) { enabled = environment.command === 'serve'; },
    resolveId(id) { return id === publicId ? resolvedId : null; },
    load(id) {
      if (id !== resolvedId) return null;
      return `import { createDevtoolsBridge } from '@gluonjs/devtools';\nexport const devtools = createDevtoolsBridge({ enabled: ${enabled}, exposeGlobal: ${enabled} });`;
    },
  };
}

function componentChildren(root: Element, applicationId: string): ComponentSnapshot[] {
  return [...root.children].flatMap((element, index) => {
    const children = componentChildren(element, applicationId);
    if (!element.localName.includes('-')) return children;
    const attributes = Object.fromEntries([...element.attributes].map((attribute) => [attribute.name, attribute.value]));
    const declared = (element.constructor as typeof HTMLElement & { properties?: Record<string, unknown> }).properties ?? {};
    const properties: Record<string, DevtoolsValue> = {};
    for (const name of Object.keys(declared)) properties[name] = toDevtoolsValue((element as unknown as Record<string, unknown>)[name]);
    return [{
      id: `${applicationId}:${element.localName}:${index}`,
      name: element.localName,
      attributes,
      properties,
      stylesheets: element.shadowRoot?.adoptedStyleSheets.length ?? 0,
      children,
    }];
  });
}

function inspectorSection(title: string, value: string): HTMLElement {
  const section = document.createElement('section');
  const heading = document.createElement('strong');
  heading.textContent = title;
  const code = document.createElement('code');
  code.textContent = value;
  section.append(heading, document.createElement('br'), code);
  return section;
}
