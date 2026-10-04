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
const renderedPreviewKeys = new Set([
  'accordion', 'action-bar', 'admin-shell', 'app-shell', 'async-state', 'aspect-ratio', 'avatar', 'badge', 'button',
  'breadcrumbs', 'button-group', 'card', 'checkbox', 'confirmation-dialog', 'dialog', 'popover', 'sheet', 'disclosure', 'tooltip', 'stepper', 'filter-bar', 'data-list',
  'choice-group', 'control-field', 'empty-state', 'form-field', 'icon', 'input', 'label', 'listbox-field', 'menubar',
  'navigation-menu', 'navigation-strip', 'notice', 'otp', 'pagination', 'password', 'progress',
  'radio', 'results', 'scroll-area', 'search', 'segmented', 'select', 'separator',
  'slider', 'switch', 'table', 'tabs', 'textarea', 'toast', 'toast-viewport',
  'toggle-button', 'toolbar', 'workflow', 'product-card', 'product-gallery', 'product-grid', 'mega-menu', 'site-header', 'marketing-header', 'site-footer', 'page-layout', 'split-pane', 'resizable-panels', 'navigation-rail', 'sidebar-layout', 'wizard', 'dashboard-shell', 'combobox-field', 'command-palette', 'tree-view', 'sort-control', 'date-picker', 'date-range-picker', 'file-upload', 'time-picker', 'multi-select-field', 'calendar', 'heading', 'text', 'link', 'image', 'badge', 'skeleton', 'meter', 'spinner', 'number-input', 'date-input', 'time-input', 'file-input', 'choice-group', 'control-field', 'form-field', 'dropdown-menu', 'context-menu', 'responsive-disclosure',
]);

const entries = [];
for (const source of sources) {
  const text = await readFile(resolve(root, source.file), 'utf8');
  for (const line of text.split('\n')) {
    const match = line.match(/^\s*\{ name: '([^']+)'(.*)\},?\s*$/);
    if (!match) continue;
    const fields = match[2];
    const name = match[1];
    const kind = fieldString(fields, 'kind') ?? 'component';
    if (kind !== 'component') continue;
    const variants = fieldArray(fields, 'variants');
    const states = fieldArray(fields, 'states');
    const preview = fieldString(fields, 'preview');
    if (!variants || !states || !preview) {
      throw new Error(`Incomplete catalog metadata for component ${source.package}/${name}`);
    }
    if (!renderedPreviewKeys.has(preview)) {
      throw new Error(`Unknown UI catalog preview key ${preview} for ${source.package}/${name}`);
    }
    entries.push({
      package: source.package,
      layer: source.layer,
      name,
      kind,
      status: fieldString(fields, 'status') ?? 'stable',
      styles: fieldArray(fields, 'styles'),
      variants,
      states,
      preview,
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
  return [...value.matchAll(/'([^']+)'|\"([^\"]+)\"/g)].map((match) => match[1] ?? match[2]);
}
