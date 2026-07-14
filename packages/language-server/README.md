<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/package-headers/language-server.png" alt="@gluonjs/language-server — Gluon package header" width="100%">
</p>
<!-- gluon-package-header:end -->

The Gluon language server analyzes imported `html`, `svg`, `css`, and aliased
`compose(Component, props)` tagged templates without evaluating application
code. The public service and the
`gluon-template-check` CI command share the same two-pass project analyzer.

Diagnostics cover unknown Custom Elements, declared Custom Element properties,
events, and named light-DOM slots, ARIA names, invalid binding positions, void-element children, and
inline style elements. `defineElement()` declarations expose tag definitions,
static `properties`, `events`, and `slots` metadata to completion, hover,
definition, and workspace rename operations.
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
gluon-language-server --stdio
```

The LSP uses standard `Content-Length` framing and supports full-document sync,
diagnostics, completion, hover, go-to-definition, rename, and semantic tokens.
Protocol behavior is tested through `GluonProtocolServer` without VS Code. The
maintained VS Code client is in `editors/vscode` and starts the lockstep server
from the workspace or extension configuration.

## License

MIT License, Copyright © 2026 Marc Malerei.
