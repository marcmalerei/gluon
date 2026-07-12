import {
  addComponent,
  planComponent,
  ScaffoldError,
  normalizeFeatures,
  parseCliArguments,
  scaffoldProject,
  type GluonFeatures,
  type AddComponentResult,
  type ComponentKind,
  type ScaffoldResult,
} from '../packages/create-gluon/dist/index.js';

const features: GluonFeatures = normalizeFeatures({ ssr: true, testing: true });
const parsed = parseCliArguments(['app', '--yes', '--router']);
const result: Promise<ScaffoldResult> = scaffoldProject({
  directory: 'app',
  name: '@example/app',
  ...features,
});
void parsed;
void result;

const kind: ComponentKind = 'element';
const componentResult: Promise<AddComponentResult> = addComponent({
  kind,
  name: 'AccountControl',
  root: 'app',
  tagName: 'app-account-control',
  dryRun: true,
});
const componentPlan: Promise<AddComponentResult> = planComponent({
  kind: 'headless',
  name: 'DialogFocus',
  root: 'app',
});
void componentResult;
void componentPlan;

const error = new ScaffoldError('INVALID_DIRECTORY', 'missing');
error.code satisfies 'INVALID_DIRECTORY' | 'INVALID_COMBINATION' | 'INVALID_PROJECT_NAME' | 'DIRECTORY_NOT_EMPTY';

// @ts-expect-error directory is required
scaffoldProject({ router: true });

// @ts-expect-error unsupported component kind
addComponent({ kind: 'page', name: 'Page', root: 'app' });
