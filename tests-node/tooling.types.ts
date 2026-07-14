import type { Plugin } from 'vite';
import {
  transformGluonModule,
  transpileGluonDecorators,
  type GluonDecoratorMode,
  type GluonTemplateLocation,
  type GluonTranspileResult,
} from '../packages/compiler/dist/index.js';
import {
  formatGluonDiagnostic,
  getGluonDiagnostic,
  type GluonDiagnosticDefinition,
} from '../packages/compiler/dist/diagnostics.js';
import gluon, { type GluonVitePluginOptions } from '../packages/vite/dist/index.js';

const options: GluonVitePluginOptions = {
  decorators: 'standard',
  diagnostics: true,
  include: (id) => id.endsWith('.ts'),
  universal: { manifestFile: 'assets.json' },
};
const plugin: Plugin = gluon(options);
void plugin;

const result = transformGluonModule(
  "import { html } from '@gluonjs/core'; html`<p>${value}</p>`;",
  '/src/page.ts',
  { development: true },
);
const template: GluonTemplateLocation | undefined = result.templates[0];
template?.parts[0]?.start.line.toFixed();
result.map.mappings.toUpperCase();
const decoratorMode: GluonDecoratorMode = 'standard';
const transpiled: GluonTranspileResult = transpileGluonDecorators(
  "import { property } from '@gluonjs/core/decorators'; class Card { @property() name = ''; }",
  '/src/card.ts',
  decoratorMode,
);
transpiled.code.toUpperCase();
const diagnostic: GluonDiagnosticDefinition | undefined = getGluonDiagnostic('G1107');
formatGluonDiagnostic(diagnostic?.code ?? '', 'detail', { production: true });

// @ts-expect-error development is a boolean compiler mode
transformGluonModule('', '/src/page.ts', { development: 'yes' });
// @ts-expect-error include accepts only a RegExp or predicate
gluon({ include: 42 });
// @ts-expect-error decorator mode is standard or legacy
gluon({ decorators: 'experimental' });
