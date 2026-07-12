export const GLUON_DIAGNOSTIC_CATALOG_VERSION = '0.0.0';

export type GluonDiagnosticSource = 'compiler' | 'devtools' | 'hydration' | 'language-server' | 'runtime' | 'ssr' | 'tooling';

export interface GluonDiagnosticDefinition {
  readonly id: number;
  readonly code: string;
  readonly compactCode: `G${number}`;
  readonly title: string;
  readonly summary: string;
  readonly why: string;
  readonly remediation: string;
  readonly source: GluonDiagnosticSource;
  readonly before?: string;
  readonly after?: string;
}

const definitions = [
  entry(1001, 'GLUON_COMPONENT_MISSING', 'Component is not registered', 'A named component cannot be resolved in the active application.', 'The component was not registered on this application instance.', 'Register it with app.component() before rendering.', 'runtime'),
  entry(1002, 'GLUON_PLUGIN_DUPLICATE', 'Plugin is already installed', 'An application received the same plugin more than once.', 'Plugin identity is application-scoped and duplicate installation would duplicate resources.', 'Install each plugin once or guard conditional setup.', 'runtime'),
  entry(1003, 'GLUON_PROP_INVALID', 'Property validation failed', 'A Custom Element property value did not satisfy its validator.', 'The declared validator returned false, a message, or threw.', 'Pass a value accepted by the public property declaration.', 'runtime'),
  entry(1004, 'GLUON_PROP_REQUIRED', 'Required property is missing', 'A required Custom Element property has no value.', 'The element connected or rendered before the required input was set.', 'Set the property before connection or make the declaration optional.', 'runtime'),
  entry(1005, 'GLUON_EVENT_INVALID', 'Event detail validation failed', 'Emitted event detail did not satisfy the declared validator.', 'The event contract and emitted detail disagree.', 'Emit detail matching the public event declaration.', 'runtime'),
  entry(1006, 'GLUON_EVENT_UNDECLARED', 'Event is not declared', 'A Custom Element emitted an event absent from its public declarations.', 'Strict development diagnostics require public event metadata.', 'Add the event declaration or emit a declared event name.', 'runtime'),
  entry(1007, 'GLUON_SLOT_REQUIRED', 'Required slot is empty', 'A required named or default slot has no assigned content.', 'The host omitted content required by the element contract.', 'Provide assigned content or make the slot optional.', 'runtime'),
  entry(1101, 'GLUON_TEMPLATE_STYLE_ELEMENT', 'Inline style element is unsupported', 'Browser templates cannot contain style elements.', 'Gluon owns styles through constructable stylesheets and adoptedStyleSheets.', 'Move CSS into a css tagged template and adopt the resulting sheet.', 'compiler'),
  entry(1102, 'GLUON_TEMPLATE_ARIA_UNKNOWN', 'ARIA attribute is unknown', 'The template contains an unrecognized aria-* attribute.', 'The attribute is misspelled or is not part of the supported ARIA vocabulary.', 'Use the correct ARIA attribute or remove it.', 'language-server'),
  entry(1103, 'GLUON_TEMPLATE_BINDING_POSITION', 'Binding position is invalid', 'A template binding appears in a tag or attribute name.', 'Dynamic values are supported only in child and attribute-value positions.', 'Move the binding into content or a complete attribute value.', 'language-server'),
  entry(1104, 'GLUON_TEMPLATE_CUSTOM_ELEMENT_UNKNOWN', 'Custom Element is unknown', 'A hyphenated tag has no declaration or manifest entry.', 'The editor cannot find defineElement() metadata or a Custom Elements Manifest declaration.', 'Declare the element or supply its public manifest.', 'language-server'),
  entry(1105, 'GLUON_TEMPLATE_EVENT_UNKNOWN', 'Custom Element event is unknown', 'An @event binding is absent from the element declaration.', 'The event name and public element contract disagree.', 'Bind a declared event or update the declaration.', 'language-server'),
  entry(1106, 'GLUON_TEMPLATE_PROP_UNKNOWN', 'Custom Element property is unknown', 'A .property binding is absent from the element declaration.', 'The property name and public element contract disagree.', 'Bind a declared property or update the declaration.', 'language-server'),
  entry(1107, 'GLUON_TEMPLATE_VOID_CHILDREN', 'Void element has children', 'A void HTML element contains children or a closing tag.', 'HTML void elements cannot own content.', 'Remove the children and closing tag.', 'language-server', '<img>Preview</img>', '<img alt="Preview">'),
  entry(1108, 'GLUON_ELEMENT_TAG_INVALID', 'Custom Element tag is invalid', 'A functional element definition uses an invalid autonomous Custom Element name.', 'Platform Custom Element names must be lowercase, contain a hyphen, and cannot use the reserved xml prefix.', 'Use a valid lowercase autonomous Custom Element name such as shop-quantity.', 'compiler'),
  entry(1109, 'GLUON_ELEMENT_SETUP_CLEANUP_MISSING', 'Setup resource has no cleanup owner', 'Functional element setup creates a listener or interval without a declared cleanup path.', 'Connection-owned resources must be released when the element disconnects or hot setup is replaced.', 'Register release work with context.onCleanup() or context.onDisconnected().', 'compiler'),
  entry(1110, 'GLUON_ELEMENT_SETUP_LIFECYCLE_DEFERRED', 'Lifecycle registration is deferred', 'A functional element lifecycle callback is registered from nested or deferred work.', 'Lifecycle ownership is fixed synchronously during setup and cannot depend on later call order.', 'Move context.onConnected(), onUpdated(), onDisconnected(), or onErrorCaptured() registration into the synchronous setup body.', 'compiler'),
  entry(1111, 'GLUON_TEMPLATE_SLOT_UNKNOWN', 'Custom Element slot is unknown', 'A named light-DOM slot assignment is absent from the element declaration.', 'The slot attribute and public element contract disagree.', 'Use a declared slot name or update the literal slots declaration.', 'language-server'),
  entry(1201, 'GLUON_HYDRATION_TEXT_MISMATCH', 'Hydration text mismatch', 'Server and client text content differ.', 'The initial render inputs are not deterministic across server and browser.', 'Align request data and initial client state before hydration.', 'hydration'),
  entry(1202, 'GLUON_HYDRATION_ATTRIBUTE_MISMATCH', 'Hydration attribute mismatch', 'Server and client attributes differ.', 'A bound attribute produced different initial values.', 'Use identical serialized inputs for the first client render.', 'hydration'),
  entry(1203, 'GLUON_HYDRATION_STRUCTURE_MISMATCH', 'Hydration structure mismatch', 'Server and client node structure differs.', 'Conditional or list rendering produced a different template shape.', 'Make the initial template structure deterministic.', 'hydration'),
  entry(1204, 'GLUON_HYDRATION_STATE_MISMATCH', 'Hydration state mismatch', 'Serialized server and client Store snapshots differ.', 'Client state changed before hydration or used another schema.', 'Restore the request snapshot before creating the client application.', 'hydration'),
  entry(1205, 'GLUON_HYDRATION_STYLE_MISMATCH', 'Hydration style mismatch', 'Server style carriers and client style manifest differ.', 'The server and browser did not use the same ordered stylesheet set.', 'Build both entries from the same public style modules.', 'hydration'),
  entry(1206, 'GLUON_UNSUPPORTED_SSR_TRANSPORT', 'SSR style transport is unsupported', 'The browser cannot complete the required style handoff.', 'Constructable stylesheet or carrier requirements are not available.', 'Use a supported browser and preserve server style carriers until hydration.', 'hydration'),
  entry(1207, 'GLUON_UI_HYDRATION_MISMATCH', 'UI stylesheet hydration mismatch', 'The scoped server UI sheets do not match the selected client theme and shared layers.', 'A required UI sheet is missing, duplicated, reordered, or has different content or a different digest.', 'Create server styles with createUiStyleSelection() and install the same theme with installUi(..., { hydrate: true }).', 'hydration'),
  entry(1208, 'GLUON_COMPONENT_STYLE_HYDRATION_MISMATCH', 'Component stylesheet hydration mismatch', 'Request-derived server component sheets do not match the hydrated client value tree.', 'A component carrier is missing, extra, duplicated, reordered, content-mismatched, or emitted for another target.', 'Render and hydrate the same public component tree and preserve its ordered gluon-component carriers.', 'hydration'),
  entry(1209, 'GLUON_LEGACY_COMPONENT_STYLE_CONFLICT', 'Legacy aggregate component styles conflict', 'A deprecated category sheet and exact renderer-owned component sheet cover the same component.', 'The application retained an aggregate Atom, Molecule, or Organism sheet after migrating to usage-driven rendering.', 'Remove atomStyles, moleculeStyles, or organismStyles adoption; render components through their public functions.', 'runtime'),
  entry(1301, 'GLUON_SSR_INVALID_VALUE', 'SSR value is invalid', 'The server renderer received a value it cannot serialize safely.', 'The value is not part of the supported template value contract.', 'Convert it to a supported primitive, template, iterable, or explicit trusted value.', 'ssr'),
  entry(1302, 'GLUON_SSR_UNSUPPORTED_DIRECTIVE', 'SSR directive is unsupported', 'A browser-only directive reached the server renderer.', 'The directive has no deterministic server contract.', 'Provide a server implementation or keep the directive in the browser path.', 'ssr'),
  entry(1401, 'GLUON_UNIVERSAL_ENTRY_MISSING', 'Universal client entry is missing', 'The Vite universal build emitted no client entry chunk.', 'The build input does not define an application entry.', 'Configure a client entry before enabling the universal manifest.', 'tooling'),
  entry(1402, 'GLUON_CHECK_INPUT_MISSING', 'Template checker input is missing', 'gluon-template-check received no files or directories.', 'The command requires an explicit project input.', 'Pass one or more source files or directories.', 'tooling'),
  entry(1403, 'GLUON_PLAYGROUND_PAYLOAD_INVALID', 'Playground payload is invalid', 'A shared Playground URL does not contain a valid two-file project.', 'The payload is malformed, truncated, or was not created by a compatible Playground version.', 'Open a new reproduction and share it again from the supported Playground.', 'tooling'),
  entry(1404, 'GLUON_PLAYGROUND_RENDER_EXPORT_MISSING', 'Playground render export is missing', 'The application module exports no supported render function.', 'The Playground requires a default, App, Counter, render, or other function export to produce a Gluon template.', 'Export the component or render function that the Playground should mount.', 'tooling'),
  entry(1405, 'GLUON_PLAYGROUND_COMPILE_FAILED', 'Playground compilation failed', 'The edited TypeScript project could not be transpiled.', 'The application or stylesheet module contains invalid TypeScript syntax.', 'Correct the reported syntax error and run the reproduction again.', 'tooling'),
  entry(1406, 'GLUON_PLAYGROUND_IMPORT_UNSUPPORTED', 'Playground import is unsupported', 'A reproduction imports a package unavailable in the browser execution environment.', 'The online Playground intentionally exposes only its supported public Gluon runtime modules.', 'Use @gluonjs/core or @gluonjs/reactivity, or download the starter to add other dependencies locally.', 'tooling'),
  entry(1501, 'GLUON_DEVTOOLS_APPLICATION_ID_EMPTY', 'Devtools application ID is empty', 'A Devtools application registration has no stable ID.', 'Independent application snapshots require a non-empty identity.', 'Provide a stable application ID.', 'devtools'),
  entry(1502, 'GLUON_DEVTOOLS_APPLICATION_DUPLICATE', 'Devtools application ID is duplicated', 'Two registered applications use the same ID.', 'Protocol snapshots cannot distinguish duplicate identities.', 'Use a unique ID or unregister the previous application.', 'devtools'),
  entry(1503, 'GLUON_DEVTOOLS_APPLICATION_UNKNOWN', 'Devtools application is unknown', 'An operation targets an unregistered application.', 'The application was never registered or was already disposed.', 'Register it before recording or selecting it.', 'devtools'),
  entry(1504, 'GLUON_DEVTOOLS_DISABLED', 'Devtools bridge is disabled', 'A browser inspector mount was requested for an inert bridge.', 'Production-safe bridges are disabled by default.', 'Enable the bridge only in a development entry.', 'devtools'),
] as const satisfies readonly GluonDiagnosticDefinition[];

export const gluonDiagnosticCatalog: readonly GluonDiagnosticDefinition[] = Object.freeze(definitions);
const byCode = new Map<string, GluonDiagnosticDefinition>(definitions.flatMap((definition) => [[definition.code, definition], [definition.compactCode, definition]]));

export function getGluonDiagnostic(code: string): GluonDiagnosticDefinition | undefined { return byCode.get(code); }

export function formatGluonDiagnostic(
  code: string,
  detail = '',
  options: { readonly production?: boolean } = {},
): string {
  const definition = getGluonDiagnostic(code);
  if (!definition) return detail ? `${code}: ${detail}` : code;
  if (options.production) return detail ? `${definition.compactCode}: ${detail}` : definition.compactCode;
  return detail ? `${definition.code}: ${detail}` : `${definition.code}: ${definition.summary}`;
}

export function gluonDiagnosticReferenceUrl(code: string, base = '/diagnostics'): string {
  const definition = getGluonDiagnostic(code);
  const stableCode = definition?.code ?? code;
  return `${base.replace(/\/$/, '')}/${GLUON_DIAGNOSTIC_CATALOG_VERSION}/${encodeURIComponent(stableCode)}`;
}

function entry(
  id: number,
  code: string,
  title: string,
  summary: string,
  why: string,
  remediation: string,
  source: GluonDiagnosticSource,
  before?: string,
  after?: string,
): GluonDiagnosticDefinition {
  return Object.freeze({ id, code, compactCode: `G${id}`, title, summary, why, remediation, source, before, after }) as GluonDiagnosticDefinition;
}
