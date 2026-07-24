---
name: gluon
description: Build performant native-first Gluon applications and component libraries with the official public packages.
---

# Gluon

Use public package entry points only. Gluon renders cached `html`/`svg` template
results into the DOM, updates parts when a template callsite is reused, and
uses constructable `CSSStyleSheet` objects with `adoptedStyleSheets`. Never add
an inline `<style>` fallback.

## Package boundaries

- `@gluonjs/core`: templates, rendering, applications, reactive Custom
  Elements, component metadata, directives, async UI, transitions, and styles.
- `@gluonjs/reactivity`: DOM-free `ref`, `reactive`, `computed`, `effect`,
  `watch`, scopes, schedulers, plus `/signals` and `/preact-signals` adapters.
- `@gluonjs/quarks`: typed native-element factories (`q.*`), fragments, and
  headless accessible interactions.
- `@gluonjs/atoms`, `@gluonjs/molecules`, `@gluonjs/organisms`: optional,
  downward-only UI layers. They export their own components and the matching
  `defineAtom`, `defineMolecule`, or `defineOrganism` authoring helper.
- `@gluonjs/router` (`/memory`), `@gluonjs/store`, and `@gluonjs/ssr`
  (`/eleventy`, `/hydration`, `/static`, `/streaming`): navigation, app state,
  and server/universal rendering.
- `@gluonjs/vite`: compiler diagnostics, `.gluon` SFCs, source maps, HMR, and
  universal asset manifests.
- `@gluonjs/gluon-components-vite`: Storybook framework and native renderer
  (`/entry-preview`, `/preset`, `/renderer-preset` are framework integration
  boundaries).
- `@gluonjs/compiler` (`/diagnostics`), `@gluonjs/language-server`,
  `@gluonjs/test-utils` (`/ssr`), `@gluonjs/devtools-api`,
  `@gluonjs/devtools`, and `@gluonjs/vue-migration-analyzer` (`/schema`):
  build/editor/test/devtools/migration tooling. `create-gluon` is the official
  scaffold and component generator.

Do not import repository `src/`, private package files, or deep `dist` paths.
Core does not imply the optional UI, router, store, SSR, or tooling packages.

## Performant application shape

Keep template callsites stable, use `repeat()` with identity keys when list
items move, and dispose owners/scopes when their application lifetime ends:

```ts
import { html, repeat, render, unmount } from '@gluonjs/core';

const products = (items: readonly { id: string; name: string }[]) => html`
  <ul>${repeat(items, (item) => item.id, (item) => html`<li>${item.name}</li>`)}</ul>
`;

render(products([{ id: 'shoe', name: 'Track Shoe' }]), document.body);
// later: unmount(document.body);
```

Use `@gluonjs/reactivity` for shared DOM-free state and
`defineGluonElement()` for state or lifecycle owned by one Custom Element.
Prefer native semantics and properties; avoid rebuilding entire templates,
unstable keys, import-time DOM mutation, or application-wide stylesheets for
component-local work.

## Quarks, Atoms, Molecules, Organisms

Quarks preserve native semantics and accept typed native props:

```ts
import { q } from '@gluonjs/quarks';
const save = q.button({ type: 'button', children: 'Save', onClick: () => submit() });
```

Layers communicate downward only. Atoms are focused primitives, Molecules
compose Atoms, and Organisms compose lower layers into larger sections:

```ts
import { defineAtom } from '@gluonjs/atoms';
import { defineMolecule } from '@gluonjs/molecules';
import { defineOrganism } from '@gluonjs/organisms';
import { q } from '@gluonjs/quarks';

export const Price = defineAtom((value: string) => q.output({ children: value }));
export const BuyRow = defineMolecule((p: { price: string }) =>
  q.section({ children: [Price(p.price), q.button({ type: 'button', children: 'Add' })] }));
export const ProductPurchase = defineOrganism((p: { price: string }) =>
  q.main({ children: BuyRow(p) }));
```

Use `defineUiAtom()` from `@gluonjs/atoms` for concise presentational native
wrappers. Use `defineGluonElement()` instead when state, lifecycle, a ShadowRoot,
form association, or public element properties/events are required.

## Vite

Install `@gluonjs/core`, `@gluonjs/vite`, and `vite`, then:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import gluon from '@gluonjs/vite';

export default defineConfig({ plugins: [gluon()] });
```

The plugin handles Gluon template diagnostics, compatible HMR, decorators, and
presentational `.gluon` files. Set `universal: true` only when the SSR/static
pipeline needs `gluon-assets.json`. In a monorepo, configure `include` if
application modules are outside Vite's resolved root.

## Storybook

Install `@gluonjs/gluon-components-vite`, `storybook`, and `vite`. Configure:

```ts
// .storybook/main.ts
import type { StorybookConfig } from '@gluonjs/gluon-components-vite';
export default {
  stories: ['../src/**/*.stories.ts'],
  framework: '@gluonjs/gluon-components-vite',
} satisfies StorybookConfig;
```

Stories return Gluon templates from stable callsites:

```ts
import type { Meta, StoryObj } from '@gluonjs/gluon-components-vite';
import { html } from '@gluonjs/core';

const meta = {
  title: 'Shop/Stock',
  args: { label: 'In stock' },
  render: ({ label }) => html`<strong>${label}</strong>`,
} satisfies Meta<{ label: string }>;
export default meta;
export const Available: StoryObj<typeof meta> = {};
```

The renderer calls Core `render()` and tears down with `unmount()`. Keep product
acceptance flows in the application; Storybook is isolated developer evidence.
