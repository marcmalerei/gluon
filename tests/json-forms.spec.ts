import { beforeEach, describe, expect, it } from 'vitest';
import { html, render } from '../src/index.js';
import {
  JsonForm,
  JsonFormsElement,
  jsonFormsTag,
  registerJsonForms,
  type JsonFormChangeDetail,
  type JsonFormValidationChangeDetail,
  type JsonSchema,
} from '../packages/json-forms/src/index.js';
import {
  applySchemaDefaults,
  cloneJson,
  freezeJson,
  getJsonFormFields,
  getJsonFormsConfigurationErrors,
  isJsonFormsUiSchema,
  isJsonObject,
  isJsonSchema,
  validateJsonFormData,
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
  data: Record<string, string | number | boolean> = {},
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

  it('makes unsupported schemas explicit instead of silently omitting fields', async () => {
    const element = createForm({
      type: 'object',
      properties: {
        address: { type: 'object', properties: { city: { type: 'string' } } },
      },
    });
    await settled(element);

    expect(element.errors).toHaveLength(1);
    expect(element.shadowRoot!.querySelector('[part="configuration-error"]')?.textContent).toContain('address');
    expect(element.checkValidity()).toBe(false);
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
