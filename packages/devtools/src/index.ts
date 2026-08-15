import { setGluonRenderDebugHook, type GluonApp, type GluonRenderDebugEvent } from '@gluonjs/core';
import {
  DevtoolsProtocol,
  toDevtoolsValue,
  toDevtoolsSourceLocation,
  type ApplicationSnapshot,
  type ComponentSnapshot,
  type DevtoolsEvent,
  type DevtoolsEventKind,
  type DevtoolsHandshake,
  type DevtoolsSnapshot,
  type DevtoolsSourceLocation,
  type DevtoolsSourceLocationInput,
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

export interface DevtoolsArtifactContract {
  readonly name: 'gluon-devtools-browser-inspector';
  readonly version: 1;
  readonly format: 'esm-package';
  readonly packageName: '@gluonjs/devtools';
  readonly packageExport: '.';
  readonly manifest: './browser-inspector.manifest.json';
  readonly inspectorExport: 'mountGluonDevtools';
  readonly virtualId: string;
  readonly runtime: {
    readonly mode: 'serve-only';
    readonly global: typeof GLUON_DEVTOOLS_GLOBAL;
    readonly productionExposure: false;
  };
  readonly security: {
    readonly permissions: readonly [];
    readonly remoteInspection: false;
    readonly sourceNavigation: 'callback-only-redacted';
  };
}

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
        failure: sanitizePayload(failure),
        sourceLocation: routerSourceLocation(to, from, failure),
      });
    }));
    if (options.store) cleanups.push(options.store.subscribe((transaction) => {
      this.protocol.record(options.id, 'store', normalizeStoreTransaction(transaction));
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
    return this.record(applicationId, 'error', normalizeErrorPayload(payload));
  }

  snapshot(): DevtoolsSnapshot { return this.protocol.snapshot(); }

  handshake(): DevtoolsHandshake { return this.protocol.handshake(); }

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
      error: sanitizePayload(event.error),
      sourceLocation: toDevtoolsValue(componentSourceLocation(event.element, 'render')),
      errorSourceLocation: toDevtoolsValue(sourceLocationForKind(errorSourceLocation(event.error), 'error')),
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

export function createDevtoolsArtifactContract(virtualId = 'virtual:gluon-devtools'): DevtoolsArtifactContract {
  return Object.freeze({
    name: 'gluon-devtools-browser-inspector',
    version: 1,
    format: 'esm-package',
    packageName: '@gluonjs/devtools',
    packageExport: '.',
    manifest: './browser-inspector.manifest.json',
    inspectorExport: 'mountGluonDevtools',
    virtualId,
    runtime: {
      mode: 'serve-only',
      global: GLUON_DEVTOOLS_GLOBAL,
      productionExposure: false,
    },
    security: {
      permissions: [],
      remoteInspection: false,
      sourceNavigation: 'callback-only-redacted',
    },
  } satisfies DevtoolsArtifactContract);
}

export interface MountedDevtools { readonly element: HTMLElement; unmount(): void }

export interface DevtoolsInspectorOptions {
  /** App-owned navigation. Gluon passes redacted metadata and never constructs an editor URI. */
  readonly navigateToSource?: (location: DevtoolsSourceLocation) => void;
}

export function mountGluonDevtools(
  bridge: GluonDevtoolsBridge,
  target: Element = document.body,
  options: DevtoolsInspectorOptions = {},
): MountedDevtools {
  if (!bridge.enabled) throw new Error('GLUON_DEVTOOLS_DISABLED');
  const host = document.createElement('aside');
  host.setAttribute('aria-label', 'Gluon Devtools');
  const shadow = host.attachShadow({ mode: 'open' });
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(`:host{position:fixed;right:12px;bottom:12px;z-index:2147483647;width:min(420px,calc(100vw - 24px));max-height:70vh;overflow:auto;background:#111;color:#fff;border:1px solid #555;font:12px/1.4 ui-monospace,monospace}header{position:sticky;top:0;display:flex;gap:8px;padding:10px;background:#181818}button{min-height:32px;background:#c8ff00;border:0;color:#111}section{padding:10px;border-top:1px solid #444}ol{padding-left:24px}code{white-space:pre-wrap}.sources{display:grid;gap:6px;margin:8px 0 0;padding:0;list-style:none}.sources button{width:100%;text-align:left}`);
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
    const timeline = snapshot.timeline.filter((event) => event.applicationId === selected?.id);
    if (selected) shadow.append(
      inspectorSection('Application', JSON.stringify(selected, null, 2)),
      inspectorSourcesSection(selected, timeline, options),
      inspectorSection('Timeline', JSON.stringify(timeline.map((event) => ({
        sequence: event.sequence,
        kind: event.kind,
        timestamp: event.timestamp,
        payload: event.payload,
      })), null, 2)),
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
      return `import { createDevtoolsArtifactContract, createDevtoolsBridge } from '@gluonjs/devtools';\nexport const devtoolsArtifactContract = createDevtoolsArtifactContract(${JSON.stringify(publicId)});\nexport const devtools = createDevtoolsBridge({ enabled: ${enabled}, exposeGlobal: ${enabled} });`;
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
      sourceLocation: componentSourceLocation(element, 'component'),
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

interface InspectorSourceTarget {
  readonly label: string;
  readonly location: DevtoolsSourceLocation;
}

function inspectorSourcesSection(
  application: ApplicationSnapshot,
  timeline: readonly DevtoolsEvent[],
  options: DevtoolsInspectorOptions,
): HTMLElement {
  const section = document.createElement('section');
  const heading = document.createElement('strong');
  heading.textContent = 'Sources';
  section.append(heading);
  const targets = [
    ...componentSourceTargets(application.components),
    ...timeline.flatMap(eventSourceTargets),
  ];
  if (targets.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No source locations recorded.';
    section.append(empty);
    return section;
  }
  const list = document.createElement('ol');
  list.className = 'sources';
  for (const target of targets) {
    const item = document.createElement('li');
    if (options.navigateToSource) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.sourceKind = target.location.kind;
      button.textContent = target.label;
      button.addEventListener('click', () => options.navigateToSource?.(target.location));
      item.append(button);
    } else {
      const label = document.createElement('code');
      label.textContent = target.label;
      item.append(label);
    }
    list.append(item);
  }
  section.append(list);
  return section;
}

function componentSourceTargets(components: readonly ComponentSnapshot[]): InspectorSourceTarget[] {
  return components.flatMap((component) => {
    const current = component.sourceLocation
      ? [{ label: `${component.name}: ${formatSourceLocation(component.sourceLocation)}`, location: component.sourceLocation }]
      : [];
    return [...current, ...componentSourceTargets(component.children)];
  });
}

function eventSourceTargets(event: DevtoolsEvent): InspectorSourceTarget[] {
  if (!event.payload || typeof event.payload !== 'object' || Array.isArray(event.payload)) return [];
  const payload = event.payload as Readonly<Record<string, DevtoolsValue>>;
  return ['sourceLocation', 'errorSourceLocation'].flatMap((key) => {
    const location = toDevtoolsSourceLocation(payload[key] as unknown as DevtoolsSourceLocationInput | undefined);
    return location ? [{ label: `${event.kind} #${event.sequence}: ${formatSourceLocation(location)}`, location }] : [];
  });
}

function formatSourceLocation(location: DevtoolsSourceLocation): string {
  const line = location.line ? `:${location.line}` : '';
  const column = location.column ? `:${location.column}` : '';
  return `${location.kind} ${location.file}${line}${column}`;
}

function routerSourceLocation(to: any, from: any, failure: unknown): DevtoolsSourceLocation | undefined {
  return sourceLocationForKind(
    sourceLocationCandidate(to) ?? sourceLocationCandidate(from) ?? sourceLocationCandidate(failure),
    'router',
  );
}

function normalizeStoreTransaction(transaction: unknown): unknown {
  if (!transaction || typeof transaction !== 'object' || Array.isArray(transaction)) return transaction;
  const snapshot = transaction as Record<string, unknown>;
  const location = sourceLocationCandidate(snapshot);
  const sanitized = sanitizePayload(snapshot) as Record<string, unknown>;
  const sourceLocation = sourceLocationForKind(location, 'store');
  return sourceLocation ? { ...sanitized, sourceLocation } : sanitized;
}

function normalizeErrorPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  const snapshot = payload as Record<string, unknown>;
  const location = sourceLocationCandidate(snapshot) ?? errorSourceLocation(snapshot.error);
  const sanitized = sanitizePayload(snapshot) as Record<string, unknown>;
  const sourceLocation = sourceLocationForKind(location, 'error');
  return sourceLocation ? { ...sanitized, sourceLocation } : sanitized;
}

function errorSourceLocation(value: unknown): DevtoolsSourceLocationInput | undefined {
  return sourceLocationCandidate(value);
}

function sourceLocationCandidate(value: unknown): DevtoolsSourceLocationInput | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as { readonly sourceLocation?: DevtoolsSourceLocationInput; readonly location?: DevtoolsSourceLocationInput };
  return candidate.sourceLocation ?? candidate.location;
}

function sourceLocationForKind(
  location: DevtoolsSourceLocationInput | undefined,
  kind: DevtoolsSourceLocation['kind'],
): DevtoolsSourceLocation | undefined {
  if (!location) return undefined;
  return toDevtoolsSourceLocation({
    kind,
    file: location.file,
    line: location.line,
    column: location.column,
    redacted: location.redacted,
  });
}

function sanitizePayload(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value instanceof Error) return { name: value.name, message: value.message };
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) return value.map((entry) => sanitizePayload(entry, seen));
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key === 'location' || key === 'sourceLocation') continue;
    result[key] = sanitizePayload(entry, seen);
  }
  return result;
}

function componentSourceLocation(
  element: Element,
  kind: DevtoolsSourceLocationInput['kind'],
): DevtoolsSourceLocation | undefined {
  const constructor = element.constructor as typeof HTMLElement & {
    readonly sourceLocation?: DevtoolsSourceLocationInput | DevtoolsSourceLocation;
    readonly renderLocation?: DevtoolsSourceLocationInput | DevtoolsSourceLocation;
  };
  const location = constructor.sourceLocation ?? constructor.renderLocation;
  if (!location) return undefined;
  return sourceLocationForKind(location, kind);
}
