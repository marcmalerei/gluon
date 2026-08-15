import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

/** A JSON object accepted as `data` by {@link JsonFormsElement}. */
export interface JsonObject {
  readonly [key: string]: JsonValue;
}

/** A JSON value accepted by the JSON Forms component. */
export type JsonValue = string | number | boolean | null | JsonObject | readonly JsonValue[];

/** The supported JSON Schema subset rendered by the JSON Forms component. */
export interface JsonSchema {
  readonly type?: string | readonly string[];
  readonly title?: string;
  readonly description?: string;
  readonly default?: JsonValue;
  readonly properties?: Readonly<Record<string, JsonSchema>>;
  readonly items?: JsonSchema;
  readonly required?: readonly string[];
  readonly enum?: readonly (string | number)[];
  readonly enumNames?: readonly string[];
  readonly format?: string;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly minItems?: number;
  readonly maxItems?: number;
  readonly readOnly?: boolean;
  readonly additionalProperties?: boolean;
  readonly $ref?: string;
  readonly oneOf?: readonly JsonSchema[];
  readonly anyOf?: readonly JsonSchema[];
  readonly allOf?: readonly JsonSchema[];
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
  /** Immutable AJV keyword parameters available to message formatters. */
  readonly params?: Readonly<Record<string, unknown>>;
}

/** Typed locale-aware messages used by the JSON Forms infrastructure copy. */
export interface JsonFormsMessageProvider {
  readonly locale: string;
  rootLabel(): string;
  itemLabel(index: number): string;
  addItemLabel(): string;
  removeItemLabel(index: number): string;
  selectPlaceholder(required: boolean): string;
  validationMessage(error: JsonFormValidationError): string;
  configurationMessage(error: JsonFormValidationError): string;
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string;
}

/** Partial overrides accepted by {@link createJsonFormsMessageProvider}. */
export interface JsonFormsMessageOverrides {
  readonly rootLabel?: string;
  readonly itemLabel?: (index: number, locale: string) => string | null | undefined;
  readonly addItemLabel?: string;
  readonly removeItemLabel?: (index: number, locale: string) => string | null | undefined;
  readonly selectPlaceholder?: (required: boolean, locale: string) => string | null | undefined;
  readonly validationMessage?: (error: JsonFormValidationError, locale: string, formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string) => string | null | undefined;
  readonly configurationMessage?: (error: JsonFormValidationError, locale: string, formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string) => string | null | undefined;
}

/** Options for creating a synchronous locale-aware JSON Forms message provider. */
export interface JsonFormsMessageProviderOptions {
  readonly locale?: string;
  readonly messages?: JsonFormsMessageOverrides;
}

/** A rendered direct property of a supported root-object schema. */
export interface JsonFormField {
  readonly name: string;
  readonly path: readonly string[];
  readonly label: string;
  readonly description?: string;
  readonly kind: 'text' | 'number' | 'boolean' | 'select' | 'object' | 'array';
  readonly required: boolean;
  readonly readOnly: boolean;
  readonly schema: JsonSchema;
  readonly options: readonly {
    readonly label: string;
    readonly value: string | number;
  }[];
  readonly children?: readonly JsonFormField[];
  readonly item?: JsonFormField;
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
const defaultJsonFormsMessages = Object.freeze({
  rootLabel: 'Schema form',
  addItemLabel: 'Add item',
  itemLabel: (index: number, locale: string) => `Item ${formatLocalizedNumber(index, locale)}`,
  removeItemLabel: (index: number, locale: string) => `Remove item ${formatLocalizedNumber(index, locale)}`,
  selectPlaceholder: (required: boolean) => required ? 'Select an option' : 'No selection',
  validationMessage: (error: JsonFormValidationError, locale: string, formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string) => defaultValidationMessage(error, locale, formatNumber),
  configurationMessage: (error: JsonFormValidationError, locale: string, formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string) => defaultConfigurationMessage(error, locale, formatNumber),
} satisfies Required<JsonFormsMessageOverrides>);

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
  if (candidate.elements !== undefined
    && (!Array.isArray(candidate.elements) || !candidate.elements.every(isJsonFormsUiSchema))) return false;
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

/** Creates a synchronous message provider with built-in English fallbacks. */
export function createJsonFormsMessageProvider(options: JsonFormsMessageProviderOptions = {}): JsonFormsMessageProvider {
  if (!isJsonFormsMessageProviderOptions(options)) {
    throw new TypeError('JSON Forms message provider options require a locale string and known string or formatter overrides.');
  }
  const locale = options.locale ?? 'en';
  const overrides = options.messages ?? {};
  const formatNumber = (value: number, numberOptions?: Intl.NumberFormatOptions): string => (
    new Intl.NumberFormat(locale, numberOptions).format(value)
  );
  return Object.freeze({
    locale,
    rootLabel: () => overrides.rootLabel ?? defaultJsonFormsMessages.rootLabel,
    itemLabel: (index: number) => overrides.itemLabel?.(index, locale) ?? defaultJsonFormsMessages.itemLabel(index, locale),
    addItemLabel: () => overrides.addItemLabel ?? defaultJsonFormsMessages.addItemLabel,
    removeItemLabel: (index: number) => overrides.removeItemLabel?.(index, locale) ?? defaultJsonFormsMessages.removeItemLabel(index, locale),
    selectPlaceholder: (required: boolean) => overrides.selectPlaceholder?.(required, locale) ?? defaultJsonFormsMessages.selectPlaceholder(required),
    validationMessage: (error: JsonFormValidationError) => overrides.validationMessage?.(error, locale, formatNumber) ?? defaultJsonFormsMessages.validationMessage(error, locale, formatNumber),
    configurationMessage: (error: JsonFormValidationError) => overrides.configurationMessage?.(error, locale, formatNumber) ?? defaultJsonFormsMessages.configurationMessage(error, locale, formatNumber),
    formatNumber,
  });
}

export function isJsonFormsMessageProvider(value: unknown): value is JsonFormsMessageProvider {
  if (!isRecord(value)) return false;
  return typeof value.locale === 'string'
    && typeof value.rootLabel === 'function'
    && typeof value.itemLabel === 'function'
    && typeof value.addItemLabel === 'function'
    && typeof value.removeItemLabel === 'function'
    && typeof value.selectPlaceholder === 'function'
    && typeof value.validationMessage === 'function'
    && typeof value.configurationMessage === 'function'
    && typeof value.formatNumber === 'function';
}

export function isJsonFormsMessageProviderOptions(value: unknown): value is JsonFormsMessageProviderOptions {
  if (!isRecord(value) || (value.locale !== undefined && (typeof value.locale !== 'string' || value.locale.trim() === ''))) return false;
  if (!Object.keys(value).every((key) => key === 'locale' || key === 'messages')) return false;
  if (value.messages === undefined) return true;
  if (!isRecord(value.messages)) return false;
  const expected = {
    rootLabel: 'string',
    itemLabel: 'function',
    addItemLabel: 'string',
    removeItemLabel: 'function',
    selectPlaceholder: 'function',
    validationMessage: 'function',
    configurationMessage: 'function',
  } as const;
  return Object.entries(value.messages).every(([key, entry]) => key in expected && typeof entry === expected[key as keyof typeof expected]);
}

/** Deep-freezes a JSON value before it is exposed in an event detail. */
export function freezeJson<Value extends JsonValue>(value: Value): Value {
  if (Array.isArray(value)) value.forEach(freezeJson);
  else if (value !== null && typeof value === 'object') Object.values(value).forEach(freezeJson);
  return Object.freeze(value);
}

/** Adds object-property schema defaults without mutating caller-owned data. */
export function applySchemaDefaults(schema: JsonSchema, data: JsonObject): JsonObject {
  const properties = schema.properties ?? {};
  const next: Record<string, JsonValue> = { ...cloneJson(data) };
  for (const [name, property] of Object.entries(properties)) {
    if (next[name] === undefined && property.default !== undefined) next[name] = cloneJson(property.default);
    else if (property.type === 'object' && isJsonObject(next[name])) next[name] = applySchemaDefaults(property, next[name]);
    else if (property.type === 'array' && property.items?.type === 'object' && Array.isArray(next[name])) {
      next[name] = next[name].map((item) => isJsonObject(item) ? applySchemaDefaults(property.items!, item) : item);
    }
  }
  return next;
}

/** Reports unsupported schema and UI-schema features before rendering a misleading partial form. */
export function getJsonFormsConfigurationErrors(
  schema: JsonSchema,
  uischema: JsonFormsUiSchema | undefined,
  messages: JsonFormsMessageProvider = createJsonFormsMessageProvider(),
): readonly JsonFormValidationError[] {
  const errors: JsonFormValidationError[] = [];
  if (schema.type !== 'object') {
    errors.push(configurationError('/type', 'type', messages.configurationMessage({
      instancePath: '',
      schemaPath: '/type',
      keyword: 'type',
      message: 'The initial renderer requires a root schema with type "object".',
    })));
  }
  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    validateSchemaNode(property, ['properties', escapeJsonPointer(name)], errors, name, messages);
  }
  if (uischema && uischema.type === 'Control') {
    errors.push(configurationError('/uischema/type', 'unsupported', messages.configurationMessage({
      instancePath: '',
      schemaPath: '/uischema/type',
      keyword: 'unsupported',
      message: 'The renderer accepts a VerticalLayout UI schema, not a root Control.',
    })));
  }
  if (uischema?.type === 'VerticalLayout') {
    for (const control of uischema.elements ?? []) {
      if (control.type !== 'Control' || !parsePropertyScope(control.scope)) {
        errors.push(configurationError('/uischema/elements', 'unsupported', messages.configurationMessage({
          instancePath: '',
          schemaPath: '/uischema/elements',
          keyword: 'unsupported',
          message: 'UI schemas may contain only Control elements with property scopes.',
        })));
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
  return Object.freeze(buildFields(schema, names, [], layout));
}

/** Validates data with AJV and reports stable, serializable JSON Forms diagnostics. */
export function validateJsonFormData(
  schema: JsonSchema,
  data: JsonObject,
  uischema?: JsonFormsUiSchema,
  messages: JsonFormsMessageProvider = createJsonFormsMessageProvider(),
): ValidationResult {
  const configurationErrors = getJsonFormsConfigurationErrors(schema, uischema, messages);
  if (configurationErrors.length > 0) return Object.freeze({ errors: configurationErrors });
  try {
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    const validate = ajv.compile(schema as object) as ValidateFunction<JsonObject>;
    const valid = validate(data);
    return Object.freeze({
      errors: Object.freeze(valid ? [] : (validate.errors ?? []).map((error) => toValidationError(error, messages))),
    });
  } catch (error) {
    return Object.freeze({
      errors: Object.freeze([configurationError('', 'schema', messages.configurationMessage({
        instancePath: '',
        schemaPath: '',
        keyword: 'schema',
        message: error instanceof Error ? error.message : 'The schema could not be compiled.',
      }))]),
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
  if (schema.type === 'object') return 'object';
  if (schema.type === 'array') return 'array';
  return undefined;
}

function getFieldLayout(uischema: JsonFormsUiSchema | undefined): FieldLayout {
  const labels = new Map<string, string | false>();
  const enumNames = new Map<string, readonly string[]>();
  const order: string[] = [];
  if (uischema?.type !== 'VerticalLayout') return { labels, enumNames, order };
  for (const control of uischema.elements ?? []) {
    if (control.type !== 'Control') continue;
    const path = parsePropertyScope(control.scope);
    if (!path) continue;
    const key = pathKey(path);
    if (path.length === 1 && !order.includes(path[0]!)) order.push(path[0]!);
    if (control.label !== undefined) labels.set(key, control.label);
    if (control.options?.enumNames) enumNames.set(key, control.options.enumNames);
  }
  return { labels, enumNames, order };
}

function parsePropertyScope(scope: string | undefined): readonly string[] | undefined {
  if (!/^#\/properties\/[^/]+(?:\/properties\/[^/]+)*$/.test(scope ?? '')) return undefined;
  const tokens = (scope ?? '').slice(2).split('/');
  const segments = tokens.filter((_, index) => index % 2 === 1).map(unescapeJsonPointer);
  return segments.length > 0 ? segments : undefined;
}

function buildFields(
  schema: JsonSchema,
  names: readonly string[],
  parentPath: readonly string[],
  layout: FieldLayout,
): readonly JsonFormField[] {
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  return names.flatMap((name) => {
    const property = properties[name];
    if (!property) return [];
    return [buildField(name, property, [...parentPath, name], required.has(name), layout)];
  });
}

function buildField(
  name: string,
  schema: JsonSchema,
  path: readonly string[],
  required: boolean,
  layout: FieldLayout,
): JsonFormField {
  const kind = getFieldKind(schema) ?? 'text';
  const key = pathKey(path);
  const layoutLabel = layout.labels.get(key);
  const label = layoutLabel === false ? humanize(name) : layoutLabel ?? schema.title ?? humanize(name);
  const enumNames = layout.enumNames.get(key) ?? schema.enumNames;
  const options = schema.enum?.map((value, index) => ({ value, label: enumNames?.[index] ?? String(value) })) ?? [];
  const field: JsonFormField = {
    name,
    path: Object.freeze([...path]),
    label,
    ...(schema.description ? { description: schema.description } : {}),
    kind,
    required,
    readOnly: schema.readOnly === true,
    schema,
    options: Object.freeze(options),
  };
  if (kind === 'object') {
    const children = Object.keys(schema.properties ?? {});
    return Object.freeze({ ...field, children: Object.freeze(buildFields(schema, children, path, layout)) });
  }
  if (kind === 'array' && schema.items) {
    return Object.freeze({ ...field, item: buildField('item', schema.items, [], false, layout) });
  }
  return Object.freeze(field);
}

function validateSchemaNode(
  schema: JsonSchema,
  schemaPath: readonly string[],
  errors: JsonFormValidationError[],
  label: string,
  messages: JsonFormsMessageProvider,
): void {
  const unsupportedKeywords = ['\$ref', 'oneOf', 'anyOf', 'allOf', 'not', 'if', 'then', 'else', 'patternProperties', 'dependencies', 'dependentSchemas', 'contains'];
  for (const keyword of unsupportedKeywords) {
    if (keyword in schema) {
      errors.push(configurationError(`/${schemaPath.join('/')}/${keyword}`, 'unsupported', messages.configurationMessage({
        instancePath: '',
        schemaPath: `/${schemaPath.join('/')}/${keyword}`,
        keyword: 'unsupported',
        message: `Property "${label}" uses unsupported schema keyword "${keyword}".`,
      })));
    }
  }
  const kind = getFieldKind(schema);
  if (!kind) {
    errors.push(configurationError(`/${schemaPath.join('/')}`, 'unsupported', messages.configurationMessage({
      instancePath: '',
      schemaPath: `/${schemaPath.join('/')}`,
      keyword: 'unsupported',
      message: `Property "${label}" is not a supported string, number, integer, boolean, object, array, or enum field.`,
    })));
    return;
  }
  if (schema.format !== undefined && !supportedFormats.has(schema.format)) {
    errors.push(configurationError(`/${schemaPath.join('/')}/format`, 'unsupported', messages.configurationMessage({
      instancePath: '',
      schemaPath: `/${schemaPath.join('/')}/format`,
      keyword: 'unsupported',
      message: `Property "${label}" uses unsupported format "${schema.format}".`,
    })));
  }
  if (kind === 'object') {
    for (const [name, child] of Object.entries(schema.properties ?? {})) {
      validateSchemaNode(child, [...schemaPath, 'properties', escapeJsonPointer(name)], errors, `${label}.${name}`, messages);
    }
  }
  if (kind === 'array') {
    if (!schema.items) errors.push(configurationError(`/${schemaPath.join('/')}/items`, 'unsupported', messages.configurationMessage({
      instancePath: '',
      schemaPath: `/${schemaPath.join('/')}/items`,
      keyword: 'unsupported',
      message: `Array property "${label}" must declare supported items.`,
    })));
    else if (getFieldKind(schema.items) === 'array') errors.push(configurationError(`/${schemaPath.join('/')}/items`, 'unsupported', messages.configurationMessage({
      instancePath: '',
      schemaPath: `/${schemaPath.join('/')}/items`,
      keyword: 'unsupported',
      message: `Nested arrays are not supported for "${label}".`,
    })));
    else validateSchemaNode(schema.items, [...schemaPath, 'items'], errors, `${label} item`, messages);
  }
}

function pathKey(path: readonly string[]): string { return path.join('.'); }

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

function toValidationError(error: ErrorObject, messages: JsonFormsMessageProvider): JsonFormValidationError {
  const property = error.keyword === 'required' && typeof error.params.missingProperty === 'string'
    ? error.params.missingProperty
    : undefined;
  const source = {
    instancePath: error.instancePath,
    schemaPath: error.schemaPath,
    keyword: error.keyword,
    message: error.message ?? 'Invalid value.',
    ...(property ? { property } : {}),
    params: Object.freeze({ ...error.params }),
  } satisfies JsonFormValidationError;
  const message = messages.validationMessage(source);
  return Object.freeze({
    ...source,
    message,
  });
}

function defaultValidationMessage(
  error: JsonFormValidationError,
  _locale: string,
  _formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string,
): string {
  return error.message || 'Invalid value.';
}

function defaultConfigurationMessage(
  error: JsonFormValidationError,
  _locale: string,
  _formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string,
): string {
  return error.message || 'The schema could not be compiled.';
}

function formatLocalizedNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
