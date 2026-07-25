<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/package-headers/json-forms.png" alt="@gluonjs/json-forms — Gluon package header" width="100%">
</p>
<!-- gluon-package-header:end -->

`@gluonjs/json-forms` turns a deliberately documented subset of JSON Schema and
JSON Forms UI schema into one accessible, form-associated Web Component. It is
an optional package: schema rendering and AJV validation do not enter
`@gluonjs/core`.

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

## First-slice compatibility

The first release renders a root schema with `type: "object"` and direct
properties of type `string`, `number`, `integer`, `boolean`, or string/number
`enum`. It supports `title`, `description`, `default`, `required`,
`minLength`, `maxLength`, `minimum`, `maximum`, `format: "email"`,
`additionalProperties`, field-level `readOnly`, and `enumNames`.

An optional JSON Forms `VerticalLayout` may order direct-property `Control`
elements and supply their labels or `options.enumNames`. Native labels, keyboard
controls, focus indicators, error association, disabled state, and reduced
motion behavior are built into the element.

Nested objects and layouts, arrays, `$ref`, conditional/composition keywords,
JSON Forms rules, custom renderer registries, localization, async schemas, and
file widgets are intentionally unsupported in this slice. An unsupported schema
or UI schema renders an explicit configuration error rather than silently
dropping fields.
