# Language tooling

`@gluonjs/language-server` is the shared template-analysis boundary for editor
and CI workflows. It parses TypeScript or JavaScript source without executing
it, recognizes imported aliases of Gluon's public `html`, `svg`, `css`, and
`compose` tags, and performs a two-pass project analysis so Custom Element declarations
are available across files.

## Commands

```sh
gluon-template-check src
gluon-language-server --stdio
```

The checker accepts files and directories, ignores `node_modules` and `dist`,
prints `file:line:column CODE message`, and exits with 1 for diagnostics, 2 for
missing input, and 0 for a clean project. Maintained `create-gluon` starters
expose it as `npm run check:templates`.

The server implements LSP `Content-Length` framing and full-document sync. Its
capabilities are template semantic tokens, completion, hover,
go-to-definition, workspace rename, and diagnostics. Protocol tests call
`GluonProtocolServer` directly, independently of VS Code. The maintained client
in `editors/vscode` activates for TypeScript and JavaScript and starts the
configured same-version server executable.

## Declaration inference

The analyzer recognizes `defineElement('tag-name', ElementClass)` and literal
`defineGluonElement({ tagName, properties, events, slots, setup })`
definitions. Static `properties`, `events`, and `slots` object keys provide manifest-equivalent
metadata for template checks and editor features. External tools can supply
the same facts through `CustomElementDeclaration` values or convert standard
Custom Elements Manifest data with `declarationsFromCustomElementsManifest()`.
Definitions and
renames link the tag string and every open template occurrence.

Inside `compose(Component, props)\`body\``, Gluon supplies the same native HTML
diagnostics, completion, hover, semantic tokens, and source ranges as `html`.
The built-in TypeScript service owns the component identifier, props and
callbacks, completion, hover, definition, rename, and outer TypeScript
formatting. The Gluon server preserves body whitespace and does not create a
virtual proprietary document.

## Diagnostic contract

| Code | Condition |
| --- | --- |
| `GLUON_ELEMENT_TAG_INVALID` | Functional definition tag is not a valid lowercase autonomous Custom Element name |
| `GLUON_ELEMENT_SETUP_CLEANUP_MISSING` | Setup creates a directly detectable listener or interval without cleanup/disconnect ownership |
| `GLUON_ELEMENT_SETUP_LIFECYCLE_DEFERRED` | Setup lifecycle registration occurs in nested or deferred work |
| `GLUON_TEMPLATE_ARIA_UNKNOWN` | Unknown `aria-*` attribute name |
| `GLUON_TEMPLATE_BINDING_POSITION` | Binding used as a tag or attribute name |
| `GLUON_TEMPLATE_CUSTOM_ELEMENT_UNKNOWN` | Hyphenated tag lacks a declaration or manifest entry |
| `GLUON_TEMPLATE_EVENT_UNKNOWN` | `@event` is absent from declared events |
| `GLUON_TEMPLATE_PROP_UNKNOWN` | `.property` is absent from declared properties |
| `GLUON_TEMPLATE_SLOT_UNKNOWN` | Literal named light-DOM `slot` is absent from a literal element slot declaration |
| `GLUON_TEMPLATE_STYLE_ELEMENT` | Browser template contains an inline style element |
| `GLUON_TEMPLATE_VOID_CHILDREN` | Void HTML element has children or a closing tag |

These codes are emitted by both the LSP and CLI. They are development and CI
diagnostics; TypeScript remains responsible for JavaScript expression types.
For `defineGluonElement()`, TypeScript inference checks structured/primitive
property values, event names/details, setup context use, form availability, and
exposed host method calls.
The repository gate runs a failing fixture through both the built CLI and the
public project analyzer and requires identical ordered diagnostic codes.
