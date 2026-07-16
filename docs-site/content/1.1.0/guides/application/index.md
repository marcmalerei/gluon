# Application architecture

`createApp()` owns one mount root, effect scope, plugin stack, provider map,
Router plugin, and explicit cleanup boundary. Stateful UI remains a Custom
Element; functional components remain render functions.

## Router and Store

<<< ../../../../examples/router-store.ts

Create one Store manager per application, request, or test. Do not export a
process-wide live manager. The Router plugin destroys its Router with the owning
application, and the example disposes its Store manager from the same lifecycle.

## Custom Elements

<<< ../../../../examples/custom-element.ts

Properties use JavaScript property bindings for structured values, outputs are
native `CustomEvent` instances, and projected content uses native slots.

The [component authoring guide](../components/) explains each property option,
event propagation and cancellation, class selection, and connection cleanup.

## Contracts

- [Application runtime](https://github.com/marcmalerei/gluon/blob/main/docs/application-runtime.md)
- [Component inputs, outputs, slots, models, and refs](https://github.com/marcmalerei/gluon/blob/main/docs/component-contracts.md)
- [Router](https://github.com/marcmalerei/gluon/blob/main/docs/router.md)
- [Store](https://github.com/marcmalerei/gluon/blob/main/docs/store.md)
