import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { transformGluonModule } from '../packages/compiler/src/index.js';
import { parseQuery, stringifyQuery } from '../packages/router/src/query.js';
import { serializeSsrState } from '../packages/ssr/src/index.js';
import { formatVueMigrationReport, type VueMigrationReport } from '../packages/vue-migration-analyzer/src/index.js';

const propertyOptions = Object.freeze({ numRuns: 500, seed: 38, endOnFailure: true });

describe('deterministic property and fuzz gates', () => {
  it('keeps Router query encoding canonical after parsing', () => {
    fc.assert(fc.property(
      fc.dictionary(
        fc.string({ minLength: 1 }),
        fc.oneof(
          fc.string(),
          fc.constant(null),
          fc.array(fc.oneof(fc.string(), fc.constant(null)), { minLength: 1, maxLength: 5 }),
        ),
        { maxKeys: 12 },
      ),
      (query) => {
        const encoded = stringifyQuery(query);
        expect(stringifyQuery(parseQuery(encoded))).toBe(encoded);
      },
    ), propertyOptions);
  });

  it('parses arbitrary query input without throwing or producing mutable arrays', () => {
    fc.assert(fc.property(fc.string(), (input) => {
      const parsed = parseQuery(input);
      expect(Object.isFrozen(parsed)).toBe(true);
      for (const value of Object.values(parsed)) {
        if (Array.isArray(value)) expect(Object.isFrozen(value)).toBe(true);
      }
    }), propertyOptions);
  });

  it('round-trips JSON-compatible SSR state while escaping HTML script boundaries', () => {
    fc.assert(fc.property(fc.jsonValue(), (value) => {
      const serialized = serializeSsrState(value);
      expect(serialized).not.toMatch(/[<>&\u2028\u2029]/u);
      expect(JSON.stringify(JSON.parse(serialized))).toBe(JSON.stringify(value));
    }), propertyOptions);
  });

  it('transforms arbitrary string expressions deterministically', () => {
    fc.assert(fc.property(fc.string(), (value) => {
      const code = [
        "import { html } from '@gluonjs/core';",
        `export const view = () => html\`<p>\${${JSON.stringify(value)}}</p>\`;`,
      ].join('\n');
      const first = transformGluonModule(code, '/fixture.ts', { development: true });
      const second = transformGluonModule(code, '/fixture.ts', { development: true });
      expect(second).toEqual(first);
      expect(first.templates).toHaveLength(1);
    }), propertyOptions);
  });

  it('serializes retained analyzer reports deterministically for arbitrary declared names', () => {
    const retained = JSON.parse(readFileSync(
      new URL('../packages/vue-migration-analyzer/fixtures/expected/supported.json', import.meta.url),
      'utf8',
    )) as VueMigrationReport;
    fc.assert(fc.property(fc.string({ maxLength: 80 }), (name) => {
      const report = structuredClone(retained) as VueMigrationReport;
      const target = report.inventory.find((item) => item.name !== null);
      if (target) (target as { name: string | null }).name = name;
      const first = formatVueMigrationReport(report, 'json');
      expect(formatVueMigrationReport(report, 'json')).toBe(first);
      expect(JSON.parse(first).inventory).toHaveLength(report.inventory.length);
    }), { ...propertyOptions, numRuns: 100 });
  });
});
