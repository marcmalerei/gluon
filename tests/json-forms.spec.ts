import { beforeEach, describe, expect, it } from 'vitest';
import axe, { type Result } from 'axe-core';
import { html, render } from '../src/index.js';
import {
  JsonForm,
  JsonFormsElement,
  createJsonFormsRendererRegistry,
  jsonFormsTag,
  registerJsonForms,
  type JsonFormChangeDetail,
  type JsonFormValidationChangeDetail,
  type JsonObject,
  type JsonFormsRendererContext,
  type JsonSchema,
} from '../packages/json-forms/src/index.js';
import {
  applySchemaDefaults,
  cloneJson,
  createJsonFormsMessageProvider,
  freezeJson,
  getJsonFormFields,
  getJsonFormsConfigurationErrors,
  isJsonFormsUiSchema,
  isJsonObject,
  isJsonSchema,
  validateJsonFormData,
  resolveJsonSchema,
} from '../packages/json-forms/src/schema.js';

registerJsonForms();

const bookingSchema = {
  type: 'object',
  title: 'Delivery preference',
  description: 'Tell GLUON GOODS how to prepare the delivery.',
  properties: {
    email: { type: 'string', title: 'Email address', format: 'email' },
    units: { type: 'integer', title: 'Units', minimum: 1, default: 1 },
    delivery: {
      type: 'string',
      enum: ['morning', 'afternoon'],
      enumNames: ['Morning', 'Afternoon'],
    },
    giftWrap: { type: 'boolean', title: 'Add gift wrap', default: false },
  },
  required: ['email', 'delivery'],
} satisfies JsonSchema;

function createForm(
  schema: JsonSchema = bookingSchema,
  data: JsonObject = {},
): JsonFormsElement {
  const element = document.createElement(jsonFormsTag) as JsonFormsElement;
  element.schema = schema;
  element.data = data;
  document.body.append(element);
  return element;
}

async function settled(element: JsonFormsElement): Promise<void> {
  await element.updateComplete;
}

describe('JSON Forms component', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('renders a labeled native field for each supported direct property and honors a VerticalLayout UI schema', async () => {
    const element = createForm(bookingSchema, { email: 'hello@example.test', delivery: 'afternoon' });
    element.uischema = {
      type: 'VerticalLayout',
      elements: [
        { type: 'Control', scope: '#/properties/delivery', label: 'Preferred arrival' },
        { type: 'Control', scope: '#/properties/email' },
      ],
    };
    await settled(element);

    const fields = element.shadowRoot!.querySelectorAll('input, select');
    expect(fields).toHaveLength(4);
    expect(element.shadowRoot!.querySelector('h2')?.textContent).toBe('Delivery preference');
    expect(element.shadowRoot!.querySelector('label[for="field-delivery"]')?.textContent).toContain('Preferred arrival');
    expect((element.shadowRoot!.querySelector('#field-delivery') as HTMLSelectElement).value).toBe('1');
    expect((element.shadowRoot!.querySelector('#field-units') as HTMLInputElement).value).toBe('1');
    expect((element.data as Record<string, unknown>).units).toBe(1);
    expect((element.data as Record<string, unknown>).giftWrap).toBe(false);
  });

  it('selects custom renderers deterministically and keeps mutation, validation, and form events host-owned', async () => {
    let latestContext: JsonFormsRendererContext | undefined;
    const registry = createJsonFormsRendererRegistry([{
      id: 'quantity-stepper',
      selector: { kind: 'number', path: ['units'] },
      priority: 10,
      render: (context) => {
        latestContext = context;
        const value = typeof context.value === 'number' ? context.value : 0;
        return html`
          <div data-quantity-stepper>
            <button
              type="button"
              aria-label="Decrease units"
              ?disabled=${context.disabled || context.readOnly}
              @click=${() => context.control.commit(value - 1)}
            >−</button>
            <output
              id=${context.control.id}
              aria-labelledby=${context.control.labelId}
              aria-describedby=${context.control.describedBy}
            >${value}</output>
            <button
              type="button"
              aria-label="Increase units"
              ?disabled=${context.disabled || context.readOnly}
              @click=${() => context.control.commit(value + 1)}
            >+</button>
          </div>
        `;
      },
    }]);
    const outerForm = document.createElement('form');
    const element = document.createElement(jsonFormsTag) as JsonFormsElement;
    element.name = 'booking';
    element.schema = bookingSchema;
    element.uischema = {
      type: 'VerticalLayout',
      elements: [{ type: 'Control', scope: '#/properties/units', label: 'Order units' }],
    };
    element.data = { email: 'hello@example.test', delivery: 'morning', units: 1 };
    element.rendererRegistry = registry;
    const changes: JsonFormChangeDetail[] = [];
    element.addEventListener('change', (event) => changes.push((event as CustomEvent<JsonFormChangeDetail>).detail));
    outerForm.append(element);
    document.body.append(outerForm);
    await settled(element);

    const customField = element.shadowRoot!.querySelector('[data-gluon-json-renderer="quantity-stepper"]')!;
    expect(customField.getAttribute('role')).toBe('group');
    expect(customField.querySelector('[data-quantity-stepper]')).toBeTruthy();
    expect(customField.querySelector('.field-label')?.textContent).toContain('Order units');
    expect(element.shadowRoot!.querySelector('#field-email')).toBeInstanceOf(HTMLInputElement);
    expect(latestContext?.path).toEqual(['units']);
    expect(latestContext?.schema).toEqual(bookingSchema.properties.units);
    expect(latestContext?.schema).not.toBe(bookingSchema.properties.units);
    expect(Object.isFrozen(latestContext?.schema)).toBe(true);
    expect(latestContext?.uiSchema?.scope).toBe('#/properties/units');
    expect(latestContext?.rootUiSchema).toBe(element.uischema);
    expect(latestContext?.data).toBe(element.data);
    expect(Object.isFrozen(latestContext?.data)).toBe(true);
    expect(Object.isFrozen(latestContext?.control)).toBe(true);
    const accessibility = await axe.run(outerForm, {
      resultTypes: ['violations'],
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
    });
    expect(accessibility.violations, formatViolations(accessibility.violations)).toEqual([]);

    customField.querySelector<HTMLButtonElement>('[aria-label="Decrease units"]')!.click();
    await settled(element);
    expect(element.data.units).toBe(0);
    expect(element.errors.some((error) => error.keyword === 'minimum')).toBe(true);
    expect(changes).toHaveLength(1);
    expect(changes[0]?.data.units).toBe(0);
    expect(new FormData(outerForm).get('booking')).toBe(JSON.stringify(element.data));
    expect(() => latestContext!.control.commit({ invalid: (() => undefined) as never })).toThrow('JSON-compatible');

    element.readOnly = true;
    await settled(element);
    const disabledIncrease = element.shadowRoot!.querySelector<HTMLButtonElement>('[aria-label="Increase units"]')!;
    expect(disabledIncrease.disabled).toBe(true);
    latestContext!.control.commit(2);
    expect(element.data.units).toBe(0);

    element.readOnly = false;
    element.formStateRestoreCallback(JSON.stringify({ email: 'restored@example.test', delivery: 'afternoon', units: 3 }));
    await settled(element);
    expect(element.shadowRoot!.querySelector('output')?.textContent).toBe('3');
    outerForm.reset();
    await settled(element);
    expect(element.data.units).toBe(1);
  });

  it('rejects unsupported or ambiguous renderer registrations and resolves explicit priority', async () => {
    const renderText = (context: JsonFormsRendererContext) => html`<span>${String(context.value ?? '')}</span>`;
    expect(() => createJsonFormsRendererRegistry(null as never)).toThrow('must be an array');
    expect(() => createJsonFormsRendererRegistry([null as never])).toThrow('must be an object');
    expect(() => createJsonFormsRendererRegistry([{
      id: 'bad id', selector: { kind: 'number' }, render: renderText,
    }])).toThrow('stable id');
    expect(() => createJsonFormsRendererRegistry([{
      id: 'missing-render', selector: { kind: 'number' }, render: undefined as never,
    }])).toThrow('render function');
    expect(() => createJsonFormsRendererRegistry([{
      id: 'duplicate', selector: { kind: 'text' }, render: renderText,
    }, {
      id: 'duplicate', selector: { kind: 'number' }, render: renderText,
    }])).toThrow('registered more than once');
    expect(() => createJsonFormsRendererRegistry([{
      id: 'generic', selector: { kind: 'number' }, render: renderText,
    }, {
      id: 'specific', selector: { kind: 'number', path: ['units'] }, render: renderText,
    }])).toThrow('overlap at priority 0');
    expect(() => createJsonFormsRendererRegistry([{
      id: 'bad-kind', selector: { kind: 'unsupported' as never }, render: renderText,
    }])).toThrow('supported field kind');
    expect(() => createJsonFormsRendererRegistry([{
      id: 'empty-kinds', selector: { kind: [] }, render: renderText,
    }])).toThrow('supported field kind');
    expect(() => createJsonFormsRendererRegistry([{
      id: 'bad-schema-type', selector: { kind: 'number', schemaType: 'null' as never }, render: renderText,
    }])).toThrow('unsupported schemaType');
    expect(() => createJsonFormsRendererRegistry([{
      id: 'bad-format', selector: { kind: 'number', format: ' ' }, render: renderText,
    }])).toThrow('non-empty string');
    expect(() => createJsonFormsRendererRegistry([{
      id: 'bad-path', selector: { kind: 'number', path: [''] }, render: renderText,
    }])).toThrow('non-empty string segments');
    expect(() => createJsonFormsRendererRegistry([{
      id: 'bad-selector', selector: { kind: 'number', request: true } as never, render: renderText,
    }])).toThrow('supported declarative selector');
    expect(() => createJsonFormsRendererRegistry([{
      id: 'bad-priority', selector: { kind: 'number' }, priority: 0.5, render: renderText,
    }])).toThrow('safe integer');
    expect(() => createJsonFormsRendererRegistry([{
      id: 'unknown-key', selector: { kind: 'number' }, render: renderText, remote: true,
    } as never])).toThrow('unsupported property');

    const registry = createJsonFormsRendererRegistry([{
      id: 'generic', selector: { kind: 'number' }, render: () => html`<span>generic</span>`,
    }, {
      id: 'specific', selector: { kind: 'number', path: ['units'] }, priority: 1, render: () => html`<span>specific</span>`,
    }]);
    const element = createForm();
    element.rendererRegistry = registry;
    await settled(element);
    expect(element.shadowRoot!.querySelector('[data-gluon-json-renderer="specific"]')?.textContent).toContain('specific');
    expect(element.shadowRoot!.querySelector('[data-gluon-json-renderer="generic"]')).toBeNull();
  });

  it('emits frozen data and validation diagnostics as people edit native fields', async () => {
    const element = createForm();
    const changes: JsonFormChangeDetail[] = [];
    const validationChanges: JsonFormValidationChangeDetail[] = [];
    element.addEventListener('change', (event) => changes.push((event as CustomEvent<JsonFormChangeDetail>).detail));
    element.addEventListener('validation-change', (event) => validationChanges.push((event as CustomEvent<JsonFormValidationChangeDetail>).detail));
    await settled(element);

    const email = element.shadowRoot!.querySelector('#field-email') as HTMLInputElement;
    email.value = 'not-an-email';
    email.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    await settled(element);

    expect(changes.at(-1)?.data).toEqual({ giftWrap: false, units: 1, email: 'not-an-email' });
    expect(Object.isFrozen(changes.at(-1)!.data)).toBe(true);
    expect(changes.at(-1)?.errors.some((error) => error.keyword === 'format')).toBe(true);
    expect(email.getAttribute('aria-invalid')).toBe('true');

    email.value = 'hello@example.test';
    email.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    const delivery = element.shadowRoot!.querySelector('#field-delivery') as HTMLSelectElement;
    delivery.value = '0';
    delivery.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await settled(element);

    expect(element.errors).toEqual([]);
    expect(validationChanges.some(({ valid }) => valid)).toBe(true);
  });

  it('participates in native forms and restores its initial and persisted JSON data', async () => {
    const outerForm = document.createElement('form');
    const element = document.createElement(jsonFormsTag) as JsonFormsElement;
    element.name = 'delivery';
    element.schema = bookingSchema;
    element.data = { email: 'initial@example.test', delivery: 'morning' };
    outerForm.append(element);
    document.body.append(outerForm);
    await settled(element);

    expect(new FormData(outerForm).get('delivery')).toBe(JSON.stringify({
      email: 'initial@example.test', delivery: 'morning', units: 1, giftWrap: false,
    }));
    expect(element.checkValidity()).toBe(true);

    const email = element.shadowRoot!.querySelector('#field-email') as HTMLInputElement;
    email.value = 'changed@example.test';
    email.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    await settled(element);
    outerForm.reset();
    await settled(element);
    expect(element.data).toMatchObject({ email: 'initial@example.test', delivery: 'morning' });

    element.formStateRestoreCallback(JSON.stringify({ email: 'restored@example.test', delivery: 'afternoon' }));
    await settled(element);
    expect(element.data).toEqual({ email: 'restored@example.test', delivery: 'afternoon' });
  });

  it('renders and validates an RFC 6901 local ref in a real browser', async () => {
    const element = createForm({
      type: 'object',
      properties: {
        address: { $ref: '#/$defs/address~1line' },
      },
      $defs: { 'address/line': { type: 'string', title: 'Address line', minLength: 3 } },
    } as JsonSchema);
    await settled(element);

    const address = element.shadowRoot!.querySelector('#field-address') as HTMLInputElement;
    expect(address.labels?.[0]?.textContent).toContain('Address line');
    address.value = 'x';
    address.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    await settled(element);
    expect(element.errors.some(({ keyword }) => keyword === 'minLength')).toBe(true);
    expect(address.getAttribute('aria-invalid')).toBe('true');
  });

  it('reports stable adversarial reference diagnostics', () => {
    const cases: [JsonSchema, string][] = [
      [{ type: 'object', properties: { x: { $ref: 'https://example.test/schema' } } }, 'ref-remote'],
      [{ type: 'object', properties: { x: { $ref: '#anchor' } } }, 'ref-pointer'],
      [{ type: 'object', properties: { x: { $ref: '#/properties/x' } } }, 'ref-pointer'],
      [{ type: 'object', properties: { x: { $ref: '#/$defs/a~2b' } } }, 'ref-pointer'],
      [{ type: 'object', properties: { x: { $ref: '#/$defs/%E0%A4%A' } } }, 'ref-pointer'],
      [{ type: 'object', properties: { x: { $ref: '#/$defs/value' } }, $defs: { value: 'text' as unknown as JsonSchema } }, 'ref-target'],
      [{ type: 'object', properties: { x: null as unknown as JsonSchema } }, 'ref-target'],
      [{ type: 'object', properties: { x: { $ref: 3 as unknown as string } } }, 'ref-pointer'],
      [{ type: 'object', properties: { x: { $ref: '#/$defs/missing' } } }, 'ref-pointer'],
      [{ type: 'object', properties: { x: { $ref: '#/$defs/a' } }, $defs: { a: { $ref: '#/$defs/b' }, b: { $ref: '#/$defs/a' } } }, 'ref-cycle'],
    ];
    for (const [schema, keyword] of cases) expect(validateJsonFormData(schema, {}).errors[0]?.keyword).toBe(keyword);
    expect(() => resolveJsonSchema(
      { type: 'object', properties: { x: { $ref: '#/$defs/a' } }, $defs: { a: { $ref: '#/$defs/b' }, b: { type: 'string' } } },
      { maxDepth: 1 },
    )).toThrowError(expect.objectContaining({ keyword: 'ref-depth' }));
    expect(() => resolveJsonSchema(
      { type: 'object', properties: { x: { $ref: '#/$defs/a' } }, $defs: { a: { type: 'string' } } },
      { maxNodes: 2 },
    )).toThrowError(expect.objectContaining({ keyword: 'ref-budget' }));
    expect(() => resolveJsonSchema({ type: 'object' }, { maxNodes: 0 })).toThrowError(
      expect.objectContaining({ keyword: 'ref-budget' }),
    );
    expect(resolveJsonSchema({ type: 'object', oneOf: [{ type: 'object' }] }).oneOf).toHaveLength(1);
    expect(getJsonFormsConfigurationErrors({ type: 'object', properties: { unsupported: {} } }, undefined)[0]?.keyword).toBe('unsupported');
  });

  it('renders reference failures as stable configuration diagnostics', async () => {
    const element = createForm({
      type: 'object',
      properties: { address: { $ref: 'https://example.test/address.json' } },
    });
    await settled(element);

    expect(element.errors).toEqual([expect.objectContaining({ keyword: 'ref-remote' })]);
    expect(element.shadowRoot!.querySelector('[part="configuration-error"]')?.textContent).toContain('Remote JSON Schema references are not supported');
    expect(element.checkValidity()).toBe(false);
  });

  it('returns a deterministic deeply immutable local-ref overlay', () => {
    const schema = {
      type: 'object',
      required: ['escaped'],
      properties: {
        escaped: { $ref: '#/$defs/a~01', type: 'number', default: { labels: ['kept'] } },
        legacy: { $ref: '#/definitions/contact' },
      },
      $defs: { 'a~1': { type: 'string', title: 'Target title' } },
      definitions: { contact: { type: 'string' } },
    } satisfies JsonSchema;
    const resolved = resolveJsonSchema(schema);

    expect(resolved.properties?.escaped).toMatchObject({ type: 'number', title: 'Target title' });
    expect(resolved.properties?.legacy?.type).toBe('string');
    expect(Object.isFrozen(resolved)).toBe(true);
    expect(Object.isFrozen(resolved.required)).toBe(true);
    expect(Object.isFrozen(resolved.properties?.escaped?.default)).toBe(true);
    expect(Object.isFrozen((resolved.properties?.escaped?.default as { labels: readonly string[] }).labels)).toBe(true);
    expect(JSON.stringify(schema)).toContain('"$ref"');
    expect(JSON.stringify(resolveJsonSchema(schema))).toBe(JSON.stringify(resolved));
  });

  it('renders nested objects and bounded arrays with immutable path updates', async () => {
    const element = createForm({
      type: 'object',
      properties: {
        recipient: {
          type: 'object',
          title: 'Recipient details',
          properties: {
            name: { type: 'string', title: 'Recipient name' },
            city: { type: 'string', title: 'Delivery city' },
          },
          required: ['name'],
        },
        channels: {
          type: 'array',
          title: 'Backup channels',
          items: { type: 'string', enum: ['email', 'sms'] },
          maxItems: 2,
        },
      },
    } as JsonSchema);
    element.data = { recipient: { name: 'Ada' }, channels: ['email'] };
    element.uischema = {
      type: 'VerticalLayout',
      elements: [{ type: 'Control', scope: '#/properties/recipient/properties/city', label: 'Town' }],
    };
    await settled(element);

    expect(element.shadowRoot!.querySelector('#field-recipient-name')).toBeTruthy();
    expect(element.shadowRoot!.querySelector('label[for="field-recipient-city"]')?.textContent).toContain('Town');
    expect(element.shadowRoot!.querySelector('#field-channels-0')).toBeTruthy();
    const city = element.shadowRoot!.querySelector('#field-recipient-city') as HTMLInputElement;
    city.value = 'Berlin';
    city.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    const add = [...element.shadowRoot!.querySelectorAll('button')].find((button) => button.textContent === 'Add item')!;
    add.click();
    await settled(element);
    expect(element.data).toEqual({ recipient: { name: 'Ada', city: 'Berlin' }, channels: ['email', 'email'] });
    expect(element.shadowRoot!.querySelector('#field-channels-1')).toBeTruthy();
  });

  it('uses English defaults when caller overrides only a subset of JSON Forms messages', async () => {
    const element = createForm({
      type: 'object',
      properties: {
        decision: { type: 'string', enum: ['yes', 'no'] },
        choices: {
          type: 'array',
          title: 'Choices',
          minItems: 1,
          items: {
            type: 'string',
            enum: ['alpha', 'beta'],
          },
        },
      },
      required: ['decision'],
    } as JsonSchema);
    element.messages = createJsonFormsMessageProvider({
      locale: 'en-GB',
      messages: {
        itemLabel: () => undefined,
        selectPlaceholder: (required) => required ? 'Choose one item' : 'Choose nothing',
      },
    });
    element.data = { choices: [] };
    await settled(element);

    const arrayGroup = element.shadowRoot!.querySelector('fieldset.array')!;
    expect(arrayGroup.getAttribute('aria-invalid')).toBe('true');
    const arrayErrorId = arrayGroup.getAttribute('aria-errormessage')!;
    expect(arrayGroup.getAttribute('aria-describedby')).toContain(arrayErrorId);
    expect(element.shadowRoot!.querySelector(`#${arrayErrorId}`)).toBeTruthy();

    const add = [...element.shadowRoot!.querySelectorAll('button')].find((button) => button.textContent === 'Add item')!;
    add.click();
    await settled(element);
    const select = element.shadowRoot!.querySelector('#field-choices-0') as HTMLSelectElement;
    expect(select.querySelector('option[value=""]')?.textContent).toBe('Choose nothing');
    expect((element.shadowRoot!.querySelector('#field-decision') as HTMLSelectElement)
      .querySelector('option[value=""]')?.textContent).toBe('Choose one item');
    expect([...element.shadowRoot!.querySelectorAll('button')].some((button) => button.textContent === 'Remove item 1')).toBe(true);
    expect(element.shadowRoot!.querySelector('label[for="field-choices-0"]')?.textContent).toContain('Item 1');
    expect(element.shadowRoot!.querySelector('[part="form"]')?.getAttribute('aria-label')).toBe('Schema form');

    expect(() => createJsonFormsMessageProvider({ locale: '' })).toThrow('locale string');
    expect(() => createJsonFormsMessageProvider({ messages: { addItemLabel: (() => 'invalid') as never } })).toThrow('formatter overrides');
  });

  it('localizes the public JsonForm helper path and associates nested group errors', async () => {
    const host = document.createElement('main');
    document.body.append(host);
    const messages = createJsonFormsMessageProvider({
      locale: 'de-DE',
      messages: {
        rootLabel: 'Öffentliches Schema-Formular',
        validationMessage: () => 'Verschachteltes Pflichtfeld fehlt',
      },
    });
    render(JsonForm({
      schema: {
        type: 'object',
        properties: {
          recipient: {
            type: 'object',
            title: 'Empfänger',
            properties: { name: { type: 'string', title: 'Name' } },
            required: ['name'],
          },
        },
      },
      data: { recipient: {} },
      messages,
    }), host);
    const element = host.querySelector(jsonFormsTag) as JsonFormsElement;
    await settled(element);

    expect(element.shadowRoot!.querySelector('[part="form"]')?.getAttribute('aria-label')).toBe('Öffentliches Schema-Formular');
    const group = element.shadowRoot!.querySelector('fieldset.group')!;
    expect(group.getAttribute('aria-invalid')).toBe('true');
    const errorId = group.getAttribute('aria-errormessage')!;
    expect(group.getAttribute('aria-describedby')).toContain(errorId);
    expect(element.shadowRoot!.querySelector(`#${errorId}`)?.textContent).toContain('Verschachteltes Pflichtfeld fehlt');
  });

  it('formats localized control copy and diagnostics with long second-locale strings', async () => {
    const element = createForm({
      type: 'object',
      properties: {
        amount: { type: 'number', minimum: 1000 },
        method: { type: 'string', enum: ['standard', 'express'] },
        variants: {
          type: 'array',
          title: 'Varianten',
          maxItems: 1,
          items: { type: 'string', enum: ['eins', 'zwei'] },
        },
      },
      required: ['amount', 'method'],
    } as JsonSchema);
    element.style.width = '320px';
    element.messages = createJsonFormsMessageProvider({
      locale: 'de-DE',
      messages: {
        rootLabel: 'Schema-Formular für sehr lange, lokalisierte Infrastrukturtexte',
        itemLabel: (index, locale) => `Benachrichtigungskanal ${new Intl.NumberFormat(locale).format(index)}`,
        addItemLabel: 'Element mit ausführlicher deutscher Beschriftung hinzufügen',
        removeItemLabel: (index, locale) => `Element ${new Intl.NumberFormat(locale).format(index)} mit ausführlicher deutscher Beschriftung entfernen`,
        selectPlaceholder: (required) => required ? 'Bitte einen Eintrag auswählen, um fortzufahren' : 'Keine Auswahl getroffen',
        validationMessage: (error, locale, formatNumber) => {
          if (error.keyword === 'minimum') return `Bitte mindestens ${formatNumber(Number(error.params?.limit))} auswählen`;
          if (error.keyword === 'required') return 'Dieses Feld muss ausgefüllt werden';
          return `Fehler in deutscher Sprache: ${error.message}`;
        },
        configurationMessage: (error) => `Konfigurationshinweis in deutscher Sprache: ${error.message}`,
      },
    });
    element.data = { amount: 1, variants: [] };
    await settled(element);

    expect(element.shadowRoot!.querySelector('[part="form"]')?.getAttribute('aria-label')).toBe('Schema-Formular für sehr lange, lokalisierte Infrastrukturtexte');
    const amount = element.shadowRoot!.querySelector('#field-amount') as HTMLInputElement;
    expect(amount.getAttribute('aria-invalid')).toBe('true');
    expect(element.shadowRoot!.querySelector('[part="error"]')?.textContent).toContain('1.000');
    const add = [...element.shadowRoot!.querySelectorAll('button')].find((button) => button.textContent?.startsWith('Element mit ausführlicher deutscher Beschriftung hinzufügen'))!;
    add.click();
    await settled(element);
    const remove = [...element.shadowRoot!.querySelectorAll('button')].find((button) => button.textContent?.startsWith('Element 1 mit ausführlicher deutscher Beschriftung entfernen'))!;
    expect(remove.textContent).toContain('Element 1');
    const select = element.shadowRoot!.querySelector('#field-variants-0') as HTMLSelectElement;
    expect(select.querySelector('option[value=""]')?.textContent).toBe('Keine Auswahl getroffen');
    expect((element.shadowRoot!.querySelector('#field-method') as HTMLSelectElement)
      .querySelector('option[value=""]')?.textContent).toBe('Bitte einen Eintrag auswählen, um fortzufahren');
    expect(element.shadowRoot!.querySelector('label[for="field-variants-0"]')?.textContent).toContain('Benachrichtigungskanal 1');
    expect(element.shadowRoot!.querySelector<HTMLElement>('.select-control')!.clientWidth)
      .toBeLessThanOrEqual(element.clientWidth + 1);
    expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth + 1);

    const invalid = createForm({ type: 'string' } as JsonSchema);
    invalid.messages = createJsonFormsMessageProvider({
      locale: 'de-DE',
      messages: { configurationMessage: (error) => `Deutsche Konfigurationsdiagnose: ${error.message}` },
    });
    await settled(invalid);
    expect(invalid.shadowRoot!.querySelector('[part="configuration-error"]')?.textContent).toContain('Deutsche Konfigurationsdiagnose');
  });

  it('creates typed defaults for object array items and enforces min/max bounds', async () => {
    const element = createForm({
      type: 'object',
      properties: {
        packages: {
          type: 'array',
          title: 'Packages',
          minItems: 1,
          maxItems: 1,
          items: {
            type: 'object',
            properties: {
              label: { type: 'string', default: 'Standard' },
              quantity: { type: 'integer', default: 2 },
              insured: { type: 'boolean', default: true },
              metadata: { type: 'object', default: { priority: 'normal' } },
            },
          },
        },
      },
    } as JsonSchema);
    element.data = { packages: [] };
    await settled(element);

    const add = [...element.shadowRoot!.querySelectorAll('button')].find((button) => button.textContent === 'Add item')!;
    expect(add.disabled).toBe(false);
    add.click();
    await settled(element);
    expect(element.data).toEqual({
      packages: [{ label: 'Standard', quantity: 2, insured: true, metadata: { priority: 'normal' } }],
    });

    const buttons = [...element.shadowRoot!.querySelectorAll('button')];
    expect(buttons.find((button) => button.textContent === 'Add item')?.disabled).toBe(true);
    expect(buttons.find((button) => button.textContent === 'Remove item 1')?.disabled).toBe(true);
  });

  it('applies defaults through existing nested objects and object-array items', () => {
    const schema = {
      type: 'object',
      properties: {
        recipient: {
          type: 'object',
          properties: { city: { type: 'string', default: 'Berlin' } },
        },
        packages: {
          type: 'array',
          items: {
            type: 'object',
            properties: { label: { type: 'string', default: 'Standard' } },
          },
        },
      },
    } satisfies JsonSchema;

    expect(applySchemaDefaults(schema, { recipient: {}, packages: [{}] })).toEqual({
      recipient: { city: 'Berlin' },
      packages: [{ label: 'Standard' }],
    });
  });

  it('removes array items and keeps programmatic removal guards fail-closed', async () => {
    const element = createForm({
      type: 'object',
      properties: { tags: { type: 'array', items: { type: 'string' } } },
    }, { tags: ['first', 'second'] });
    await settled(element);

    const remove = [...element.shadowRoot!.querySelectorAll('button')]
      .find((button) => button.textContent === 'Remove item 1')!;
    remove.click();
    await settled(element);
    expect(element.data).toEqual({ tags: ['second'] });

    const internal = element as unknown as {
      removeArrayItem(path: readonly string[], index: number): void;
    };
    internal.removeArrayItem(['missing'], 0);
    internal.removeArrayItem(['tags'], 0);
    expect(element.data).toEqual({ tags: [] });
    internal.removeArrayItem(['tags'], 0);
    expect(element.data).toEqual({ tags: [] });

    element.disabled = true;
    internal.removeArrayItem(['tags'], 0);
    element.disabled = false;
    element.readOnly = true;
    internal.removeArrayItem(['tags'], 0);
    expect(element.data).toEqual({ tags: [] });
  });

  it('updates missing nested object paths and removes cleared nested array items', async () => {
    const element = createForm({
      type: 'object',
      properties: {
        groups: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              details: {
                type: 'object',
                properties: { name: { type: 'string', title: 'Group name' } },
              },
              tags: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    } as JsonSchema);
    element.data = { groups: [{}] };
    await settled(element);

    const name = element.shadowRoot!.querySelector('#field-groups-0-details-name') as HTMLInputElement;
    name.value = 'Priority';
    name.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    await settled(element);
    expect(element.data).toEqual({ groups: [{ details: { name: 'Priority' } }] });

    const tagsField = element.shadowRoot!.querySelector('[part*="field-groups-0-tags"]')!;
    (tagsField.querySelector('button') as HTMLButtonElement).click();
    await settled(element);
    const tag = element.shadowRoot!.querySelector('#field-groups-0-tags-0') as HTMLInputElement;
    tag.value = 'fragile';
    tag.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    await settled(element);
    expect(element.data).toEqual({ groups: [{ details: { name: 'Priority' }, tags: ['fragile'] }] });

    tag.value = '';
    tag.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    await settled(element);
    expect(element.data).toEqual({ groups: [{ details: { name: 'Priority' }, tags: [] }] });

    const internal = element as unknown as { commitPath(path: readonly string[], value: unknown): void };
    internal.commitPath(['groups', '2', 'details', 'name'], 'Detached');
    expect((element.data.groups as readonly Record<string, unknown>[])[2]?.details).toEqual({ name: 'Detached' });
    internal.commitPath(['groups', '3', '0'], 'Indexed');
    expect((element.data.groups as readonly unknown[][])[3]?.[0]).toBe('Indexed');
  });

  it('validates direct text and numeric constraints and removes a cleared number', async () => {
    const element = createForm({
      type: 'object',
      properties: {
        note: { type: 'string', minLength: 2, maxLength: 4 },
        quantity: { type: 'number', minimum: 1, maximum: 3 },
      },
    });
    await settled(element);

    const note = element.shadowRoot!.querySelector('#field-note') as HTMLInputElement;
    note.value = 'x';
    note.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    await settled(element);
    expect(element.errors.some(({ keyword }) => keyword === 'minLength')).toBe(true);

    note.value = 'ready';
    note.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    const quantity = element.shadowRoot!.querySelector('#field-quantity') as HTMLInputElement;
    quantity.value = '4';
    quantity.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    await settled(element);
    expect(element.errors.some(({ keyword }) => keyword === 'maximum')).toBe(true);

    quantity.value = '';
    quantity.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    await settled(element);
    expect(element.data).toEqual({ note: 'ready' });
  });

  it('keeps JSON helpers, UI-schema metadata, and invalid schemas explicit', () => {
    expect(isJsonObject({ nested: ['safe', 2, false] })).toBe(true);
    expect(isJsonObject({ invalid: Number.NaN })).toBe(false);
    expect(isJsonObject(null)).toBe(false);
    expect(isJsonSchema({ type: 'object' })).toBe(true);
    expect(isJsonSchema(null)).toBe(false);
    expect(isJsonFormsUiSchema({ type: 'Control', scope: '#/properties/email', label: false })).toBe(true);
    expect(isJsonFormsUiSchema({ type: 'Unknown' })).toBe(false);
    expect(isJsonFormsUiSchema({ type: 'Control', label: 3 })).toBe(false);
    expect(isJsonFormsUiSchema({ type: 'Control', scope: 3 })).toBe(false);
    expect(isJsonFormsUiSchema({ type: 'VerticalLayout', elements: [{ type: 'Unknown' }] })).toBe(false);

    const original = { tags: ['priority'], shipping: { leadTime: 2 } } as const;
    const cloned = cloneJson(original);
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.tags).not.toBe(original.tags);
    const frozen = freezeJson(cloned);
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.tags)).toBe(true);

    expect(applySchemaDefaults({ type: 'object' }, { existing: true })).toEqual({ existing: true });
    const detailedSchema = {
      type: 'object',
      properties: {
        delivery_window: { type: 'string', enum: ['morning', 'afternoon'] },
        priority: { type: 'number', description: 'Choose a numeric priority.' },
      },
    } satisfies JsonSchema;
    const fields = getJsonFormFields(detailedSchema, {
      type: 'VerticalLayout',
      elements: [
        { type: 'Control', scope: '#/properties/missing' },
        { type: 'Control', scope: '#/properties/delivery_window', label: false, options: { enumNames: ['AM', 'PM'] } },
        { type: 'Control', scope: '#/properties/delivery_window' },
      ],
    });
    expect(fields.map(({ name }) => name)).toEqual(['delivery_window', 'priority']);
    expect(fields[0]).toMatchObject({ label: 'Delivery window', options: [{ label: 'AM' }, { label: 'PM' }] });
    expect(fields[1]?.description).toBe('Choose a numeric priority.');

    const configurationErrors = getJsonFormsConfigurationErrors(
      {
        type: 'array',
        properties: {
          empty: { enum: [] },
          website: { type: 'string', format: 'uri' },
        },
      },
      { type: 'Control', scope: '#/properties/website' },
    );
    expect(configurationErrors.map(({ keyword }) => keyword)).toEqual(['type', 'unsupported', 'unsupported', 'unsupported']);
    expect(getJsonFormsConfigurationErrors(
      { type: 'object', properties: { email: { type: 'string' } } },
      { type: 'VerticalLayout', elements: [{ type: 'VerticalLayout' }] },
    )).toHaveLength(1);
    const arrayConfigurationErrors = getJsonFormsConfigurationErrors({
      type: 'object',
      properties: {
        missingItems: { type: 'array' },
        nestedArray: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
      },
    }, undefined);
    expect(arrayConfigurationErrors.map(({ message }) => message)).toEqual([
      'Array property "missingItems" must declare supported items.',
      'Nested arrays are not supported for "nestedArray".',
    ]);
    expect(getJsonFormsConfigurationErrors({ type: 'object' }, undefined)).toEqual([]);
    expect(validateJsonFormData(
      { type: 'object', properties: { units: { type: 'number', minimum: 'one' as unknown as number } } },
      {},
    ).errors[0]?.keyword).toBe('schema');
  });

  it('exposes native form APIs, honors disabled states, and composes through JsonForm()', async () => {
    const outerForm = document.createElement('form');
    const hostLabel = document.createElement('label');
    hostLabel.htmlFor = 'delivery-preferences';
    hostLabel.textContent = 'Delivery preferences';
    const element = document.createElement(jsonFormsTag) as JsonFormsElement;
    element.id = 'delivery-preferences';
    element.name = 'preferences';
    element.schema = {
      type: 'object',
      title: 'Preferences',
      description: 'Set each delivery preference.',
      properties: {
        email: { type: 'string', format: 'email' },
        units: { type: 'integer', minimum: 1 },
        notice: { type: 'boolean', title: 'Send notice', description: 'Send a dispatch message.' },
        optionalWindow: { type: 'string', enum: ['morning', 'afternoon'] },
      },
      required: ['email'],
    };
    element.data = { email: 'ready@example.test', units: 2 };
    outerForm.append(hostLabel, element);
    document.body.append(outerForm);
    await settled(element);

    expect(element.form).toBe(outerForm);
    expect(element.labels).toHaveLength(1);
    expect(element.name).toBe('preferences');
    expect(element.type).toBe(jsonFormsTag);
    expect(element.value).toContain('ready@example.test');
    expect(element.validity?.valid).toBe(true);
    expect(element.validationMessage).toBe('');
    expect(element.willValidate).toBe(true);
    expect(element.reportValidity()).toBe(true);
    element.focus();
    expect(element.shadowRoot?.activeElement?.id).toBe('field-email');

    const notice = element.shadowRoot!.querySelector('#field-notice') as HTMLInputElement;
    notice.checked = true;
    notice.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    const units = element.shadowRoot!.querySelector('#field-units') as HTMLInputElement;
    units.value = '3';
    units.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    const window = element.shadowRoot!.querySelector('#field-optionalWindow') as HTMLSelectElement;
    expect(window.textContent).toContain('No selection');
    window.value = '1';
    window.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await settled(element);
    expect(element.data).toMatchObject({ notice: true, units: 3, optionalWindow: 'afternoon' });

    element.formDisabledCallback(true);
    const email = element.shadowRoot!.querySelector('#field-email') as HTMLInputElement;
    email.value = 'blocked@example.test';
    email.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    await settled(element);
    expect(element.data).not.toMatchObject({ email: 'blocked@example.test' });
    expect(element.willValidate).toBe(false);
    element.formDisabledCallback(false);
    element.readOnly = true;
    email.value = 'readonly@example.test';
    email.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    await settled(element);
    expect(element.data).not.toMatchObject({ email: 'readonly@example.test' });
    element.readOnly = false;
    email.value = '';
    email.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    await settled(element);
    expect(element.errors.some(({ keyword }) => keyword === 'required')).toBe(true);
    expect(element.validationMessage).toContain('must have required property');
    expect(element.reportValidity()).toBe(false);

    element.value = '{broken';
    element.formStateRestoreCallback(null);
    element.formStateRestoreCallback(new FormData());
    element.value = JSON.stringify({ email: 'restored@example.test', units: 4 });
    await settled(element);
    expect(element.data).toEqual({ email: 'restored@example.test', units: 4 });

    const root = document.createElement('div');
    document.body.append(root);
    render(html`${JsonForm({ schema: bookingSchema, data: { email: 'helper@example.test', delivery: 'morning' } })}`, root);
    const helper = root.querySelector(jsonFormsTag) as JsonFormsElement;
    await settled(helper);
    expect(helper.data).toMatchObject({ email: 'helper@example.test', delivery: 'morning' });
  });
});

function formatViolations(violations: readonly Result[]): string {
  return violations.map((violation) => [
    `${violation.id}: ${violation.help}`,
    ...violation.nodes.map((node) => `${node.target.join(' ')} — ${node.failureSummary ?? 'failed'}`),
  ].join('\n')).join('\n');
}
