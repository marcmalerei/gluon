import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

const evidenceFile = new URL('../benchmarks/ui-component-styles-2026-07-12.json', import.meta.url);
const sheet = async (file, name) => {
  const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
  const match = source.match(new RegExp(`export const ${name} = css` + '`' + `([\\s\\S]*?)` + '`'));
  if (!match?.[1]) throw new Error(`Could not measure ${name} in ${file}.`);
  return match[1];
};
const measure = (sheets, modules) => {
  const cssText = sheets.join('\n');
  return {
    rawBytes: Buffer.byteLength(cssText),
    gzipBytes: gzipSync(cssText, { level: 9 }).byteLength,
    moduleCount: modules.length,
    modules,
    stylesheetCount: sheets.length,
    selectors: [...new Set(cssText.match(/\.gluon-[a-z-]+/g) ?? [])].sort(),
  };
};

const atomStyles = await sheet('packages/atoms/src/styles.ts', 'atomStyles');
const moleculeStyles = await sheet('packages/molecules/src/styles.ts', 'moleculeStyles');
const organismStyles = await sheet('packages/organisms/src/styles.ts', 'organismStyles');
const buttonStyles = await sheet('packages/atoms/src/button-styles.ts', 'buttonStyles');
const iconStyles = await sheet('packages/atoms/src/icon-styles.ts', 'iconStyles');
const inputStyles = await sheet('packages/atoms/src/input-styles.ts', 'inputStyles');
const labelStyles = await sheet('packages/atoms/src/label-styles.ts', 'labelStyles');
const cardStyles = await sheet('packages/molecules/src/card-styles.ts', 'cardStyles');
const formFieldStyles = await sheet('packages/molecules/src/form-field-styles.ts', 'formFieldStyles');
const appShellStyles = await sheet('packages/organisms/src/app-shell-styles.ts', 'appShellStyles');

const actual = {
  schemaVersion: 1,
  measuredAt: '2026-07-12',
  fullUiExample: {
    before: measure(
      [atomStyles, moleculeStyles, organismStyles],
      ['packages/atoms/src/styles.ts', 'packages/molecules/src/styles.ts', 'packages/organisms/src/styles.ts'],
    ),
    after: measure(
      [buttonStyles, iconStyles, inputStyles, labelStyles, cardStyles, formFieldStyles, appShellStyles],
      [
        'packages/atoms/src/button-styles.ts',
        'packages/atoms/src/icon-styles.ts',
        'packages/atoms/src/input-styles.ts',
        'packages/atoms/src/label-styles.ts',
        'packages/molecules/src/card-styles.ts',
        'packages/molecules/src/form-field-styles.ts',
        'packages/organisms/src/app-shell-styles.ts',
      ],
    ),
  },
  buttonOnly: {
    before: measure([atomStyles], ['packages/atoms/src/styles.ts']),
    after: measure([buttonStyles], ['packages/atoms/src/button-styles.ts']),
  },
  limitations: [
    'Raw and gzip values measure serialized constructable stylesheet text at gzip level 9, not JavaScript chunks.',
    'Recorded gzip bytes use Node.js 22.22.0 zlib output; the blocking check validates their presence but excludes the value from cross-Node equality because supported Node/zlib versions can emit different byte counts for identical input.',
    'Module and stylesheet counts describe the retained full UI and Button-only style boundaries; runtime timing is not inferred.',
    'No size or speed superiority claim is made.',
  ],
};

if (process.argv.includes('--check')) {
  const expected = JSON.parse(await readFile(evidenceFile, 'utf8'));
  const forCheck = (evidence) => {
    const comparable = structuredClone(evidence);
    for (const section of [comparable.fullUiExample.before, comparable.fullUiExample.after, comparable.buttonOnly.before, comparable.buttonOnly.after]) {
      if (!Number.isInteger(section.gzipBytes) || section.gzipBytes <= 0) {
        throw new Error('Component style gzip evidence must be a positive integer.');
      }
      delete section.gzipBytes;
    }
    return comparable;
  };
  if (JSON.stringify(forCheck(expected)) !== JSON.stringify(forCheck(actual))) {
    throw new Error('Component style measurement evidence is stale.');
  }
  console.log(`Component style evidence valid: Button-only ${actual.buttonOnly.before.rawBytes} -> ${actual.buttonOnly.after.rawBytes} raw bytes`);
} else {
  console.log(JSON.stringify(actual, null, 2));
}
