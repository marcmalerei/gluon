import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const model = JSON.parse(await readFile(resolve(root, 'quality/security-threat-model.json'), 'utf8'));
const requiredAreas = ['html', 'urls', 'styles', 'ssr-state', 'csp', 'trusted-types', 'vue-source-analysis', 'component-generation'];
const allowedStatuses = new Set(['mitigated', 'accepted-boundary', 'not-claimed']);

if (model.schemaVersion !== 1) throw new Error('security threat model schemaVersion must be 1');
if (model.releaseLine !== '1.0.1') throw new Error('security threat model releaseLine must match 1.0.1');
if (!/^\d{4}-\d{2}-\d{2}$/.test(model.reviewedAt)) throw new Error('security threat model reviewedAt must be YYYY-MM-DD');

const ids = model.areas.map((area) => area.id);
if (new Set(ids).size !== ids.length) throw new Error('security threat model area ids must be unique');
for (const id of requiredAreas) {
  const area = model.areas.find((entry) => entry.id === id);
  if (!area) throw new Error(`security threat model is missing ${id}`);
  if (!allowedStatuses.has(area.status)) throw new Error(`${id} has unsupported status ${area.status}`);
  if (!Array.isArray(area.controls) || area.controls.length === 0) throw new Error(`${id} has no controls`);
  if (typeof area.residualRisk !== 'string' || area.residualRisk.length === 0) throw new Error(`${id} has no residual risk`);
  if (!Array.isArray(area.evidence) || area.evidence.length === 0) throw new Error(`${id} has no evidence`);
  for (const path of area.evidence) await access(resolve(root, path));
}

console.log(`security evidence valid: ${requiredAreas.length} threat areas with repository evidence`);
