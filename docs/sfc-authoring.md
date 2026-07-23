# Presentational Single-File Components

Gluon Single-File Components are an optional authoring format for small
presentational Atoms, Molecules, and Organisms. A `.gluon` file keeps its typed
props, native markup, and owned CSS together while the official Vite plugin
compiles it to the same public contracts used by handwritten components.

## First component

Create `TextLink.gluon`:

```html
<script lang="ts">
import type { TemplateValue } from '@gluonjs/core';

export interface TextLinkProps {
  readonly href?: string;
  readonly children?: TemplateValue;
}
</script>

<template component="TextLink" layer="atom" props="TextLinkProps">
  <component :is="href ? 'a' : 'span'" :href="href" class="text-link"><slot /></component>
</template>

<style id="app-text-link">
  :where(.text-link) {
    text-underline-offset: 0.2em;
  }
</style>
```

Import the default component from application code:

```ts
import TextLink from './TextLink.gluon';

const navigation = TextLink({
  href: '/catalog',
  children: 'Browse products',
});
```

For TypeScript projects, declare the file shape once:

```ts
declare module '*.gluon' {
  import type { Component } from '@gluonjs/core';
  const component: Component<Record<string, unknown>>;
  export default component;
}
```

Application-specific code may narrow that default import to the exported props
interface when it needs exact call-site checking. The `.gluon` script remains
the source of truth for the compiled component.

## What the compiler generates

The example becomes normal imports and calls:

- `defineAtom()` because `layer="atom"`
- `quark()` because the single native root is selected with `:is`
- `createComponentStyleDependency()` and `css` for the named sheet
- one default and one named component export

There is no SFC runtime, component instance, hidden state owner, `<style>`
element, or Vue runtime dependency in the browser output. The compiler uses the
Vue SFC parser only as a build-time block parser. Styles remain constructable
`CSSStyleSheet` instances and renderer ownership remains explicit.

## Supported presentational syntax

- one ordinary `<script>` block using JavaScript or TypeScript;
- one required `<template>` with `component`, `layer`, and optional `props`;
- identifier interpolation such as `{{ label }}`;
- one default `<slot />`;
- a single dynamic native root using
  `<component :is="linked ? 'a' : 'span'">`;
- static attributes and prop bindings such as `class="badge"` and
  `:href="href"` on that dynamic root;
- zero or one plain CSS `<style>` with a stable lowercase `id` and optional
  non-negative `order`.

The initial compiler intentionally rejects script setup, external/custom
blocks, preprocessors, CSS modules, scoped CSS, arbitrary dynamic component
resolution, and multiple style blocks. Rejection is safer than silently
inventing lifecycle, scoping, or runtime semantics.

## Choosing SFC, functions, or Custom Elements

Use a `.gluon` SFC when a component is mostly typed props, markup, slots, and
owned CSS. Handwrite `defineAtom()`, `defineMolecule()`, or
`defineOrganism()` when it needs several native roots, rich branching, scoped
slots, or direct control of `q.*()` props. Use `defineGluonElement()` or
`GluonElement` for state, data fetching, timers, connection lifecycle, tracking,
form association, exposed methods, or error boundaries.

GLUON GOODS demonstrates the boundary in production:

- `ShopEditorialLink` is a `.gluon` Atom because it owns only props, a
  conditional native tag, a slot, and one style.
- `PurchaseAction` and `CheckoutExperience` remain handwritten Molecule and
  Organism compositions because they coordinate multiple child components.
- the product configurator and bag quantity control remain Custom Elements
  because they own form or stateful lifecycle behavior.
