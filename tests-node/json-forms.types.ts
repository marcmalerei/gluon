import {
  JsonForm,
  JsonSchemaResolutionError,
  createJsonFormsMessageProvider,
  resolveJsonSchema,
  createJsonFormsRendererRegistry,
  type JsonFormValidationError,
  type JsonFormsMessageOverrides,
  type JsonFormsMessageProvider,
  type JsonFormsMessageProviderOptions,
  type JsonFormsRendererContext,
  type JsonFormsRendererRegistration,
  type JsonFormsRendererSelector,
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
const selector = { kind: 'number', path: ['quantity'] } satisfies JsonFormsRendererSelector;
const renderer = {
  id: 'quantity-output',
  selector,
  priority: 1,
  render(context: JsonFormsRendererContext) {
    context.control.commit(typeof context.value === 'number' ? context.value + 1 : 1);
    return String(context.value ?? '');
  },
} satisfies JsonFormsRendererRegistration;
const rendererRegistry = createJsonFormsRendererRegistry([renderer]);
const view = JsonForm({ schema, data: { quantity: 1 }, messages: provider, rendererRegistry });

console.log(provider.locale, provider.formatNumber(1000), view);

const referencedSchema = { type: 'object', properties: { email: { $ref: '#/$defs/email' } }, $defs: { email: { type: 'string' } } } satisfies JsonSchema;
const resolutionOptions: JsonSchemaResolutionOptions = { maxDepth: 8, maxNodes: 64 };
const resolved: JsonSchema = resolveJsonSchema(referencedSchema, resolutionOptions);
const error: JsonSchemaResolutionError = new JsonSchemaResolutionError('ref-pointer', 'Invalid reference.');
void resolved;
void error.keyword;

// @ts-expect-error limits are numeric
resolveJsonSchema(referencedSchema, { maxDepth: '8' });

// @ts-expect-error renderer selectors accept only supported field kinds
createJsonFormsRendererRegistry([{ id: 'invalid', selector: { kind: 'remote' }, render: () => '' }]);

console.log(rendererRegistry.registrations);
