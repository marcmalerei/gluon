export const GLUON_DEVTOOLS_PROTOCOL_VERSION = 1 as const;

export type DevtoolsEventKind = 'application' | 'component' | 'error' | 'event' | 'render' | 'router' | 'scheduler' | 'store';
export type DevtoolsValue = boolean | null | number | string | readonly DevtoolsValue[] | { readonly [key: string]: DevtoolsValue };

export interface ComponentSnapshot {
  readonly id: string;
  readonly name: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly properties: Readonly<Record<string, DevtoolsValue>>;
  readonly stylesheets: number;
  readonly children: readonly ComponentSnapshot[];
}

export interface ApplicationSnapshot {
  readonly id: string;
  readonly name: string;
  readonly selected: boolean;
  readonly mounted: boolean;
  readonly route?: string;
  readonly state: DevtoolsValue;
  readonly context: DevtoolsValue;
  readonly components: readonly ComponentSnapshot[];
  readonly stylesheets: number;
}

export interface DevtoolsEvent {
  readonly protocol: typeof GLUON_DEVTOOLS_PROTOCOL_VERSION;
  readonly sequence: number;
  readonly applicationId: string;
  readonly kind: DevtoolsEventKind;
  readonly timestamp: number;
  readonly payload: DevtoolsValue;
}

export interface DevtoolsSnapshot {
  readonly protocol: typeof GLUON_DEVTOOLS_PROTOCOL_VERSION;
  readonly selectedApplicationId?: string;
  readonly applications: readonly ApplicationSnapshot[];
  readonly timeline: readonly DevtoolsEvent[];
}

export interface ApplicationInspector {
  readonly id: string;
  readonly name: string;
  snapshot(selected: boolean): ApplicationSnapshot;
}

export type DevtoolsListener = (snapshot: DevtoolsSnapshot, event?: DevtoolsEvent) => void;

export class DevtoolsProtocol {
  private readonly applications = new Map<string, ApplicationInspector>();
  private readonly timeline: DevtoolsEvent[] = [];
  private readonly listeners = new Set<DevtoolsListener>();
  private sequence = 0;
  private selectedApplicationId?: string;

  registerApplication(inspector: ApplicationInspector): () => void {
    if (!inspector.id.trim()) throw new Error('GLUON_DEVTOOLS_APPLICATION_ID_EMPTY');
    if (this.applications.has(inspector.id)) throw new Error(`GLUON_DEVTOOLS_APPLICATION_DUPLICATE: ${inspector.id}`);
    this.applications.set(inspector.id, inspector);
    this.selectedApplicationId ??= inspector.id;
    this.record(inspector.id, 'application', { action: 'registered', name: inspector.name });
    return () => {
      if (!this.applications.delete(inspector.id)) return;
      if (this.selectedApplicationId === inspector.id) this.selectedApplicationId = this.applications.keys().next().value;
      this.record(inspector.id, 'application', { action: 'unregistered' });
    };
  }

  selectApplication(id: string): void {
    if (!this.applications.has(id)) throw new Error(`GLUON_DEVTOOLS_APPLICATION_UNKNOWN: ${id}`);
    this.selectedApplicationId = id;
    this.record(id, 'application', { action: 'selected' });
  }

  record(applicationId: string, kind: DevtoolsEventKind, payload: unknown, timestamp = Date.now()): DevtoolsEvent {
    if (kind !== 'application' && !this.applications.has(applicationId)) {
      throw new Error(`GLUON_DEVTOOLS_APPLICATION_UNKNOWN: ${applicationId}`);
    }
    const event = Object.freeze({
      protocol: GLUON_DEVTOOLS_PROTOCOL_VERSION,
      sequence: ++this.sequence,
      applicationId,
      kind,
      timestamp,
      payload: toDevtoolsValue(payload),
    });
    this.timeline.push(event);
    this.emit(event);
    return event;
  }

  clearTimeline(): void { this.timeline.length = 0; this.emit(); }

  snapshot(): DevtoolsSnapshot {
    return Object.freeze({
      protocol: GLUON_DEVTOOLS_PROTOCOL_VERSION,
      selectedApplicationId: this.selectedApplicationId,
      applications: Object.freeze([...this.applications.values()].map((inspector) => inspector.snapshot(inspector.id === this.selectedApplicationId))),
      timeline: Object.freeze([...this.timeline]),
    });
  }

  subscribe(listener: DevtoolsListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  private emit(event?: DevtoolsEvent): void {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot, event);
  }
}

export function toDevtoolsValue(value: unknown, seen = new WeakSet<object>()): DevtoolsValue {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
  if (typeof value === 'bigint' || typeof value === 'symbol' || typeof value === 'function' || value === undefined) return String(value);
  if (value instanceof Error) return { name: value.name, message: value.message };
  if (typeof value !== 'object') return String(value);
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) return value.map((entry) => toDevtoolsValue(entry, seen));
  const result: Record<string, DevtoolsValue> = {};
  for (const [key, entry] of Object.entries(value)) result[key] = toDevtoolsValue(entry, seen);
  return result;
}
