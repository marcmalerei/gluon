import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const inventory = JSON.parse(await readFile(resolve(root, 'quality/trusted-types-sinks.json'), 'utf8'));
const required = new Set([
  'core-html-template', 'core-svg-template', 'core-hydration-expected-markup',
  'core-dynamic-contextual-fragment', 'core-dynamic-template-fallback',
  'core-srcdoc-property', 'core-srcdoc-attribute', 'ssr-progressive-patch',
  'ssr-dom-free-serialization', 'scoped-registry-probe',
  'test-utils-head-materialization', 'test-utils-state-materialization', 'test-utils-body-materialization',
  'generated-test-head-materialization', 'generated-test-body-materialization', 'generated-test-state-materialization',
]);

if (inventory.schemaVersion !== 1 || !Array.isArray(inventory.sinks)) throw new Error('Trusted Types sink inventory must use schemaVersion 1');
const ids = new Set();
for (const sink of inventory.sinks) {
  if (!sink.id || ids.has(sink.id)) throw new Error(`duplicate or empty Trusted Types sink id: ${sink.id}`);
  ids.add(sink.id);
  if (!sink.path || !sink.token || !sink.control || !sink.evidence) throw new Error(`${sink.id} has an incomplete sink contract`);
  const source = await readFile(resolve(root, sink.path), 'utf8');
  if (!source.includes(sink.token)) throw new Error(`${sink.id} token is stale in ${sink.path}`);
  await access(resolve(root, sink.evidence));
}
for (const id of required) if (!ids.has(id)) throw new Error(`Trusted Types sink inventory is missing ${id}`);

console.log(`Trusted Types sink inventory valid: ${inventory.sinks.length} parser, transport, and excluded test-fixture boundaries`);
