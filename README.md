![Gluon — native UI layers growing from a glowing core](docs/assets/gluon-hero.jpg)

<p align="center">
  <img src="docs/assets/gluon-logo.jpg" alt="Gluon logo — interface layers orbiting a glowing core" width="180">
</p>

<h1 align="center">Gluon</h1>

<p align="center">
  A native-first UI system built on Custom Elements, HTML template literals, and adopted stylesheets.
</p>

> [!IMPORTANT]
> Gluon is an early prototype. A working runtime and component-layer foundation now exist in this repository, but the package is private, unpublished, and its public API is not stable.

## What works today

- cached `html` and `svg` template results with part-level DOM updates
- child, attribute, property, boolean, event, and first-class spread bindings
- nested templates and array rendering with cached template instances
- reactive Custom Elements through `GluonElement`
- constructable `CSSStyleSheet` creation and `adoptedStyleSheets` adoption only
- typed `q.<tag>()` Quark factories for `HTMLElementTagNameMap`
- working Atom, Molecule, and Organism entry points
- TypeScript declarations, an ESM library build, and real-browser tests

No benchmark currently proves that Gluon is faster than Lit, Vue, or another renderer.

## Install for development

The package is not published. Work from this repository:

```bash
npm install
npm run check
```

`npm run check` runs strict type checking, the instrumented Chromium browser suite, and the production library build. The coverage gate requires at least 95% statement, function, and line coverage plus 90% branch coverage.

## Quick start

```ts
import {
  adoptStyles,
  foundationStyles,
  layerOrderStyles,
  render,
} from 'gluon';
import { q } from 'gluon/quarks';
import { Button, atomStyles } from 'gluon/atoms';
import { Card, moleculeStyles } from 'gluon/molecules';

adoptStyles(
  document,
  layerOrderStyles,
  foundationStyles,
  atomStyles,
  moleculeStyles,
);

render(Card({
  title: 'Hello Gluon',
  children: q.p({ children: 'Native elements, composed.' }),
  actions: Button({ label: 'Continue' }),
}), document.body);
```

The same renderer can be used directly:

```ts
import { html, render } from 'gluon';

const view = (name: string) => html`<h1>Hello ${name}</h1>`;
render(view('world'), document.body);
render(view('Gluon'), document.body);
```

The second call updates the existing text part when the template shape is unchanged.

## Bindings and spreading

Gluon keeps bindings explicit:

| Syntax | Effect |
| --- | --- |
| `title=${value}` | Set or remove an attribute. |
| `.value=${value}` | Write directly to an element property. |
| `?disabled=${condition}` | Toggle a boolean attribute. |
| `@click=${handler}` | Add, replace, or remove an event listener. |
| `...=${props}` | Reconcile a complete prop set. |

Spread props support classes, styles, `data`, `dataset`, `aria`, property and boolean prefixes, event handlers, and callback or object refs:

```ts
const inputRef: { value?: Element } = {};

html`<input ...=${{
  class: { field: true, invalid: false },
  '.value': 'Ada',
  '?disabled': false,
  aria: { label: 'Name', invalid: false },
  data: { testId: 'name' },
  onInput: (event: InputEvent) => console.log(event),
  ref: inputRef,
}}>`;
```

Each expression must occupy a complete child or attribute value. Compose partial attribute strings before binding them.

## Custom Elements

`GluonElement` turns the renderer and stylesheet contract into a small reactive Custom Element base:

```ts
import { GluonElement, css, defineElement, html } from 'gluon';

class GreetingElement extends GluonElement {
  static override readonly properties = {
    name: { type: String, reflect: true, default: 'World' },
  };

  static override readonly styles = css`
    :host { display: block; }
  `;

  declare name: string;

  protected override render() {
    return html`<p>Hello ${this.name}</p>`;
  }
}

defineElement('gluon-greeting', GreetingElement);
```

Declared properties receive accessors, schedule microtask-batched updates, may reflect to attributes, and expose an `updateComplete` promise.

## Adopted stylesheets only

Gluon component styles are `CSSStyleSheet` instances. They are installed through `adoptedStyleSheets`; the library deliberately ships no `<style>` fallback:

```ts
import { adoptStyles, css } from 'gluon/styles';

const theme = css`
  :root { color-scheme: light dark; }
`;

adoptStyles(document, theme);
```

Unsupported browsers fail with an explicit error instead of silently switching styling strategies.

## The system

Gluon is the base system. Its UI vocabulary increases in scope without changing rendering primitives:

| Layer | Current role and entry point |
| --- | --- |
| **Gluon** | Template runtime, Custom Element base, prop merging, and stylesheet adoption from `gluon`. |
| **Quarks** | Typed factories for native HTML elements through `gluon/quarks` and `q.<tag>()`. |
| **Atoms** | Focused primitives such as `Icon`, `Button`, `Input`, and `Label` from `gluon/atoms`. |
| **Molecules** | Reusable compositions such as `Card` and `FormField` from `gluon/molecules`. |
| **Organisms** | Larger interface structures such as `AppShell` from `gluon/organisms`. |

```text
                         increasing UI scope
  Quarks  ─────────▶  Atoms  ─────────▶  Molecules  ─────────▶  Organisms
 native elements      primitives          compositions          structures

                   Gluon provides the base system
```

Every component created with `defineAtom`, `defineMolecule`, or `defineOrganism` carries explicit `layer` and `displayName` metadata.

## Why Gluon?

The following points describe architectural advantages and design goals. Outcomes that depend on implementation—including rendering speed, runtime size, and developer ergonomics—must continue to be verified as the prototype evolves.

1. **A web-platform foundation.** Custom Elements are a browser standard, giving Gluon a native component boundary instead of a framework-specific component format.
2. **Framework interoperability.** Custom Elements can be consumed from plain HTML and integrated into frameworks that support them, making Gluon components useful beyond Gluon applications.
3. **Incremental adoption.** A standards-based component can be introduced one element at a time; an existing application does not need to be rewritten before it can use a Gluon component.
4. **Less framework-specific surface area.** The core model uses HTML, JavaScript, Custom Elements, and stylesheets rather than depending on a proprietary single-file component format.
5. **Declarative templates without another file format.** An HTML tagged template literal keeps declarative markup in JavaScript or TypeScript while avoiding an additional component-file syntax.
6. **Composable attribute sets.** First-class attribute spreading makes related accessibility, form, state, and configuration attributes easier to group, forward, and reuse.
7. **One styling contract.** Using `adoptedStyleSheets` exclusively gives the component system one explicit styling mechanism instead of several competing internal paths.
8. **Reusable stylesheet instances.** A `CSSStyleSheet` can be adopted by multiple compatible roots, allowing components to share a stylesheet instance rather than recreating identical style text for every instance.
9. **A design-system foundation.** Quarks, Atoms, Molecules, and Organisms give components named positions at increasing levels of UI scope.
10. **A consistent native-element layer.** Representing HTML elements as Quarks creates one place to define how native elements participate in Gluon composition.
11. **Focused UI primitives.** Atoms such as icons encourage small responsibilities, focused APIs, and isolated verification before primitives are combined into larger structures.
12. **A scalable composition vocabulary.** The same model covers native elements, primitives, intermediate compositions, and complete interface structures.
13. **Performance as an initial constraint.** Rendering work, updates, and allocations are considered during API design rather than treated only as later optimization. Any performance advantage remains unverified until reproducible comparative benchmarks exist.
14. **The potential for a smaller runtime.** Reusing browser-provided component, DOM, and stylesheet capabilities may reduce the amount of runtime code Gluon needs to provide. The resulting size must be measured against comparable systems.
15. **A distinct position.** The combination of Custom Elements, an HTML template literal, attribute spreading, adopted stylesheets, and the Gluon component vocabulary gives the project a specific direction relative to Vue- and Lit-style approaches.

## Architecture and provenance

- [Architecture](docs/architecture.md)
- [Gluon 1.0 product scope RFC](docs/rfcs/0001-gluon-1.0-product-scope.md)
- [Gluon 1.0 roadmap](docs/roadmap.md)
- [Tiny-Lit transfer record](docs/tiny-lit-migration.md)
- [Runnable source example](examples/quick-start.ts)

The initial implementation was transferred and restructured from the local `tiny-lit-main` snapshot named in the transfer record. Features outside the current Gluon vision were intentionally not copied.

## Current scope

Included now:

- browser-side rendering and updates
- Custom Element authoring
- adopted stylesheet management
- Quark, Atom, Molecule, and Organism composition
- browser tests, type checking, and ESM builds

Not included now:

- server-side rendering or hydration
- islands
- a reactivity package outside `GluonElement` properties
- Vue compatibility APIs or migration tooling
- published performance comparisons
- a stable or published package release

## Development

```bash
npm run typecheck
npm test
npm run test:coverage
npm run build
npm audit --audit-level=moderate
```

`npm run test:coverage` prints the V8 coverage summary and writes the ignored HTML report to `coverage/`. Run all project checks, including the coverage thresholds, with `npm run check`.

## Contributing

The runtime exists, but the API remains experimental. Use [GitHub Issues](https://github.com/marcmalerei/gluon/issues) to discuss changes before implementation.

## License

No license file is currently included in this repository.
