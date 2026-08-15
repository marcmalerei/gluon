import { css } from '@gluonjs/core';
import {
  createJsonFormsMessageProvider,
  registerJsonForms,
  type JsonFormChangeDetail,
  type JsonFormsElement,
  type JsonObject,
  type JsonSchema,
} from '@gluonjs/json-forms';

const referenceStyles = css`
  :root { color: #111111; background: #ffffff; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
  * { box-sizing: border-box; }
  body { margin: 0; }
  .reference-shell { display: grid; gap: clamp(36px, 7vw, 88px); max-width: 960px; margin: 0 auto; padding: clamp(24px, 5vw, 72px) 20px 72px; }
  header { max-width: 650px; border-block-end: 1px solid #cdd1d3; padding-block-end: 28px; }
  .wordmark { display: inline-block; color: inherit; font-size: 11px; font-weight: 720; letter-spacing: .13em; text-decoration: none; }
  h1 { max-width: 650px; margin: 28px 0 14px; font-size: clamp(42px, 8vw, 82px); font-weight: 560; letter-spacing: -.065em; line-height: .9; }
  header p { max-width: 48ch; margin: 0; color: #465058; font-size: 18px; line-height: 1.45; }
  .preferences-form { display: grid; gap: 24px; max-width: 640px; }
  .preferences-form footer { display: flex; align-items: center; justify-content: space-between; gap: 24px; border-block-start: 1px solid #cdd1d3; padding-block-start: 18px; }
  .preferences-form footer p { margin: 0; color: #465058; font-size: 13px; line-height: 1.4; }
  button { min-block-size: 44px; border: 1px solid #111111; background: #b7db2c; color: #111111; cursor: pointer; padding: 10px 16px; font: inherit; font-weight: 690; white-space: nowrap; }
  button:focus-visible { outline: 3px solid #005fcc; outline-offset: 3px; }
  @media (max-width: 480px) { .preferences-form footer { align-items: stretch; flex-direction: column; } button { inline-size: 100%; } }
`;

document.adoptedStyleSheets = [...document.adoptedStyleSheets, referenceStyles];

const deliverySchema = {
  type: 'object',
  title: 'Handover rules',
  description: 'The component owns accessible controls and validation; this page owns the saved delivery policy.',
  properties: {
    contactEmail: { type: 'string', title: 'Dispatch email', format: 'email' },
    deliveryWindow: {
      type: 'string',
      title: 'Preferred delivery window',
      enum: ['morning', 'afternoon'],
      enumNames: ['Morning · 08:00–12:00', 'Afternoon · 12:00–17:00'],
      default: 'morning',
    },
    leadTime: { type: 'integer', title: 'Notification lead time (hours)', minimum: 1, maximum: 72, default: 24 },
    signatureRequired: { type: 'boolean', title: 'Require a recipient signature', default: true },
    recipient: {
      type: 'object',
      title: 'Recipient details',
      properties: {
        name: { type: 'string', title: 'Recipient name' },
        city: { type: 'string', title: 'Delivery city' },
      },
      required: ['name'],
    },
    backupChannels: {
      type: 'array',
      title: 'Backup notification channels',
      items: { type: 'string', enum: ['email', 'sms'], enumNames: ['Email', 'SMS'] },
      maxItems: 2,
    },
  },
  required: ['contactEmail', 'deliveryWindow', 'leadTime'],
} satisfies JsonSchema;

registerJsonForms();

const form = document.querySelector<HTMLFormElement>('#delivery-preferences')!;
const jsonForm = form.querySelector<JsonFormsElement>('gluon-json-form')!;
const status = document.querySelector<HTMLElement>('#form-status')!;
jsonForm.messages = createJsonFormsMessageProvider({
  locale: 'de-DE',
  messages: {
    rootLabel: 'Schema-Formular für Lieferpräferenzen',
    itemLabel: (index, locale) => `Benachrichtigungskanal ${new Intl.NumberFormat(locale).format(index)}`,
    addItemLabel: 'Weiteren Benachrichtigungskanal hinzufügen',
    removeItemLabel: (index, locale) => `Benachrichtigungskanal ${new Intl.NumberFormat(locale).format(index)} entfernen`,
    selectPlaceholder: (required) => required ? 'Bitte eine Option auswählen' : 'Keine Auswahl',
    validationMessage: (error, locale, formatNumber) => {
      if (error.keyword === 'required') return 'Dieses Feld ist erforderlich.';
      if (error.keyword === 'minimum') return `Bitte mindestens ${formatNumber(Number(error.params?.limit))} eingeben.`;
      return `Ungültige Eingabe: ${error.message}`;
    },
    configurationMessage: (error) => `Konfigurationshinweis: ${error.message}`,
  },
});
let deliveryPreferences: JsonObject = {
  contactEmail: 'dispatch@gluongoods.example',
};

jsonForm.schema = deliverySchema;
jsonForm.data = deliveryPreferences;
jsonForm.addEventListener('change', (event) => {
  const { data, errors } = (event as CustomEvent<JsonFormChangeDetail>).detail;
  deliveryPreferences = data;
  jsonForm.data = deliveryPreferences;
  status.textContent = errors.length === 0
    ? 'Ready to save your delivery preferences.'
    : 'Review the highlighted delivery fields before saving.';
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!jsonForm.reportValidity()) {
    status.textContent = 'Review the highlighted delivery fields before saving.';
    return;
  }
  status.textContent = `Saved ${String(deliveryPreferences.contactEmail)} for ${String(deliveryPreferences.deliveryWindow)} deliveries.`;
});
