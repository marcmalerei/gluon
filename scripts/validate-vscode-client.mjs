import { readFile } from 'node:fs/promises';

const root = new URL('..', import.meta.url);

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), 'utf8'));
}

const rootPackage = await readJson('package.json');
const extensionPackage = await readJson('editors/vscode/package.json');
const extensionSource = await readFile(new URL('editors/vscode/extension.cjs', root), 'utf8');
const failures = [];

function requireValue(condition, message) {
  if (!condition) failures.push(message);
}

requireValue(extensionPackage.version === rootPackage.version, `VS Code version ${extensionPackage.version} must match lockstep version ${rootPackage.version}.`);
requireValue(extensionPackage.private !== true, 'VS Code client must be releasable and cannot be private.');
requireValue(typeof extensionPackage.publisher === 'string' && extensionPackage.publisher.length > 0, 'VS Code client needs a publisher id.');
requireValue(extensionPackage.main === './extension.cjs', 'VS Code client main must remain ./extension.cjs.');
requireValue(extensionPackage.scripts?.package === 'vsce package', 'VS Code client must expose a deterministic VSIX package script.');
requireValue(extensionPackage.activationEvents?.includes('onLanguage:typescript'), 'VS Code client must activate for TypeScript.');
requireValue(extensionPackage.activationEvents?.includes('onLanguage:javascript'), 'VS Code client must activate for JavaScript.');
requireValue(extensionPackage.contributes?.configuration?.properties?.['gluon.languageServerPath'], 'VS Code client must expose gluon.languageServerPath.');
requireValue(extensionPackage.contributes?.configuration?.properties?.['gluon.languageServerArgs'], 'VS Code client must expose gluon.languageServerArgs.');
requireValue(extensionPackage.dependencies?.['vscode-languageclient'], 'VS Code client must declare vscode-languageclient.');
requireValue(extensionPackage.devDependencies?.['@vscode/vsce'], 'VS Code client must declare the VSIX packager.');
requireValue(extensionSource.includes("'gluon-language-server'"), 'VS Code client must have the documented PATH fallback.');
requireValue(extensionSource.includes("['--stdio']"), 'VS Code client must keep stdio as the safe default transport.');
requireValue(extensionSource.includes('TransportKind.stdio'), 'VS Code client must use stdio transport.');

const readme = await readFile(new URL('editors/vscode/README.md', root), 'utf8');
requireValue(readme.includes('npm install --global @gluonjs/language-server@'), 'VS Code install guide must pin the matching language-server version.');
requireValue(readme.includes('code --install-extension'), 'VS Code install guide must document VSIX installation.');

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`VS Code client contract valid for Gluon ${rootPackage.version}.`);
}
