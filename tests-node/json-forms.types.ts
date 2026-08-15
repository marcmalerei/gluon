import {
  JsonForm,
  JsonSchemaResolutionError,
  createJsonFormsMessageProvider,
  resolveJsonSchema,
  type JsonFormValidationError,
  type JsonFormsMessageOverrides,
  type JsonFormsMessageProvider,
  type JsonFormsMessageProviderOptions,
  type JsonSchema,
  type JsonSchemaResolutionOptions,
} from '@gluonjs/json-forms';

const schema = {
  type: 'object',
  properties: { quantity: { type: 'number', minimum: 1000 } },
} satisfies JsonSchema;
const messages = {
  itemLabel: (index: number, locale: string) => `${locale}: ${index}`,
  validationMessage: (
    error: JsonFormValidationError,
    _locale: string,
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string,
  ) => error.keyword === 'minimum' ? `At least ${formatNumber(Number(error.params?.limit))}` : undefined,
} satisfies JsonFormsMessageOverrides;
const options = { locale: 'de-DE', messages } satisfies JsonFormsMessageProviderOptions;
const provider: JsonFormsMessageProvider = createJsonFormsMessageProvider(options);
const view = JsonForm({ schema, data: { quantity: 1 }, messages: provider });

console.log(provider.locale, provider.formatNumber(1000), view);

const referencedSchema = { type: 'object', properties: { email: { $ref: '#/$defs/email' } }, $defs: { email: { type: 'string' } } } satisfies JsonSchema;
const resolutionOptions: JsonSchemaResolutionOptions = { maxDepth: 8, maxNodes: 64 };
const resolved: JsonSchema = resolveJsonSchema(referencedSchema, resolutionOptions);
const error: JsonSchemaResolutionError = new JsonSchemaResolutionError('ref-pointer', 'Invalid reference.');
void resolved;
void error.keyword;

// @ts-expect-error limits are numeric
resolveJsonSchema(referencedSchema, { maxDepth: '8' });
