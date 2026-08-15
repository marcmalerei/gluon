import type { TemplateValue } from '@gluonjs/core';
import type {
  JsonFormField,
  JsonFormValidationError,
  JsonFormsMessageProvider,
  JsonFormsUiSchema,
  JsonObject,
  JsonSchema,
  JsonValue,
} from './schema.js';

/** A field kind accepted by a JSON Forms renderer selector. */
export type JsonFormsRendererKind = JsonFormField['kind'];

/** Declarative, serializable matching criteria for one custom renderer. */
export interface JsonFormsRendererSelector {
  readonly kind: JsonFormsRendererKind | readonly JsonFormsRendererKind[];
  readonly schemaType?: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';
  readonly format?: string;
  readonly path?: readonly string[];
}

/** IDs and validation relationships owned by the JSON Forms host. */
export interface JsonFormsRendererControl {
  readonly id: string;
  readonly labelId: string;
  readonly descriptionId?: string;
  readonly errorId: string;
  readonly describedBy?: string;
  /**
   * Commits one JSON value through the host-owned immutable update,
   * validation, form-association, and event lifecycle.
   */
  commit(value: JsonValue | undefined): void;
}

/** Public, immutable field context passed to a registered renderer. */
export interface JsonFormsRendererContext {
  readonly field: JsonFormField;
  readonly schema: JsonSchema;
  readonly uiSchema?: JsonFormsUiSchema;
  readonly rootUiSchema?: JsonFormsUiSchema;
  readonly path: readonly string[];
  readonly data: JsonObject;
  readonly value: JsonValue | undefined;
  readonly errors: readonly JsonFormValidationError[];
  readonly disabled: boolean;
  readonly readOnly: boolean;
  readonly messages: JsonFormsMessageProvider;
  readonly control: JsonFormsRendererControl;
}

/** One request-free custom renderer registration. */
export interface JsonFormsRendererRegistration {
  readonly id: string;
  readonly selector: JsonFormsRendererSelector;
  /** Higher priorities win when selectors overlap. Defaults to zero. */
  readonly priority?: number;
  render(context: JsonFormsRendererContext): TemplateValue;
}

const rendererKinds = new Set<JsonFormsRendererKind>([
  'text',
  'number',
  'boolean',
  'select',
  'object',
  'array',
]);
const schemaTypes = new Set(['string', 'number', 'integer', 'boolean', 'object', 'array']);
const registries = new WeakSet<object>();

/** Immutable renderer registry with deterministic priority-based selection. */
export interface JsonFormsRendererRegistry {
  readonly registrations: readonly JsonFormsRendererRegistration[];

  /** Resolves the highest-priority matching renderer or the built-in fallback. */
  resolve(context: JsonFormsRendererContext): JsonFormsRendererRegistration | undefined;
}

class JsonFormsRendererRegistryImplementation implements JsonFormsRendererRegistry {
  readonly registrations: readonly JsonFormsRendererRegistration[];

  constructor(registrations: readonly JsonFormsRendererRegistration[]) {
    this.registrations = registrations;
    registries.add(this);
    Object.freeze(this);
  }

  resolve(context: JsonFormsRendererContext): JsonFormsRendererRegistration | undefined {
    return this.registrations.find(({ selector }) => selectorMatches(selector, context));
  }
}

/** Creates and validates a deterministic, request-free renderer registry. */
export function createJsonFormsRendererRegistry(
  registrations: readonly JsonFormsRendererRegistration[],
): JsonFormsRendererRegistry {
  if (!Array.isArray(registrations)) {
    throw new TypeError('JSON Forms renderer registrations must be an array.');
  }
  const ids = new Set<string>();
  const normalized = registrations.map((registration, index) => {
    const next = normalizeRegistration(registration, index);
    if (ids.has(next.id)) {
      throw new TypeError(`JSON Forms renderer id "${next.id}" is registered more than once.`);
    }
    ids.add(next.id);
    return next;
  });
  for (let left = 0; left < normalized.length; left += 1) {
    for (let right = left + 1; right < normalized.length; right += 1) {
      const first = normalized[left]!;
      const second = normalized[right]!;
      if (first.priority === second.priority && selectorsOverlap(first.selector, second.selector)) {
        throw new TypeError(
          `JSON Forms renderers "${first.id}" and "${second.id}" overlap at priority ${first.priority}; assign distinct priorities or disjoint selectors.`,
        );
      }
    }
  }
  normalized.sort((left, right) => right.priority! - left.priority!);
  return new JsonFormsRendererRegistryImplementation(Object.freeze(normalized));
}

/** Returns whether a value is a registry created by this package instance. */
export function isJsonFormsRendererRegistry(value: unknown): value is JsonFormsRendererRegistry {
  return value !== null && typeof value === 'object' && registries.has(value);
}

function normalizeRegistration(
  registration: JsonFormsRendererRegistration,
  index: number,
): JsonFormsRendererRegistration {
  if (!isRecord(registration)) {
    throw new TypeError(`JSON Forms renderer registration at index ${index} must be an object.`);
  }
  if (!Object.keys(registration).every((key) => key === 'id' || key === 'selector' || key === 'priority' || key === 'render')) {
    throw new TypeError(`JSON Forms renderer registration at index ${index} contains an unsupported property.`);
  }
  if (typeof registration.id !== 'string' || !/^[a-z][a-z0-9._-]*$/i.test(registration.id)) {
    throw new TypeError(`JSON Forms renderer registration at index ${index} requires a stable id.`);
  }
  if (typeof registration.render !== 'function') {
    throw new TypeError(`JSON Forms renderer "${registration.id}" requires a render function.`);
  }
  const priority = registration.priority ?? 0;
  if (!Number.isSafeInteger(priority)) {
    throw new TypeError(`JSON Forms renderer "${registration.id}" priority must be a safe integer.`);
  }
  const selector = normalizeSelector(registration.selector, registration.id);
  return Object.freeze({
    id: registration.id,
    selector,
    priority,
    render: registration.render,
  });
}

function normalizeSelector(
  selector: JsonFormsRendererSelector,
  id: string,
): JsonFormsRendererSelector {
  if (!isRecord(selector)
    || !Object.keys(selector).every((key) => key === 'kind' || key === 'schemaType' || key === 'format' || key === 'path')) {
    throw new TypeError(`JSON Forms renderer "${id}" requires a supported declarative selector.`);
  }
  const kinds = Array.isArray(selector.kind) ? selector.kind : [selector.kind];
  if (kinds.length === 0 || kinds.some((kind) => !rendererKinds.has(kind as JsonFormsRendererKind))) {
    throw new TypeError(`JSON Forms renderer "${id}" selector requires a supported field kind.`);
  }
  if (selector.schemaType !== undefined && !schemaTypes.has(selector.schemaType)) {
    throw new TypeError(`JSON Forms renderer "${id}" selector has an unsupported schemaType.`);
  }
  if (selector.format !== undefined && (typeof selector.format !== 'string' || selector.format.trim() === '')) {
    throw new TypeError(`JSON Forms renderer "${id}" selector format must be a non-empty string.`);
  }
  if (selector.path !== undefined
    && (!Array.isArray(selector.path) || selector.path.some((segment) => typeof segment !== 'string' || segment === ''))) {
    throw new TypeError(`JSON Forms renderer "${id}" selector path must contain non-empty string segments.`);
  }
  return Object.freeze({
    kind: Object.freeze([...new Set(kinds)]) as readonly JsonFormsRendererKind[],
    ...(selector.schemaType ? { schemaType: selector.schemaType } : {}),
    ...(selector.format ? { format: selector.format } : {}),
    ...(selector.path ? { path: Object.freeze([...selector.path]) } : {}),
  });
}

function selectorMatches(
  selector: JsonFormsRendererSelector,
  context: JsonFormsRendererContext,
): boolean {
  const kinds = selector.kind as readonly JsonFormsRendererKind[];
  return kinds.includes(context.field.kind)
    && (selector.schemaType === undefined || selector.schemaType === context.schema.type)
    && (selector.format === undefined || selector.format === context.schema.format)
    && (selector.path === undefined || pathsEqual(selector.path, context.path));
}

function selectorsOverlap(
  left: JsonFormsRendererSelector,
  right: JsonFormsRendererSelector,
): boolean {
  const leftKinds = left.kind as readonly JsonFormsRendererKind[];
  const rightKinds = right.kind as readonly JsonFormsRendererKind[];
  return leftKinds.some((kind) => rightKinds.includes(kind))
    && optionalValuesOverlap(left.schemaType, right.schemaType)
    && optionalValuesOverlap(left.format, right.format)
    && (left.path === undefined || right.path === undefined || pathsEqual(left.path, right.path));
}

function optionalValuesOverlap(left: string | undefined, right: string | undefined): boolean {
  return left === undefined || right === undefined || left === right;
}

function pathsEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((segment, index) => segment === right[index]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
