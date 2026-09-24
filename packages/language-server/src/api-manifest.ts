export interface GluonApiManifestPackage {
  readonly name: string;
  readonly exports: readonly string[];
  readonly environment: string;
}

export interface GluonApiManifest {
  readonly schemaVersion: 1;
  readonly framework: 'gluon';
  readonly packageContract: string;
  readonly concepts: readonly string[];
  readonly diagnostics: Readonly<{ catalog: string; stableCodes: true }>;
  readonly validation: Readonly<{ projectAnalysis: string; templateCheck: string; json: true }>;
  readonly packages: readonly GluonApiManifestPackage[];
}

/** Stable agent-facing map of the public framework surfaces and validation tools. */
export const GLUON_API_MANIFEST: GluonApiManifest = Object.freeze({
  schemaVersion: 1,
  framework: 'gluon',
  packageContract: 'package-contract.json',
  concepts: Object.freeze([
    'components',
    'lifecycle',
    'reactivity',
    'store',
    'router',
    'ssr',
    'hydration',
    'i18n',
    'forms',
    'accessibility',
    'styles',
    'tooling',
  ]),
  diagnostics: Object.freeze({ catalog: '@gluonjs/compiler/diagnostics', stableCodes: true }),
  validation: Object.freeze({
    projectAnalysis: 'gluon-project-analyze',
    templateCheck: 'gluon-check',
    json: true,
  }),
  packages: Object.freeze([
    { name: '@gluonjs/reactivity', environment: 'universal', exports: ['.', './signals', './preact-signals'] },
    { name: '@gluonjs/compiler', environment: 'universal', exports: ['.', './diagnostics'] },
    { name: '@gluonjs/core', environment: 'browser', exports: ['.', './decorators', './styles', './analytics'] },
    { name: '@gluonjs/router', environment: 'browser', exports: ['.', './memory'] },
    { name: '@gluonjs/store', environment: 'universal', exports: ['.'] },
    { name: '@gluonjs/i18n', environment: 'browser', exports: ['.'] },
    { name: '@gluonjs/ssr', environment: 'node', exports: ['.', './eleventy', './hydration', './static', './streaming', './tenant'] },
    { name: '@gluonjs/vite', environment: 'node', exports: ['.', './tailwind'] },
    { name: '@gluonjs/gluon-components-vite', environment: 'browser', exports: ['.', './entry-preview', './preset', './renderer-preset'] },
    { name: '@gluonjs/test-utils', environment: 'browser', exports: ['.', './ssr'] },
    { name: '@gluonjs/devtools-api', environment: 'universal', exports: ['.'] },
    { name: '@gluonjs/devtools', environment: 'browser', exports: ['.'] },
    { name: '@gluonjs/graph', environment: 'browser', exports: ['.'] },
    { name: '@gluonjs/language-server', environment: 'node', exports: ['.'] },
    { name: '@gluonjs/vue-migration-analyzer', environment: 'node', exports: ['.', './schema'] },
    { name: '@gluonjs/quarks', environment: 'browser', exports: ['.'] },
    { name: '@gluonjs/atoms', environment: 'browser', exports: ['.'] },
    { name: '@gluonjs/molecules', environment: 'browser', exports: ['.'] },
    { name: '@gluonjs/organisms', environment: 'browser', exports: ['.'] },
    { name: '@gluonjs/json-forms', environment: 'browser', exports: ['.'] },
    { name: 'create-gluon', environment: 'node', exports: ['.'] },
  ]),
});

export function getGluonApiManifest(): GluonApiManifest {
  return GLUON_API_MANIFEST;
}
