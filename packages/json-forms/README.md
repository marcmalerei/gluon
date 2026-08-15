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
dropping fields.

## Historical delivery decision

The direct-property component was the first usable package slice identified in
issue #256 and delivered in [#257](https://github.com/marcmalerei/gluon/issues/257).
Nested object and bounded array support is delivered in
[#377](https://github.com/marcmalerei/gluon/issues/377); the remaining
unsupported capabilities above still require separate contracts and browser
evidence.
