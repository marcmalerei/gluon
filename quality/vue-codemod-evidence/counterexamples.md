# Vue codemod counterexamples

These counterexamples apply only to the 17 files in the retained analyzer
corpus and the supplementary production Vue-host evidence. They do not measure
arbitrary Vue applications.

## Vue imports

`ProductCard.vue` combines Vue reactivity with Router, Pinia, an async import,
and lifecycle work. Removing or replacing an import cannot establish equivalent
scheduling, cleanup, route ownership, store isolation, or module side effects.

## Static component registration

The supported corpus contains component-element uses but no retained positive
fixture for static local registration. The negative corpus contains runtime
`app.component()` registration. There is therefore no supported input/output
pair from which to prove a static-registration rewrite.

## Props, emits, and models

The analyzer can inventory declared names. It does not prove attribute/property
transport, conversion, defaults, required state, event detail, bubbling,
composition, cancellation, or two-way update timing. The production Vue-host
tests demonstrate that these behaviors require an explicit native contract.

## Simple template bindings

The retained template uses `v-if`, a template ref, a named slot, `v-model`, a
bound ARIA value, `Suspense`, and an async component. Static node and directive
presence does not prove branch identity, ref timing, model scheduling, slot
ownership, accessibility, or async fallback behavior in a generated template.

## Native Custom Element transport

`VueProductHost.vue` deliberately assigns structured values as DOM properties
and listens to native Custom Events. This coexistence boundary is verified, but
it is a manually authored host contract rather than evidence that Vue props and
emits can be rewritten automatically.

## Stylesheet extraction

The supported corpus includes both CSS modules and scoped CSS. Text extraction
would not preserve selector rewriting, module-name binding, cascade order,
Shadow DOM boundaries, or constructed-sheet ownership. The unsupported corpus
also contains SCSS, for which evaluated output is unavailable.

## Router and Store boundaries

`useRoute()` and `defineStore()` are detected structurally. Gluon requires route
records, guards, lazy loading, application/request Store managers, persistence,
and teardown to be assigned explicit owners. Static call replacement would not
prove those behaviors.

## Lifecycle

The corpus contains Options API `mounted()` and Composition API `onMounted()`.
It has no equivalent generated target covering disconnect/reconnect, retained
identity, effect cleanup, scheduler ordering, or server execution.

## Tests

The retained Vue test imports `@vue/test-utils` and a Vue SFC but contains no
asserted behavior. A mechanical import or mount replacement could compile while
losing wrapper semantics, scheduler settling, slots, events, providers, Router,
Store, or cleanup evidence.

## Async components and Suspense

The corpus detects an async loader and `Suspense`, but it has no behavioral
fixture for loading, failure, cancellation, retry, teardown, or server output.
Static syntax coverage therefore cannot establish equivalent generated code.

## Dynamic templates, macros, and directives

The negative fixture contains a dynamic component, a custom directive, TSX, and
a custom SFC block. The analyzer reports these as indeterminate or unsupported;
there is no authorized mapping to manufacture.

## Plugins and runtime registration

Vite plugin configuration and runtime `app.component()` registration can change
source interpretation and application state. RFC 0003 prohibits executing them,
so their behavior is intentionally unavailable to a transform decision.

## SSR and hydration

The analyzer sees `createSSRApp()` and `renderToString()` calls only. It cannot
prove request isolation, serialized state, asset/style transport, hydration
identity, mismatch behavior, streaming, or renderer ownership.

## CSS preprocessors and external styles

The unsupported SCSS block requires a processor and configuration that the
analyzer neither executes nor models. No CSS output exists in the retained
evidence, so extraction is unsupported.
