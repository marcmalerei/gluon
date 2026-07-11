import {
  ScaffoldError,
  normalizeFeatures,
  parseCliArguments,
  scaffoldProject,
  type GluonFeatures,
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

const error = new ScaffoldError('INVALID_DIRECTORY', 'missing');
error.code satisfies 'INVALID_DIRECTORY' | 'INVALID_COMBINATION' | 'INVALID_PROJECT_NAME' | 'DIRECTORY_NOT_EMPTY';

// @ts-expect-error directory is required
scaffoldProject({ router: true });
