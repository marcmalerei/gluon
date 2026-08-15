import { describe, expect, it } from 'vitest';
import { JsonForm, resolveJsonSchema, type JsonSchema } from '../packages/json-forms/src/index.js';
import { renderToString } from '../packages/ssr/src/index.js';

describe('@gluonjs/json-forms SSR', () => {
  it('serializes the same local-reference template deterministically', async () => {
    const schema = {
      type: 'object',
      properties: { email: { $ref: '#/$defs/contact' } },
      $defs: { contact: { type: 'string', format: 'email', title: 'Dispatch email' } },
    } satisfies JsonSchema;
    const firstSchema = resolveJsonSchema(schema);
    const secondSchema = resolveJsonSchema(schema);
    const first = await renderToString(JsonForm({ schema: firstSchema, data: { email: 'dispatch@example.test' } }));
    const second = await renderToString(JsonForm({ schema: secondSchema, data: { email: 'dispatch@example.test' } }));

    expect(JSON.stringify(firstSchema)).toBe(JSON.stringify(secondSchema));
    expect(first).toBe(second);
    expect(first).toContain('<gluon-json-form');
  });
});
