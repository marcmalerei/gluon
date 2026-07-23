# Hydration reference

Hydration validates server DOM before mutation, reconstructs event and ref
bindings, restores request Router and Store snapshots, and adopts validated
style carriers. Matching DOM retains node identity.

Mismatch categories cover text, attributes, structure, state, and styles. The
default recovery replaces the root once; `recovery: 'throw'` aborts before DOM
mutation. Suppression affects reporting, not recovery.

See the repository [hydration contract](https://github.com/marcmalerei/gluon/blob/main/docs/hydration.md)
and generated [`@gluonjs/ssr/hydration` API](/gluon/1.3.0/api/generated/packages/ssr/src/hydration/).
