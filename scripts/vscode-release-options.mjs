import { resolve } from 'node:path';

const stableVersion = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;

export function resolveVscodeReleaseOptions({ argv, env, root, rootVersion, defaultOutput }) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    if (!['--version', '--tag', '--output'].includes(name)) throw new Error(`Unknown option ${name}.`);
    if (values.has(name)) throw new Error(`Option ${name} may only be provided once.`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Option ${name} requires a value.`);
    values.set(name, value);
    index += 1;
  }

  const explicitVersion = values.get('--version');
  const explicitTag = values.get('--tag');
  if (explicitVersion && env.RELEASE_VERSION && explicitVersion !== env.RELEASE_VERSION) {
    throw new Error(`--version ${explicitVersion} does not match RELEASE_VERSION ${env.RELEASE_VERSION}.`);
  }
  if (explicitTag && env.RELEASE_TAG && explicitTag !== env.RELEASE_TAG) {
    throw new Error(`--tag ${explicitTag} does not match RELEASE_TAG ${env.RELEASE_TAG}.`);
  }

  const version = explicitVersion ?? env.RELEASE_VERSION ?? rootVersion;
  const tag = explicitTag ?? env.RELEASE_TAG ?? `v${version}`;
  if (!stableVersion.test(version)) throw new Error(`Invalid stable VS Code release version ${version}.`);
  if (version !== rootVersion) throw new Error(`Requested VS Code version ${version} does not match package train ${rootVersion}.`);
  if (tag !== `v${version}`) throw new Error(`Requested VS Code tag ${tag} must equal v${version}.`);

  const outputValue = values.get('--output') ?? defaultOutput;
  if (!outputValue?.trim()) throw new Error('VS Code release output path must not be empty.');
  return { version, tag, output: resolve(root, outputValue) };
}
