import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';

const root = resolve(import.meta.dirname, '..');
const policy = JSON.parse(await readFile(resolve(root, 'quality/dependency-security-policy.json'), 'utf8'));
const exceptions = JSON.parse(await readFile(resolve(root, 'quality/dependency-security-exceptions.json'), 'utf8'));
const dependabot = await readFile(resolve(root, '.github/dependabot.yml'), 'utf8');
const workflow = await readFile(resolve(root, '.github/workflows/dependency-security.yml'), 'utf8');
const policySchema = JSON.parse(await readFile(resolve(root, 'schemas/dependency-security-policy.schema.json'), 'utf8'));
const exceptionsSchema = JSON.parse(await readFile(resolve(root, 'schemas/dependency-security-exceptions.schema.json'), 'utf8'));
const validator = new Ajv2020({ allErrors: true, strict: false });
const validatePolicy = validator.compile(policySchema);
const validateExceptions = validator.compile(exceptionsSchema);

if (!validatePolicy(policy)) throw new Error(`dependency security policy schema validation failed: ${validator.errorsText(validatePolicy.errors)}`);
if (!validateExceptions(exceptions)) throw new Error(`dependency security exceptions schema validation failed: ${validator.errorsText(validateExceptions.errors)}`);
if (policy.defaultAction !== 'report') throw new Error('dependency security policy must default to report.');
if (policy.severityPolicy.critical.production !== 'block' || policy.severityPolicy.critical.development !== 'block') {
  throw new Error('critical vulnerabilities must block in both production and development scopes.');
}
if (policy.severityPolicy.high.production !== 'block' || policy.severityPolicy.high.development !== 'report') {
  throw new Error('high vulnerabilities must block production and report development.');
}
if (policy.severityPolicy.moderate.production !== 'block' || policy.severityPolicy.moderate.development !== 'report') {
  throw new Error('moderate vulnerabilities must block production and report development.');
}
if (policy.scopePolicy.production !== 'release-blocking' || policy.scopePolicy.development !== 'advisory') {
  throw new Error('scope policy must keep production release-blocking and development advisory.');
}
if (policy.exceptionFields.join(',') !== ['owner', 'reason', 'expiry', 'advisory', 'package'].join(',')) {
  throw new Error('dependency security exception fields must remain owner, reason, expiry, advisory, package.');
}
const today = new Date().toISOString().slice(0, 10);
const exceptionKeys = new Set();
for (const exception of exceptions.exceptions) {
  const parsedExpiry = new Date(`${exception.expiry}T00:00:00Z`);
  if (Number.isNaN(parsedExpiry.valueOf()) || parsedExpiry.toISOString().slice(0, 10) !== exception.expiry) {
    throw new Error(`dependency security exception has invalid expiry: ${exception.expiry}`);
  }
  if (exception.expiry < today) throw new Error(`dependency security exception expired: ${exception.package} ${exception.advisory}`);
  const key = [exception.package, exception.advisory, exception.scope ?? '*', exception.severity ?? '*'].join('|');
  if (exceptionKeys.has(key)) throw new Error(`duplicate dependency security exception: ${key}`);
  exceptionKeys.add(key);
}
const requiredDependabotSnippets = [
  'package-ecosystem: npm',
  'package-ecosystem: github-actions',
  'interval: weekly',
  'day: monday',
  'open-pull-requests-limit: 8',
  'open-pull-requests-limit: 4',
  'direct-npm-dependencies',
  'github-actions-updates',
];
for (const snippet of requiredDependabotSnippets) {
  if (!dependabot.includes(snippet)) throw new Error(`dependabot config must include ${snippet}.`);
}
for (const snippet of [
  'schedule:',
  'workflow_dispatch:',
  'permissions:\n  contents: read',
  'npm ci --ignore-scripts --legacy-peer-deps',
  'npm run check:dependency-security',
  'if: ${{ always() }}',
  'actions/upload-artifact@v7',
]) {
  if (!workflow.includes(snippet)) throw new Error(`dependency security workflow must include ${snippet}.`);
}
if (workflow.includes('continue-on-error')) throw new Error('dependency security workflow must not suppress audit policy failures.');

console.log('dependency security policy valid: workflow, dependabot config, and exception contract parsed');
