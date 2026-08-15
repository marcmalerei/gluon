import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, '..');
const reportPath = resolve(root, '.tmp/test-dependency-security-report.json');
const productionReportPath = resolve(root, '.tmp/test-dependency-security-production-report.json');
const outputPath = resolve(root, '.tmp/test-dependency-security-summary.json');
const exceptionsPath = resolve(root, '.tmp/test-dependency-security-exceptions.json');

test('dependency security policy keeps dev-only findings report-only and blocks unapproved production findings', async () => {
  await mkdir(resolve(root, '.tmp'), { recursive: true });
  const report = {
    vulnerabilities: {
      'js-yaml': {
        name: 'js-yaml',
        severity: 'high',
        title: 'js-yaml vulnerable via gray-matter',
        via: ['gray-matter'],
        nodes: ['node_modules/@11ty/eleventy/node_modules/gray-matter/node_modules/js-yaml'],
        effects: [],
      },
      'left-pad': {
        name: 'left-pad',
        severity: 'high',
        title: 'left-pad production vulnerability',
        via: ['left-pad'],
        nodes: ['node_modules/left-pad'],
        effects: [],
      },
    },
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(productionReportPath, `${JSON.stringify({
    vulnerabilities: { 'left-pad': report.vulnerabilities['left-pad'] },
  }, null, 2)}\n`);

  assert.throws(() => execFileSync(process.execPath, [
    'scripts/run-dependency-security-audit.mjs',
    '--report',
    reportPath,
    '--production-report',
    productionReportPath,
    '--output',
    outputPath,
    '--policy',
    'quality/dependency-security-policy.json',
    '--exceptions',
    'quality/dependency-security-exceptions.json',
  ], { cwd: root, encoding: 'utf8', stdio: 'pipe' }), /dependency policy blocked 1 findings/);

  const summary = JSON.parse(await readFile(outputPath, 'utf8'));
  assert.equal(summary.findings.length, 2);
  assert.equal(summary.blockingFindings.length, 1);
  assert.equal(summary.blockingFindings[0].package, 'left-pad');
  assert.equal(summary.blockingFindings[0].advisory, 'left-pad');
  assert.equal(summary.blockingFindings[0].scope, 'production');
  assert.equal(summary.findings.find((finding) => finding.package === 'js-yaml').scope, 'development');

  await writeFile(exceptionsPath, `${JSON.stringify({
    schemaVersion: 1,
    exceptions: [{
      owner: 'security-maintainer',
      reason: 'Temporary fixture exception',
      expiry: '2999-12-31',
      advisory: 'left-pad',
      package: 'left-pad',
      scope: 'production',
      severity: 'high',
    }],
  }, null, 2)}\n`);
  execFileSync(process.execPath, [
    'scripts/run-dependency-security-audit.mjs',
    '--report', reportPath,
    '--production-report', productionReportPath,
    '--output', outputPath,
    '--policy', 'quality/dependency-security-policy.json',
    '--exceptions', exceptionsPath,
  ], { cwd: root, encoding: 'utf8', stdio: 'pipe' });
  const exceptedSummary = JSON.parse(await readFile(outputPath, 'utf8'));
  assert.equal(exceptedSummary.blockingFindings.length, 0);
});
