![Gluon — native UI layers growing from a glowing core](docs/assets/gluon-hero-v2.jpg)

<p align="center">
  <img src="docs/assets/gluon-logo.jpg" alt="Gluon logo — interface layers orbiting a glowing core" width="180">
</p>

<h1 align="center">Gluon</h1>

<p align="center">
  A native-first UI system built on Custom Elements, HTML template literals, and adopted stylesheets.
</p>

> [!IMPORTANT]
> Gluon is currently in the design stage. This repository does not yet contain a runtime, package, or public API. The capabilities below describe the intended direction and are not published features.

## The idea

Gluon is being designed as a Vue alternative that stays close to the web platform. Components use [Custom Elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements), templates use an HTML tagged template literal inspired by `lit-html`, and styling uses adopted stylesheets exclusively.

The goal is a small, composable system with:

- Custom Elements as the component foundation
- a declarative HTML template literal
- first-class attribute spreading
- `adoptedStyleSheets` as the only styling mechanism
- performance treated as a measurable design constraint
- UI layers that scale from native elements to complete interface structures

Gluon aims to improve template-rendering performance relative to existing approaches. That goal still needs to be validated with reproducible benchmarks once an implementation exists.

## The system

Gluon is the base system. It provides a vocabulary for building interfaces at increasing levels of scope:

| Layer | Intended role |
| --- | --- |
| **Gluon** | The rendering, composition, and styling foundation shared by every layer. |
| **Quarks** | Representations of all native HTML elements. |
| **Atoms** | Focused UI primitives, such as an icon. |
| **Molecules** | The composition layer above individual primitives. Its concrete API is not defined yet. |
| **Organisms** | The highest named composition layer. Its concrete API is not defined yet. |

```text
                         increasing UI scope
  Quarks  ─────────▶  Atoms  ─────────▶  Molecules  ─────────▶  Organisms
 native elements      primitives          compositions          structures

                   Gluon provides the base system
```

## Core design decisions

### Custom Elements

Gluon is based on the browser's native component model rather than a framework-specific component format. The exact authoring and lifecycle APIs have not been specified yet.

### HTML template literals

Templates will use a tagged template literal for HTML, similar in purpose to `lit-html`. The concrete syntax and update model are still to be designed.

### Attribute spreading

Attribute spreading is a first-class requirement for composing reusable sets of element attributes. Its public syntax has not been defined yet.

### Adopted stylesheets only

The styling model is intentionally constrained to [`adoptedStyleSheets`](https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot/adoptedStyleSheets). This constraint is part of the architecture, not an optional styling mode.

### Measured performance

Performance is a project objective, not yet a verified result. Future performance claims should be accompanied by reproducible benchmarks, documented environments, and comparable workloads.

## Current status

Only the project direction and visual identity are present today. There are no installation, build, test, or usage instructions because no implementation has been published in this repository yet.

## Contributing

The public API and runtime design are still open. Use [GitHub Issues](https://github.com/marcmalerei/gluon/issues) to propose and discuss changes before implementation.

## License

No license file is currently included in this repository.
