# Request-free forms

`@gluonjs/molecules` provides `createFormController()` for application-owned
forms that need reusable lifecycle state without giving up native controls.
The controller is DOM-independent and safe to construct during SSR. It
supports typed field registration, values, touched/dirty state, validation
errors, async validation, submission lifecycle, cancellation, reset,
subscriptions, and `snapshot()`/`hydrate()` transport.

It deliberately does not render labels or controls, read `FormData`, perform
constraint validation, send requests, or walk JSON Schema. Keep those concerns
with the native form/application or use [`@gluonjs/json-forms`](../../api/generated/packages/json-forms/src/).

See the [request-free form guide](../../../../forms/) for the full contract and
SSR/browser example.
