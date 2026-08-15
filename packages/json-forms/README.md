<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/package-headers/json-forms.png" alt="@gluonjs/json-forms — Gluon package header" width="100%">
</p>
<!-- gluon-package-header:end -->

`@gluonjs/json-forms` turns a deliberately documented subset of JSON Schema and
JSON Forms UI schema into one accessible, form-associated Web Component. It is
an optional package: schema rendering and AJV validation do not enter
`@gluonjs/core`.

## Stability notes

The package ships as part of the current `1.9.0` release line. Its documented
schema and UI schema subset is stable; broader JSON Schema features and
alternative renderer systems remain unsupported unless a later contract adds
them.

```ts
import {
  registerJsonForms,
  type JsonFormsElement,
  type JsonSchema,
} from '@gluonjs/json-forms';

const schema = {
  type: 'object',
  title: 'Delivery preference',
  properties: {
    email: { type: 'string', format: 'email', title: 'Email address' },
    time: { type: 'string', enum: ['morning', 'afternoon'], enumNames: ['Morning', 'Afternoon'] },
    giftWrap: { type: 'boolean', title: 'Add gift wrap', default: false },
  },
  required: ['email', 'time'],
} satisfies JsonSchema;

registerJsonForms();

const form = document.querySelector<JsonFormsElement>('gluon-json-form')!;
form.schema = schema;
form.data = { email: 'hello@example.test' };
form.addEventListener('change', (event) => {
  console.log(event.detail.data, event.detail.errors);
});
```

```html
<form>
  <gluon-json-form name="delivery"></gluon-json-form>
  <button>Save delivery preference</button>
</form>
```

The element serializes its current JSON object to the outer form under `name`,
uses `ElementInternals` for native validity, supports reset and state restore,
and dispatches `change` with frozen `{ data, errors }`. `validation-change`
dispatches only when the validation result changes. The application owns the
authoritative data: update `.data` after a `change` event when the surrounding
state store accepts or transforms the edit.

## Message provider

JSON Forms infrastructure copy is owned by a synchronous message provider. The
package exports `createJsonFormsMessageProvider()` and typed provider
interfaces so applications can swap locale-aware strings without importing
`@gluonjs/i18n` or making network requests. The provider covers the root form
label, array item numbering, add/remove controls, selection placeholders,
validation diagnostics, and configuration diagnostics.

```ts
import {
  createJsonFormsMessageProvider,
  registerJsonForms,
  type JsonFormsMessageProvider,
} from '@gluonjs/json-forms';

const messages: JsonFormsMessageProvider = createJsonFormsMessageProvider({
  locale: 'de-DE',
  messages: {
    selectPlaceholder: (required, locale) =>
      required ? `Bitte auswählen (${locale})` : `Keine Auswahl (${locale})`,
  },
});

const form = document.querySelector('gluon-json-form')!;
form.messages = messages;
```

`createJsonFormsMessageProvider()` always falls back to the built-in English
defaults when a caller omits a specific override. Formatter overrides may
return `undefined` or `null` to leave a key unresolved; the provider then uses
the English fallback for that key. Validation formatters receive immutable AJV
keyword `params`, including numeric limits and missing-property names. Locale-
aware number formatting comes from `Intl.NumberFormat`, so item numbering and
validation thresholds can follow the active locale without depending on the
i18n package. The provider does not translate application-authored titles or
descriptions. Object and array validation messages are associated with their
own fieldset through `aria-describedby`, `aria-errormessage`, and
`aria-invalid`, just as primitive fields associate their controls.

The maintained `docs-site/examples/json-forms.html` application installs the
German provider in a real delivery-preferences form. Run
`npm run build:docs-examples && npm run check:json-forms-example-browser` to
verify localized validation and configuration diagnostics, long array-control
labels, 390px overflow, and 44px controls in Chromium.

## Supported schema boundary

The renderer accepts a root schema with `type: "object"`, primitive fields of
type `string`, `number`, `integer`, or `boolean`, string/number `enum`, nested
objects through `properties`, and arrays with one supported `items` schema.
Nested arrays are rejected so item editing remains bounded and addressable. It
supports `title`, `description`, `default`, `required`, `minLength`,
`maxLength`, `minimum`, `maximum`, `minItems`, `maxItems`, `format: "email"`,
`additionalProperties`, field-level `readOnly`, and `enumNames`.

An optional JSON Forms `VerticalLayout` may order root or nested `Control`
elements and supply their labels or `options.enumNames`. Object fields render
as fieldsets. Array fields expose 44px Add/Remove controls and preserve the
same immutable change event, native form value, validation, reset, and state
restore contracts as direct fields. Native labels, keyboard controls, focus
indicators, error association, disabled state, and reduced motion behavior are
built into the element.

`$ref`, conditional/composition keywords, JSON Forms rules, custom renderer
registries, localization, async schemas, file widgets, nested arrays, and UI
layouts other than `VerticalLayout` remain unsupported. An unsupported schema
or UI schema renders an explicit configuration error rather than silently
dropping fields, and that configuration copy also flows through the message
provider.

## Historical delivery decision

The direct-property component was the first usable package slice identified in
issue #256 and delivered in [#257](https://github.com/marcmalerei/gluon/issues/257).
Nested object and bounded array support is delivered in
[#377](https://github.com/marcmalerei/gluon/issues/377); the remaining
unsupported capabilities above still require separate contracts and browser
evidence.
