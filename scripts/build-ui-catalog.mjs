import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'docs-site/data/ui-catalog.json');
const versions = JSON.parse(await readFile(resolve(root, 'docs-site/versions.json'), 'utf8'));
const docsVersion = versions.latest;
const checkOnly = process.argv.includes('--check');
const sources = [
  { package: '@gluonjs/atoms', layer: 'atom', file: 'packages/atoms/src/manifest.ts' },
  { package: '@gluonjs/molecules', layer: 'molecule', file: 'packages/molecules/src/manifest.ts' },
  { package: '@gluonjs/organisms', layer: 'organism', file: 'packages/organisms/src/manifest.ts' },
];

const componentMetadata = {
  AspectRatio: { preview: 'aspect-ratio', variants: ['16:9', '1:1', '4:3'], states: ['default'] },
  Avatar: { preview: 'avatar', variants: ['image', 'initials', 'fallback'], states: ['loading', 'loaded', 'error'] },
  Badge: { preview: 'badge', variants: ['neutral', 'info', 'success', 'warning', 'danger'], states: ['default'] },
  Button: { preview: 'button', variants: ['primary', 'secondary', 'ghost'], states: ['default', 'disabled', 'loading'] },
  Checkbox: { preview: 'checkbox', variants: ['default', 'indeterminate'], states: ['unchecked', 'checked', 'disabled', 'invalid'] },
  DateInput: { preview: 'date-input', variants: ['default'], states: ['default', 'disabled', 'invalid'] },
  Heading: { preview: 'heading', variants: ['level-1', 'level-2', 'level-3', 'level-4', 'level-5', 'level-6'], states: ['default', 'focusable'] },
  Icon: { preview: 'icon', variants: ['decorative', 'informative'], states: ['default'] },
  Image: { preview: 'image', variants: ['responsive', 'intrinsic'], states: ['loading', 'loaded', 'error'] },
  Input: { preview: 'input', variants: ['text', 'email', 'search'], states: ['default', 'disabled', 'invalid'] },
  Label: { preview: 'label', variants: ['default', 'required', 'optional'], states: ['default'] },
  Link: { preview: 'link', variants: ['default', 'external'], states: ['default', 'focus-visible'] },
  Meter: { preview: 'meter', variants: ['default'], states: ['determinate'] },
  NumberInput: { preview: 'number-input', variants: ['default'], states: ['default', 'disabled', 'invalid'] },
  Progress: { preview: 'progress', variants: ['determinate', 'indeterminate'], states: ['default'] },
  Radio: { preview: 'radio', variants: ['default'], states: ['unchecked', 'checked', 'disabled', 'invalid'] },
  ScrollArea: { preview: 'scroll-area', variants: ['vertical', 'horizontal', 'both'], states: ['default', 'overflow'] },
  Select: { preview: 'select', variants: ['default', 'compact'], states: ['default', 'disabled', 'invalid'] },
  Separator: { preview: 'separator', variants: ['horizontal', 'vertical'], states: ['default'] },
  Skeleton: { preview: 'skeleton', variants: ['text', 'block'], states: ['loading'] },
  Slider: { preview: 'slider', variants: ['horizontal', 'vertical'], states: ['default', 'disabled'] },
  Spinner: { preview: 'spinner', variants: ['inline'], states: ['loading'] },
  StatusBadge: { preview: 'badge', variants: ['neutral', 'success', 'warning', 'danger'], states: ['default'] },
  Switch: { preview: 'switch', variants: ['default'], states: ['off', 'on', 'disabled'] },
  Text: { preview: 'text', variants: ['paragraph', 'span', 'muted', 'danger'], states: ['default'] },
  Textarea: { preview: 'textarea', variants: ['default'], states: ['default', 'disabled', 'invalid'] },
  TimeInput: { preview: 'time-input', variants: ['default'], states: ['default', 'disabled', 'invalid'] },
  ToggleButton: { preview: 'toggle-button', variants: ['default', 'ghost'], states: ['off', 'on', 'disabled'] },
  Accordion: { preview: 'accordion', variants: ['single', 'multiple'], states: ['collapsed', 'expanded'] },
  ButtonGroup: { preview: 'button-group', variants: ['attached', 'spaced'], states: ['default'] },
  Card: { preview: 'card', variants: ['default', 'interactive'], states: ['default'] },
  ChoiceGroup: { preview: 'choice-group', variants: ['radio', 'checkbox'], states: ['default', 'invalid', 'disabled'] },
  ContextMenu: { preview: 'menu', variants: ['pointer', 'keyboard'], states: ['closed', 'open'] },
  ControlField: { preview: 'field', variants: ['default', 'inline'], states: ['default', 'invalid', 'disabled'] },
  DialogSurface: { preview: 'dialog', variants: ['default', 'destructive'], states: ['closed', 'open'] },
  Disclosure: { preview: 'disclosure', variants: ['default', 'unavailable'], states: ['closed', 'open', 'disabled'] },
  DropdownMenu: { preview: 'menu', variants: ['default', 'nested'], states: ['closed', 'open'] },
  EmptyState: { preview: 'empty-state', variants: ['compact', 'full'], states: ['empty', 'recovery'] },
  FormField: { preview: 'field', variants: ['default'], states: ['default', 'invalid', 'disabled'] },
  InlineNotice: { preview: 'notice', variants: ['info', 'success', 'warning', 'danger'], states: ['static', 'polite', 'assertive'] },
  Menubar: { preview: 'menubar', variants: ['horizontal', 'vertical'], states: ['closed', 'open'] },
  NavigationMenu: { preview: 'navigation-menu', variants: ['horizontal', 'vertical'], states: ['closed', 'open'] },
  NavigationStrip: { preview: 'navigation-strip', variants: ['inline', 'overflow'], states: ['default', 'overflow'] },
  OneTimePasswordField: { preview: 'otp', variants: ['numeric', 'alphanumeric'], states: ['empty', 'complete', 'invalid'] },
  PasswordToggleField: { preview: 'password', variants: ['hidden', 'visible'], states: ['default', 'invalid'] },
  ResponsiveActionBar: { preview: 'action-bar', variants: ['inline', 'sticky'], states: ['idle', 'busy', 'disabled'] },
  ResponsiveDisclosure: { preview: 'disclosure', variants: ['compact', 'expanded'], states: ['closed', 'open'] },
  SearchField: { preview: 'search', variants: ['default', 'busy'], states: ['empty', 'populated', 'busy', 'invalid'] },
  SearchResults: { preview: 'results', variants: ['loaded', 'empty', 'partial-failure'], states: ['loading', 'loaded', 'empty', 'error'] },
  SegmentedControl: { preview: 'segmented', variants: ['horizontal', 'vertical'], states: ['selected', 'disabled'] },
  TableRegion: { preview: 'table', variants: ['normal', 'overflow'], states: ['loaded', 'empty', 'overflow'] },
  Tabs: { preview: 'tabs', variants: ['automatic', 'manual'], states: ['selected', 'disabled'] },
  Toast: { preview: 'toast', variants: ['polite', 'assertive'], states: ['visible', 'dismissed'] },
  ToastViewport: { preview: 'toast-viewport', variants: ['top', 'bottom'], states: ['idle', 'visible'] },
  Toolbar: { preview: 'toolbar', variants: ['horizontal', 'vertical'], states: ['default', 'disabled'] },
  AppShell: { preview: 'app-shell', variants: ['default', 'sidebar'], states: ['default', 'responsive'] },
  ConfirmationDialog: { preview: 'confirmation-dialog', variants: ['info', 'destructive'], states: ['closed', 'open', 'busy'] },
  WorkflowTimeline: { preview: 'workflow', variants: ['active', 'blocked', 'complete'], states: ['pending', 'active', 'complete'] },
};

const entries = [];
for (const source of sources) {
  const text = await readFile(resolve(root, source.file), 'utf8');
  for (const line of text.split('\n')) {
    const match = line.match(/^\s*\{ name: '([^']+)'(.*)\},?\s*$/);
    if (!match) continue;
    const fields = match[2];
    const name = match[1];
    const metadata = componentMetadata[name];
    const kind = fieldString(fields, 'kind') ?? 'component';
    if (kind !== 'component') continue;
    if (!metadata && !fieldString(fields, 'preview')) {
      throw new Error(`Missing catalog metadata for component ${source.package}/${name}`);
    }
    entries.push({
      package: source.package,
      layer: source.layer,
      name,
      kind,
      status: fieldString(fields, 'status') ?? 'stable',
      styles: fieldArray(fields, 'styles'),
      variants: fieldArray(fields, 'variants') ?? metadata?.variants ?? ['default'],
      states: fieldArray(fields, 'states') ?? metadata?.states ?? ['default'],
      preview: metadata?.preview ?? fieldString(fields, 'preview') ?? 'contract',
      accessibility: fieldString(fields, 'accessibility') ?? '',
      extension: fieldString(fields, 'extension') ?? '',
      example: 'docs-site/examples/ui-system.ts',
      tests: ['tests/ui-system.spec.ts', 'tests/ui-visual.spec.ts'],
      api: `/gluon/${docsVersion}/api/generated/packages/${source.layer === 'atom' ? 'atoms' : `${source.layer}s`}/src/variables/${name}.html`,
      source: `https://github.com/marcmalerei/gluon/blob/main/packages/${source.layer === 'atom' ? 'atoms' : `${source.layer}s`}/src/`,
    });
  }
}

const catalog = {
  schemaVersion: 1,
  generatedFrom: sources.map(({ file }) => file),
  entries: entries.sort((left, right) => left.layer.localeCompare(right.layer) || left.name.localeCompare(right.name)),
};
const serialized = `${JSON.stringify(catalog, null, 2)}\n`;

if (checkOnly) {
  const current = await readFile(output, 'utf8').catch(() => undefined);
  if (current !== serialized) {
    console.error(`UI catalog is stale: ${output}`);
    process.exitCode = 1;
  } else {
    console.log(`validated UI catalog (${entries.length} entries)`);
  }
} else {
  await mkdir(resolve(root, 'docs-site/data'), { recursive: true });
  await writeFile(output, serialized, 'utf8');
  console.log(`generated UI catalog (${entries.length} entries)`);
}

function fieldString(fields, name) {
  return fields.match(new RegExp(`${name}: '([^']*)'`))?.[1];
}

function fieldArray(fields, name) {
  const value = fields.match(new RegExp(`${name}: \\[(.*?)\\]`))?.[1];
  if (!value) return undefined;
  return [...value.matchAll(/'([^']+)'/g)].map((match) => match[1]);
}
