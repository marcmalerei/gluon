import { createInjectionKey, type GluonApp } from '@gluonjs/core';

export type TenantJsonValue = null | boolean | number | string | TenantJsonValue[] | { readonly [key: string]: TenantJsonValue };

export interface TenantResolutionRequest {
  readonly url: string;
  readonly hostname: string;
  readonly headers: Readonly<Record<string, string | undefined>>;
}

export type TenantResolver<Tenant extends TenantJsonValue = TenantJsonValue> = (
  request: TenantResolutionRequest,
) => Tenant | Promise<Tenant>;

export interface TenantContext<Tenant extends TenantJsonValue = TenantJsonValue> {
  readonly id: string;
  readonly tenant: Tenant;
  readonly hostname: string;
  readonly resolvedAt: number;
}

export const tenantInjectionKey = createInjectionKey<TenantContext>();

export function createTenantContext<Tenant extends TenantJsonValue>(
  tenant: Tenant,
  options: { readonly hostname: string; readonly id?: string; readonly resolvedAt?: number },
): TenantContext<Tenant> {
  const id = options.id ?? tenantId(tenant, options.hostname);
  if (!id.trim()) throw new TypeError('A tenant context id cannot be empty.');
  if (!options.hostname.trim()) throw new TypeError('A tenant context hostname cannot be empty.');
  return Object.freeze({
    id,
    tenant,
    hostname: options.hostname,
    resolvedAt: options.resolvedAt ?? Date.now(),
  });
}

export async function resolveTenant<Tenant extends TenantJsonValue>(
  request: TenantResolutionRequest,
  resolver: TenantResolver<Tenant>,
): Promise<TenantContext<Tenant>> {
  const tenant = await resolver(request);
  return createTenantContext(tenant, { hostname: request.hostname });
}

/** Serializes only JSON-compatible tenant data for an explicit client handoff. */
export function serializeTenantContext<Tenant extends TenantJsonValue>(context: TenantContext<Tenant>): string {
  return JSON.stringify(context);
}

export function deserializeTenantContext<Tenant extends TenantJsonValue>(serialized: string): TenantContext<Tenant> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch (error) {
    throw new TypeError(`Invalid serialized tenant context: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!isTenantContext(parsed)) throw new TypeError('Serialized tenant context is not a valid tenant context.');
  return Object.freeze(parsed as TenantContext<Tenant>);
}

export function installTenant<Tenant extends TenantJsonValue>(
  app: GluonApp,
  context: TenantContext<Tenant>,
): () => void {
  app.provide(tenantInjectionKey as ReturnType<typeof createInjectionKey<TenantContext<Tenant>>>, context);
  return () => undefined;
}

function isTenantContext(value: unknown): value is TenantContext {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string'
    && candidate.id.length > 0
    && typeof candidate.hostname === 'string'
    && candidate.hostname.length > 0
    && typeof candidate.resolvedAt === 'number'
    && Number.isFinite(candidate.resolvedAt)
    && isJsonValue(candidate.tenant);
}

function isJsonValue(value: unknown): value is TenantJsonValue {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return false;
  return Object.values(value).every(isJsonValue);
}

function tenantId<Tenant extends TenantJsonValue>(tenant: Tenant, hostname: string): string {
  if (tenant && typeof tenant === 'object' && !Array.isArray(tenant)) {
    const candidate = tenant as { readonly id?: unknown; readonly slug?: unknown };
    if (typeof candidate.id === 'string' && candidate.id.trim()) return candidate.id;
    if (typeof candidate.slug === 'string' && candidate.slug.trim()) return candidate.slug;
  }
  return hostname.toLowerCase();
}
