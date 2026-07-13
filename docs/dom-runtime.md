# DOM, form, directive, and cleanup contract

This document defines the browser-runtime behavior implemented by
`@gluonjs/core`. The release conformance targets are the configured
Playwright-managed Chromium, Firefox, and WebKit binaries. They are engine-level
evidence and do not establish branded-browser or platform support claims.

## Form controls

Property bindings are controlled bindings. Gluon compares the requested value
with the live DOM property on every render, so a render restores state changed
by the user or by external code. Attribute and boolean-attribute bindings are
uncontrolled initialization/default-state bindings: when the bound value is
unchanged, Gluon does not reset a dirty live property.

| Control | Controlled binding | Uncontrolled binding | Contract |
| --- | --- | --- | --- |
| Text-like `input` | `.value=${value}` | `value=${initial}` | A render restores the controlled value; a user edit survives an unchanged uncontrolled render. |
| `textarea` | `.value=${value}` | `.defaultValue=${initial}` | Dynamic textarea child interpolation is unsupported because the HTML parser treats its contents as raw text. |
| Checkbox | `.checked=${boolean}` | `?checked=${initial}` | Controlled state is restored; uncontrolled dirty state is preserved. |
| Radio group | `.checked=${boolean}` on every member | `?checked=${initial}` | Native name/group exclusivity remains browser behavior. |
| Single select | `.value=${string}` | `?selected=${initial}` on options | Controlled selection is restored; dirty uncontrolled selection is preserved. |
| Multi-select | `.value=${readonlyValues}` | `?selected=${initial}` on options | An array selects options whose string values occur in the array. An array on a non-`multiple` select throws. |
| File input | `.value=${''}` to clear | no value/files binding | Browsers prohibit assigning a non-empty file value; Gluon preserves that platform exception. An uncontrolled `FileList` survives an unchanged render. |

Spread property keys such as `'.value'` and `'.checked'` use the same rules.
Gluon does not synthesize `input` or `change` events when it writes a controlled
property. Native form-control properties commit after normal attributes and
dynamic children, so an initial controlled select can target options created by
the same render.

Form-associated Gluon elements use the platform contract directly: the class
declares `static formAssociated = true`, acquires `ElementInternals`, and owns
`setFormValue`, validity, reset, state-restore, disabled, focus, label, and event
behavior. The browser suite includes a submitting, validating, resetting,
restoring, label-aware, focusable fixture. Issue #24 owns the later typed public
component/form authoring contract; there is no hidden-input fallback.

## Directive lifecycle

`directive()` accepts either the original function factory or a lifecycle
object. A lifecycle object receives the current `PartController` and a typed
argument tuple:

```ts
const resource = directive<[string]>({
  mount(part, [value]) {
    part.setValue(value);
  },
  update(part, [value], [previous]) {
    part.setValue(`${previous} -> ${value}`);
  },
  cleanup(_part, [value]) {
    releaseVersion(value);
  },
  disconnect() {
    releaseOwner();
  },
});
```

The sequence is deterministic:

1. `mount` runs when the lifecycle definition first owns a Part.
2. Before a later `update`, `cleanup` runs for the previous argument tuple.
3. `update` receives both the new and previous tuple.
4. Replacement, temporary render suspension, and permanent unmount run
   `cleanup` once for the active tuple and then `disconnect` once.
5. Reconnection mounts the directive again against the retained Part.

If `update` throws, the previous tuple has already been cleaned. Gluon
disconnects that previous tuple once, deactivates the directive, and rethrows
the update error; it does not promote the failed arguments to active state.

The legacy factory form remains supported and runs its returned function on
each application. It has no lifecycle hooks.

Core async, teleport, cache, and transition built-ins use this lifecycle
contract. Their update cancellation, application ownership, LRU eviction,
reduced-motion, and server-descriptor behavior is defined in
[Async UI and rendering built-ins](async-ui.md).

## Event options

Plain `@event=${listener}` and spread `onEvent`/`@event` values use native
listeners without options. `event(listener, options)` forwards a boolean
capture flag or the complete `AddEventListenerOptions` object, including
`capture`, `once`, `passive`, and `signal`:

```ts
html`<button @click=${event(save, { once: true, signal })}>Save</button>`;
```

Gluon retains the listener and the exact options value so replacement,
suspension, and unmount call `removeEventListener` with matching capture
semantics. Browser behavior remains authoritative for once, passive, and abort
signals.

## Namespaces

The HTML parser establishes HTML, SVG, and MathML element namespaces. Dynamic
qualified attributes additionally use the platform namespace APIs:

`svg` tagged templates compile both complete `<svg>...</svg>` roots and
rootless fragments such as `<path ...></path>` in the SVG namespace. HTML and
SVG template plans use separate caches even when a caller supplies the same
template-string identity to both tag functions.

| Prefix | Namespace |
| --- | --- |
| `xlink:` | `http://www.w3.org/1999/xlink` |
| `xml:` | `http://www.w3.org/XML/1998/namespace` |
| `xmlns` / `xmlns:` | `http://www.w3.org/2000/xmlns/` |

Removal uses the same namespace and local name. `unsafeHTML()` uses contextual
fragment parsing, so explicit raw markup inside an SVG or MathML parent receives
that surrounding namespace.

## Dynamic content and URL safety

Ordinary child strings always create text nodes. Dynamic raw markup requires
the visibly unsafe `unsafeHTML(trustedMarkup)` API. It is also required for
`srcdoc`. `.innerHTML`, `.outerHTML`, and `.textContent` property bindings are
rejected because they can destroy renderer-owned marker nodes. Gluon does not
sanitize an `unsafeHTML` value. Only reviewed, trusted input may use it.

String `on*` attributes are rejected. Native listeners must use `@event` or a
spread event key.

For URL-valued attributes and their corresponding property bindings, Gluon
normalizes ASCII whitespace/control characters for protocol inspection and
blocks `javascript:`, `vbscript:`, and `data:`.
The covered names are `action`, `archive`, `background`, `cite`, `codebase`,
`data`, `formaction`, `href`, `icon`, `longdesc`, `manifest`, `ping`, `poster`,
`profile`, `src`, `srcset`, `usemap`, and `xlink:href`. Relative URLs and other
protocols pass through unchanged. `unsafeURL(reviewedValue)` is the explicit
escape hatch and is accepted only by those URL-valued bindings. It performs no
safety check. A `.data` property is treated as a URL only on `<object>`; custom
element data properties remain ordinary structured property inputs.

These checks are a narrow DOM-sink boundary, not an application content
sanitizer, URL allowlist, navigation policy, or Content Security Policy.
Static literal markup is author-controlled source and is not passed through the
dynamic binding guard.

## Ownership, suspension, and external DOM

`render(result, container)` owns the complete contents of its container.
`unmount(container)` permanently disconnects directive resources, listeners,
and refs, deletes the retained root instance, and removes the owned DOM.

`suspendRender(container)` is the reversible operation used by
`GluonElement.disconnectedCallback()`. It releases active directive resources,
listeners, and refs while retaining properties, state, bindings, and matching
DOM nodes. Reconnection renders the current state, remounts resources, and
reuses intact nodes. A queued element update checks connection state again
before commit and therefore cannot render after disconnection.

The renderer validates its owned root-node sequence on every render. If
external code replaces or reorders root nodes, Gluon disconnects the stale
bindings and remounts the root. Dynamic Part node sequences are likewise
restored around their marker. Static descendants inside a retained compiled
node are not diffed individually; external code must not mutate renderer-owned
static internals and expect that mutation to be preserved.

The browser retention test performs 100 render/unmount cycles, verifies every
ref is cleared, and verifies detached nodes no longer invoke their former
listeners.

## Upgrade precedence

For an undefined element upgraded later, an own JavaScript property captured by
`GluonElement` takes precedence over the corresponding initial markup
attribute. The upgrade-time attribute callback is ignored only for that exact
initial attribute value. Reflection then serializes the captured property.
Later attribute or property writes are authoritative in normal callback order.
