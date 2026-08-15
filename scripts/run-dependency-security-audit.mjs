import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const root = resolve(import.meta.dirname, '..');
const reportPath = argumentPath('--report', resolve(root, '.tmp/dependency-security/npm-audit.json'));
const productionReportPath = argumentPath('--production-report', resolve(root, '.tmp/dependency-security/npm-audit-production.json'));
const outputPath = argumentPath('--output', resolve(root, '.tmp/dependency-security/audit-summary.json'));
const policyPath = argumentPath('--policy', resolve(root, 'quality/dependency-security-policy.json'));
const exceptionsPath = argumentPath('--exceptions', resolve(root, 'quality/dependency-security-exceptions.json'));

await mkdir(resolve(root, '.tmp/dependency-security'), { recursive: true });

if (!process.argv.includes('--report')) {
  await writeJson(reportPath, runAudit([]));
  await writeJson(productionReportPath, runAudit(['--omit=dev']));
} else if (!process.argv.includes('--production-report')) {
  throw new TypeError('--report requires --production-report so dependency scope cannot be guessed.');
}

const report = await readJson(reportPath);
const productionReport = await readJson(productionReportPath);
const policy = await readJson(policyPath);
const exceptions = await readJson(exceptionsPath);
const summary = evaluate(report, productionReport, policy, exceptions);
await writeJson(outputPath, summary);

if (summary.blockingFindings.length > 0) {
  throw new Error(`dependency policy blocked ${summary.blockingFindings.length} findings; see ${outputPath}`);
}

console.log(`dependency audit policy passed: ${summary.findings.length} findings evaluated; reports at ${reportPath} and ${productionReportPath}`);

function argumentPath(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index < 0) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) throw new TypeError(`${flag} requires a path.`);
  return resolve(root, value);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function runAudit(extraArguments) {
  try {
    return JSON.parse(execFileSync('npm', ['audit', '--json', '--ignore-scripts', ...extraArguments], {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        npm_config_loglevel: 'error',
        npm_config_fund: 'false',
        npm_config_audit: 'true',
        npm_config_update_notifier: 'false',
      },
    }));
  } catch (error) {
    if (error?.stdout) return JSON.parse(error.stdout);
    throw error;
  }
}

function evaluate(report, productionReport, policy, exceptions) {
  const productionPackages = new Set(Object.keys(productionReport.vulnerabilities ?? {}));
  const findings = collectFindings(report, productionPackages);
  const blockingFindings = findings.filter((finding) => shouldBlock(finding, policy, exceptions));
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    findings,
    blockingFindings,
  };
}

function collectFindings(report, productionPackages) {
  return Object.values(report.vulnerabilities ?? {}).flatMap((entry) => {
    const advisoryEntries = entry.via?.length ? entry.via : [entry.name];
    return advisoryEntries.map((advisory) => ({
      package: entry.name,
      advisory: advisoryIdentity(advisory),
      title: typeof advisory === 'object' ? advisory.title ?? entry.name : String(advisory),
      severity: typeof advisory === 'object' ? advisory.severity ?? entry.severity : entry.severity,
      via: normalizeVia(entry.via),
      paths: flattenPaths(entry.nodes ?? [], entry.effects ?? [], entry.findings ?? []),
      scope: productionPackages.has(entry.name) ? 'production' : 'development',
      fixAvailable: entry.fixAvailable ?? false,
    }));
  });
}

function shouldBlock(finding, policy, exceptions) {
  const today = new Date().toISOString().slice(0, 10);
  const exception = (exceptions.exceptions ?? []).find((entry) => (
    entry.package === finding.package
      && entry.advisory === finding.advisory
      && entry.expiry >= today
      && (!entry.scope || entry.scope === finding.scope)
      && (!entry.severity || entry.severity === finding.severity)
  ));
  if (exception) return false;
  return policy.severityPolicy[finding.severity]?.[finding.scope] === 'block';
}

function advisoryIdentity(advisory) {
  if (typeof advisory === 'string') return advisory;
  return String(advisory.source ?? advisory.url ?? advisory.name ?? advisory.title ?? 'unknown');
}

function normalizeVia(via) {
  return (via ?? []).map(advisoryIdentity);
}

function flattenPaths(nodes, effects, findings) {
  return [...nodes, ...effects, ...findings.flatMap((finding) => finding.paths ?? [])].filter(Boolean);
}
