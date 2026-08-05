# Learn Gluon step by step

This path assumes basic TypeScript, HTML, and npm knowledge. It does not assume
framework experience. Complete the steps in order; each one adds a single new
idea.

## The mental model

Keep these five facts in mind:

1. `html` returns a description of DOM, called a `TemplateResult`.
2. A `ref` owns one reactive value. Reading `.value` while rendering creates the
   dependency; writing `.value` schedules the update.
3. Gluon updates bindings inside existing DOM when the template callsite stays
   the same.
4. A Gluon application owns effects and cleanup until `unmount()`.
5. Browser standards stay visible: events are native events, Custom Elements
   are real Custom Elements, and styles are constructable `CSSStyleSheet`s.

## Step 1: create and run a project

```sh
npm create gluon@latest my-shop
cd my-shop
npm install
npm run dev
```

Open the URL printed by Vite. The generated project contains:

| File | Junior-friendly purpose |
| --- | --- |
| `index.html` | Provides the mount element such as `<div id="app"></div>`. |
| `src/main.ts` | Creates state, returns the root template, and mounts the app. |
| `vite.config.ts` | Activates the official Gluon transform and diagnostics. |
| `package.json` | Lists the run, build, typecheck, and test commands. |

Run `npm run build` before committing. A successful dev page alone does not
prove that TypeScript and the production bundle are valid.

## Step 2: read a template

```ts
const name = 'Orbit Lamp';
const price = 128;

html`
  <article>
    <h2>${name}</h2>
    <p>$${price}</p>
  </article>
`;
```

Static markup remains normal HTML. `${...}` is a binding. Do not build HTML by
concatenating strings; Gluon escapes ordinary values and updates the exact
binding.

The most common binding forms are:

| Syntax | Meaning | Example |
| --- | --- | --- |
| `${value}` | Text, child template, node, or list content | `<p>${message}</p>` |
| `name=${value}` | String attribute | `aria-label=${label}` |
| `.name=${value}` | JavaScript property | `.product=${product}` |
| `?name=${value}` | Boolean attribute | `?disabled=${saving.value}` |
| `@name=${listener}` | Native event listener | `@click=${save}` |

Use a property binding for objects, arrays, or live DOM properties such as
`input.value`. Use an attribute for serializable HTML text.

## Step 3: add state

```ts
import { createApp, html } from '@gluonjs/core';
import { ref } from '@gluonjs/reactivity';

const count = ref(0);

createApp(() => html`
  <button @click=${() => { count.value += 1; }}>
    Added ${count.value} time(s)
  </button>
`).mount(document.querySelector('#app')!);
```

The event writes the state; the template reads it. Do not call `render()`
manually after changing a ref.

## Step 4: render a stable list

Use `repeat()` when items have stable identities:

```ts
repeat(
  products,
  (product) => product.id,
  (product) => html`<article>${product.name}</article>`,
);
```

The key must be unique and stable. An array index is unsuitable when items can
be reordered or removed because the index describes a position, not the item.

## Step 5: own styles and cleanup

Gluon intentionally uses constructable stylesheets. A `StyleSheetOwner` retains
only the sheets it owns and releases them during application cleanup:

```ts
const owner = createStyleSheetOwner(document);
owner.retain(css`main { max-inline-size: 40rem; }`);
app.onUnmounted(() => owner.dispose());
```

The full compiled feature below combines typed data, a controlled search input,
derived state, a keyed list, stylesheet ownership, and page cleanup:

<<< ../../../../examples/beginner-feature.ts

## Step 6: test public behavior

Test through the rendered surface:

<<< ../../../../examples/testing.ts

Prefer queries and assertions a user or platform consumer can observe. Do not
assert renderer comments, private fields, or implementation classes.

## Step 7: choose the next guide

- Need a reusable visual part? Continue with
  [choosing a component level](../component-decisions/).
- Need a stateful Custom Element? Continue with
  [properties, events, and lifecycle](../components/).
- Need URLs or shared state? Continue with
  [application architecture](../application/).
- Need server HTML? Continue with
  [universal rendering](../universal-rendering/).
- Something failed? Read the error message and code, then open the
  [diagnostic reference](../../reference/diagnostics/).

## Common first-project mistakes

| Symptom | Check |
| --- | --- |
| The page is empty | Confirm `index.html` has the queried mount ID and that `mount()` receives that element. |
| State changed but the UI did not | Read the ref as `.value` inside the app render function; do not copy it to a non-reactive variable first. |
| An object becomes `[object Object]` | Use `.property=${value}` rather than an attribute binding. |
| A checkbox or disabled control is wrong | Use `?checked=${value}` or `?disabled=${value}` for boolean attributes. |
| A list keeps the wrong row after removal | Give `repeat()` a stable domain key instead of the array index. |
| TypeScript accepts dev code but production fails | Run `npm run build`; do not rely only on the dev server. |
| Styles disappear or leak between surfaces | Retain constructable sheets with an explicit owner and dispose that owner. |
| Event code survives after navigation | Prefer template event bindings, or register imperative listeners with owner cleanup. |
| A component has hidden state but no lifecycle | Move the stateful boundary to `defineGluonElement()` or `GluonElement`. |

Every public symbol also has a compiled, task-oriented example in the
[API reference](../../api/). Use the [Cookbook](../../cookbook/) when you know
the task and the API reference when you know the symbol.

## Small glossary

| Term | Meaning |
| --- | --- |
| Template | A `TemplateResult` created by `html` or `svg`. |
| Binding | One dynamic value inside a template. |
| Ref | A reactive object whose current value is `.value`. |
| Component | A function that returns a template, optionally with layer metadata. |
| Custom Element | A registered browser element with its own host and lifecycle. |
| Mount | Start an application in a specific container. |
| Unmount | Stop effects, release owned resources, and remove renderer DOM. |
| Quark | A thin native element or headless behavior building block. |
| Atom | One reusable presentational control or value. |
| Molecule | A small composition of related parts. |
| Organism | A larger reusable section or workflow boundary. |
