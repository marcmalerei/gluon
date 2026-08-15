# Request-free forms

Gluon has two complementary form contracts:

- `@gluonjs/json-forms` renders the documented JSON Schema/UI-schema subset
  when the form structure is schema-owned.
- `@gluonjs/molecules` exports `createFormController()` when the application
  owns the fields and needs reusable lifecycle state.

`createFormController()` is intentionally not a form renderer or transport
client. It keeps native controls, labels, `FormData`, constraint validation,
submission requests, and error presentation in the application. The controller
owns only typed values, `register()` bindings, touched/dirty state, validation
errors, async cancellation, and the submitting lifecycle.

```ts
import { createFormController } from '@gluonjs/molecules';

const form = createFormController({
  initialValues: { email: '', name: '' },
  validate: async (values, { signal }) => {
    const errors: { email?: string } = {};
    if (!values.email.includes('@')) errors.email = 'Enter a valid email.';
    if (signal.aborted) return errors;
    return errors;
  },
  onSubmit: async (values, { signal }) => {
    await saveProfile(values, signal);
  },
});

const email = form.register('email');
email.setValue('ada@example.com');
email.setTouched();
const result = await form.submit();
```

Use `form.snapshot()` in the server payload and `form.hydrate(snapshot)` in a
browser controller that supplies the browser-side validator/submit handler.
The snapshot is a shallow record contract; application-owned serialization is
required for non-JSON values. `dispose()` aborts active validation/submission
work, so request ownership remains explicit and no stale result can update a
new form lifecycle.

For a schema-driven form, use `@gluonjs/json-forms` instead of duplicating
schema traversal in a controller. For a native form with no application-level
validation or async lifecycle, ordinary HTML constraint validation remains the
smallest correct solution.
