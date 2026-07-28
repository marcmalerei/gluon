import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

/** A JSON object accepted as `data` by {@link JsonFormsElement}. */
export interface JsonObject {
  readonly [key: string]: JsonValue;
}

/** A JSON value accepted by the initial JSON Forms component. */
export type JsonValue = string | number | boolean | null | JsonObject | readonly JsonValue[];

/** The supported JSON Schema keywords for the first package slice. */
export interface JsonSchema {
  readonly type?: string | readonly string[];
  readonly title?: string;
  readonly description?: string;
  readonly default?: JsonValue;
  readonly properties?: Readonly<Record<string, JsonSchema>>;
  readonly required?: readonly string[];
  readonly enum?: readonly (string | number)[];
  readonly enumNames?: readonly string[];
  readonly format?: string;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly readOnly?: boolean;
  readonly additionalProperties?: boolean;
}

/** A JSON Forms `Control` or top-level `VerticalLayout` UI schema. */
export interface JsonFormsUiSchema {
  readonly type: 'Control' | 'VerticalLayout';
  readonly scope?: string;
  readonly label?: string | false;
  readonly elements?: readonly JsonFormsUiSchema[];
  readonly options?: {
    readonly enumNames?: readonly string[];
  };
}

/** One validation diagnostic reported by the element. */
export interface JsonFormValidationError {
  readonly instancePath: string;
  readonly schemaPath: string;
  readonly keyword: string;
  readonly message: string;
  /** The direct property associated with the error, when AJV exposes one. */
  readonly property?: string;
}

/** A rendered direct property of a supported root-object schema. */
export interface JsonFormField {
  readonly name: string;
  readonly label: string;
  readonly description?: string;
  readonly kind: 'text' | 'number' | 'boolean' | 'select';
  readonly required: boolean;
  readonly readOnly: boolean;
  readonly schema: JsonSchema;
  readonly options: readonly {
    readonly label: string;
    readonly value: string | number;
  }[];
}

interface FieldLayout {
  readonly labels: ReadonlyMap<string, string | false>;
  readonly enumNames: ReadonlyMap<string, readonly string[]>;
  readonly order: readonly string[];
}

interface ValidationResult {
  readonly errors: readonly JsonFormValidationError[];
}

const supportedFormats = new Set(['email']);

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return Number.isFinite(value) || typeof value !== 'number';
  }
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value !== 'object') return false;
  return Object.values(value as Record<string, unknown>).every(isJsonValue);
}

/** Returns whether a value is a JSON object with JSON-compatible descendants. */
export function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && !Array.isArray(value) && typeof value === 'object' && isJsonValue(value);
}

/** Returns whether a value is a supported JSON Schema object. */
export function isJsonSchema(value: unknown): value is JsonSchema {
  return value !== null && !Array.isArray(value) && typeof value === 'object';
}

/** Returns whether a value has the narrow initial JSON Forms UI-schema shape. */
export function isJsonFormsUiSchema(value: unknown): value is JsonFormsUiSchema {
  if (value === null || Array.isArray(value) || typeof value !== 'object') return false;
  const candidate = value as Partial<JsonFormsUiSchema>;
  if (candidate.type !== 'Control' && candidate.type !== 'VerticalLayout') return false;
  if (candidate.label !== undefined && typeof candidate.label !== 'string' && candidate.label !== false) return false;
  if (candidate.scope !== undefined && typeof candidate.scope !== 'string') return false;
  if (candidate.elements !== undefined && !candidate.elements.every(isJsonFormsUiSchema)) return false;
  return true;
}

/** Copies a JSON value without retaining caller-owned mutable object references. */
export function cloneJson<Value extends JsonValue>(value: Value): Value {
  if (Array.isArray(value)) return value.map(cloneJson) as unknown as Value;
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, cloneJson(child)])) as Value;
  }
  return value;
}

/** Deep-freezes a JSON value before it is exposed in an event detail. */
export function freezeJson<Value extends JsonValue>(value: Value): Value {
  if (Array.isArray(value)) value.forEach(freezeJson);
  else if (value !== null && typeof value === 'object') Object.values(value).forEach(freezeJson);
  return Object.freeze(value);
}

/** Adds direct-property schema defaults without mutating the caller's data. */
export function applySchemaDefaults(schema: JsonSchema, data: JsonObject): JsonObject {
  const properties = schema.properties ?? {};
  const next: Record<string, JsonValue> = { ...cloneJson(data) };
  for (const [name, property] of Object.entries(properties)) {
    if (next[name] === undefined && property.default !== undefined) next[name] = cloneJson(property.default);
  }
  return next;
}

/** Reports unsupported schema and UI-schema features before rendering a misleading partial form. */
export function getJsonFormsConfigurationErrors(
  schema: JsonSchema,
  uischema: JsonFormsUiSchema | undefined,
): readonly JsonFormValidationError[] {
  const errors: JsonFormValidationError[] = [];
  if (schema.type !== 'object') {
    errors.push(configurationError('/type', 'type', 'The initial renderer requires a root schema with type "object".'));
  }
  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    const kind = getFieldKind(property);
    if (!kind) {
      errors.push(configurationError(
        `/properties/${escapeJsonPointer(name)}`,
        'unsupported',
        `Property "${name}" is not a supported direct string, number, integer, boolean, or string/number enum field.`,
      ));
    }
    if (property.format !== undefined && !supportedFormats.has(property.format)) {
      errors.push(configurationError(
        `/properties/${escapeJsonPointer(name)}/format`,
        'unsupported',
        `Property "${name}" uses unsupported format "${property.format}".`,
      ));
    }
  }
  if (uischema && uischema.type === 'Control') {
    errors.push(configurationError('/uischema/type', 'unsupported', 'The initial renderer accepts a VerticalLayout UI schema, not a root Control.'));
  }
  if (uischema?.type === 'VerticalLayout') {
    for (const control of uischema.elements ?? []) {
      if (control.type !== 'Control' || !parsePropertyScope(control.scope)) {
        errors.push(configurationError('/uischema/elements', 'unsupported', 'UI schemas may contain only direct-property Control elements.'));
      }
    }
  }
  return Object.freeze(errors);
}

/** Builds fields in JSON Forms UI-schema order, then appends unmentioned schema properties. */
export function getJsonFormFields(
  schema: JsonSchema,
  uischema: JsonFormsUiSchema | undefined,
): readonly JsonFormField[] {
  const layout = getFieldLayout(uischema);
  const properties = schema.properties ?? {};
  const names = [...layout.order, ...Object.keys(properties).filter((name) => !layout.order.includes(name))];
  const required = new Set(schema.required ?? []);
  const fields: JsonFormField[] = [];
  for (const name of names) {
    const property = properties[name];
    if (!property) continue;
    const kind = getFieldKind(property);
    if (!kind) continue;
    const layoutLabel = layout.labels.get(name);
    const label = layoutLabel === false ? humanize(name) : layoutLabel ?? property.title ?? humanize(name);
    const enumNames = layout.enumNames.get(name) ?? property.enumNames;
    const options = property.enum?.map((value, index) => ({
      value,
      label: enumNames?.[index] ?? String(value),
    })) ?? [];
    fields.push(Object.freeze({
      name,
      label,
      ...(property.description ? { description: property.description } : {}),
      kind,
      required: required.has(name),
      readOnly: property.readOnly === true,
      schema: property,
      options: Object.freeze(options),
    }));
  }
  return Object.freeze(fields);
}

/** Validates data with AJV and reports stable, serializable JSON Forms diagnostics. */
export function validateJsonFormData(
  schema: JsonSchema,
  data: JsonObject,
  uischema?: JsonFormsUiSchema,
): ValidationResult {
  const configurationErrors = getJsonFormsConfigurationErrors(schema, uischema);
  if (configurationErrors.length > 0) return Object.freeze({ errors: configurationErrors });
  try {
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    const validate = ajv.compile(schema as object) as ValidateFunction<JsonObject>;
    const valid = validate(data);
    return Object.freeze({
      errors: Object.freeze(valid ? [] : (validate.errors ?? []).map(toValidationError)),
    });
  } catch (error) {
    return Object.freeze({
      errors: Object.freeze([configurationError('', 'schema', error instanceof Error ? error.message : 'The schema could not be compiled.')]),
    });
  }
}

function getFieldKind(schema: JsonSchema): JsonFormField['kind'] | undefined {
  if (schema.enum !== undefined) {
    if (schema.enum.length === 0 || schema.enum.some((value) => typeof value !== 'string' && typeof value !== 'number')) return undefined;
    return 'select';
  }
  if (schema.type === 'string') return 'text';
  if (schema.type === 'number' || schema.type === 'integer') return 'number';
  if (schema.type === 'boolean') return 'boolean';
  return undefined;
}

function getFieldLayout(uischema: JsonFormsUiSchema | undefined): FieldLayout {
  const labels = new Map<string, string | false>();
  const enumNames = new Map<string, readonly string[]>();
  const order: string[] = [];
  if (uischema?.type !== 'VerticalLayout') return { labels, enumNames, order };
  for (const control of uischema.elements ?? []) {
    if (control.type !== 'Control') continue;
    const name = parsePropertyScope(control.scope);
    if (!name || order.includes(name)) continue;
    order.push(name);
    if (control.label !== undefined) labels.set(name, control.label);
    if (control.options?.enumNames) enumNames.set(name, control.options.enumNames);
  }
  return { labels, enumNames, order };
}

function parsePropertyScope(scope: string | undefined): string | undefined {
  const match = /^#\/properties\/([^/]+)$/.exec(scope ?? '');
  return match?.[1] ? unescapeJsonPointer(match[1]) : undefined;
}

function escapeJsonPointer(value: string): string {
  return value.replaceAll('~', '~0').replaceAll('/', '~1');
}

function unescapeJsonPointer(value: string): string {
  return value.replaceAll('~1', '/').replaceAll('~0', '~');
}

function humanize(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll(/[-_]/g, ' ')
    .replace(/^./, (character) => character.toUpperCase());
}

function configurationError(schemaPath: string, keyword: string, message: string): JsonFormValidationError {
  return Object.freeze({ instancePath: '', schemaPath, keyword, message });
}

function toValidationError(error: ErrorObject): JsonFormValidationError {
  const property = error.keyword === 'required' && typeof error.params.missingProperty === 'string'
    ? error.params.missingProperty
    : undefined;
  return Object.freeze({
    instancePath: error.instancePath,
    schemaPath: error.schemaPath,
    keyword: error.keyword,
    message: error.message ?? 'Invalid value.',
    ...(property ? { property } : {}),
  });
}
