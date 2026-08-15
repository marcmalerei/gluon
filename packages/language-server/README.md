<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/package-headers/language-server.png" alt="@gluonjs/language-server — Gluon package header" width="100%">
</p>
<!-- gluon-package-header:end -->

The Gluon language server analyzes imported `html`, `svg`, `css`, and aliased
`compose(Component, props)` tagged templates without evaluating application
code. The public service and the
`gluon-template-check` CI command share the same two-pass project analyzer.

`analyzeStaticGluonProject()` and `gluon-project-analyze` expose the broader
versioned project report. It inventories source files, component shapes,
public Custom Element contracts, templates and bindings, constructable style
dependencies, literal routes and stores, SSR/hydration API boundaries, and the
same diagnostics used by the editor. Every evidence record is marked `exact`,
`structural`, or `indeterminate`; the analyzer never imports application code.

Diagnostics cover unknown Custom Elements, declared Custom Element properties,
events, and named light-DOM slots, ARIA names, invalid binding positions, void-element children, and
inline style elements. `defineElement()` declarations expose tag definitions,
static `properties`, `events`, and `slots` metadata to completion, hover,
definition, and workspace rename operations.
Literal `@customElement()` declarations expose the same tag definition;
`@property()` fields join the public property list while `@state()` remains
internal. Aliased decorator imports are recognized.
Literal `defineGluonElement()` definitions expose the same inferred tag,
property, event, and slot contract and share the compiler's tag/setup ownership
diagnostics.
Unknown literal named light-DOM assignments receive
`GLUON_TEMPLATE_SLOT_UNKNOWN` at the slot-name source range.
`declarationsFromCustomElementsManifest()` accepts standard manifest module
declarations and exposes their fields, events, and slots to the same analyzer.
Every emitted code is required to exist in the public `@gluonjs/compiler`
diagnostic catalog shared with the Playground and Devtools reference.

```sh
gluon-template-check src
gluon-project-analyze src > project-analysis.json
gluon-language-server --stdio
```

The LSP uses standard `Content-Length` framing and supports full-document sync,
diagnostics, completion, hover, go-to-definition, references, rename, and
semantic tokens. `.gluon` documents use the compiler's typed SFC block parser;
template and script ranges remain in the original file and malformed documents
are isolated. Compiler-backed parsing preserves `component`, `props`, `layer`,
style ID, default-import, and default-slot block metadata. Editor symbol
operations link literal `defineElement()` declarations, the template
`component` attribute, relative default `.gluon` imports, and static template/CSS
class names across the same open workspace with original-source ranges. Relative
import navigation is intentionally open-document based, and rename changes local
component aliases rather than filenames. The server does not replace TypeScript
or CSS language services; arbitrary expressions, preprocessors, package imports,
dynamic imports, and filesystem rename remain outside the contract.
Protocol behavior is tested through `GluonProtocolServer` without VS Code. The
maintained VS Code client is in `editors/vscode` and starts the lockstep server
from the workspace or extension configuration.

## License

MIT License, Copyright © 2026 Marc Malerei.
