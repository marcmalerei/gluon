import { describe, expect, it } from 'vitest';
import {
  JsonSchemaResolutionError,
  resolveJsonSchema,
  type JsonSchema,
} from '../packages/json-forms/src/schema.js';

function diagnostic(schema: JsonSchema, options?: Parameters<typeof resolveJsonSchema>[1]): string {
  try { resolveJsonSchema(schema, options); } catch (error) {
    expect(error).toBeInstanceOf(JsonSchemaResolutionError);
    return (error as JsonSchemaResolutionError).keyword;
  }
  throw new Error('Expected schema resolution to fail.');
}

describe('@gluonjs/json-forms local reference resolver', () => {
  it('decodes RFC 6901 tokens and supports deterministic deeper pointers', () => {
    const schema = {
      type: 'object',
      properties: {
        slash: { $ref: '#/$defs/a~1b' },
        tilde: { $ref: '#/$defs/a~0b' },
        literalEscape: { $ref: '#/$defs/a~01' },
        deep: { $ref: '#/$defs/group/properties/value' },
      },
      $defs: {
        'a/b': { type: 'string', title: 'Slash' },
        'a~b': { type: 'string', title: 'Tilde' },
        'a~1': { type: 'string', title: 'Literal escape' },
        group: { type: 'object', properties: { value: { type: 'integer', title: 'Deep' } } },
      },
    } satisfies JsonSchema;

    const first = resolveJsonSchema(schema);
    const second = resolveJsonSchema(schema);
    expect(first.properties).toMatchObject({
      slash: { title: 'Slash' },
      tilde: { title: 'Tilde' },
      literalEscape: { title: 'Literal escape' },
      deep: { type: 'integer', title: 'Deep' },
    });
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('accepts legacy and nested definition targets and defines sibling precedence', () => {
    const resolved = resolveJsonSchema({
      type: 'object',
      properties: {
        legacy: { $ref: '#/definitions/contact' },
        nested: { $ref: '#/$defs/group/definitions/contact', type: 'number', title: 'Sibling title' },
      },
      definitions: { contact: { type: 'string', title: 'Legacy contact' } },
      $defs: {
        group: { definitions: { contact: { type: 'string', title: 'Target title', minLength: 3 } } },
      },
    });

    expect(resolved.properties?.legacy).toMatchObject({ type: 'string', title: 'Legacy contact' });
    expect(resolved.properties?.nested).toMatchObject({ type: 'number', title: 'Sibling title', minLength: 3 });
  });

  it('deeply clones and freezes output without changing caller-owned input', () => {
    const schema: JsonSchema = {
      type: 'object',
      required: ['contact'],
      properties: { contact: { $ref: '#/$defs/contact', default: { tags: ['priority'] } } },
      $defs: { contact: { type: 'object', properties: { email: { type: 'string' } } } },
    };
    const before = JSON.stringify(schema);
    const resolved = resolveJsonSchema(schema);
    const contact = resolved.properties?.contact;

    expect(JSON.stringify(schema)).toBe(before);
    expect(Object.isFrozen(schema)).toBe(false);
    expect(Object.isFrozen(resolved)).toBe(true);
    expect(Object.isFrozen(resolved.required)).toBe(true);
    expect(Object.isFrozen(resolved.properties)).toBe(true);
    expect(Object.isFrozen(contact)).toBe(true);
    expect(Object.isFrozen(contact?.default)).toBe(true);
    expect(Object.isFrozen((contact?.default as { tags: readonly string[] }).tags)).toBe(true);
    expect(() => ((resolved.required as string[])[0] = 'changed')).toThrow();
    expect(schema.required).toEqual(['contact']);
  });

  it('uses own data properties and cannot mutate object prototypes', () => {
    const inherited = { inherited: { type: 'string' } };
    const definitions = Object.create(inherited) as Record<string, JsonSchema>;
    Object.defineProperty(definitions, '__proto__', { value: { type: 'string', title: 'Own prototype key' }, enumerable: true });
    Object.defineProperty(definitions, 'safe', { value: { type: 'object', properties: Object.create(null) }, enumerable: true });
    Object.defineProperty(definitions.safe!.properties!, '__proto__', { value: { type: 'string' }, enumerable: true });
    const resolved = resolveJsonSchema({
      type: 'object',
      properties: {
        safe: { $ref: '#/$defs/safe' },
        dangerousName: { $ref: '#/$defs/__proto__' },
      },
      $defs: definitions,
    });

    expect(Object.getPrototypeOf(resolved)).toBeNull();
    expect(Object.getPrototypeOf(resolved.properties)).toBeNull();
    expect(Object.hasOwn(resolved.properties?.safe?.properties ?? {}, '__proto__')).toBe(true);
    expect(resolved.properties?.dangerousName?.title).toBe('Own prototype key');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(diagnostic({ type: 'object', properties: { x: { $ref: '#/$defs/inherited' } }, $defs: definitions })).toBe('ref-pointer');
    expect(diagnostic({ type: 'object', properties: { x: { $ref: '#/$defs/constructor' } }, $defs: {} })).toBe('ref-pointer');
  });

  it('rejects malformed, remote, missing, non-object, cyclic, depth, and node overflow stably', () => {
    expect(diagnostic({ type: 'object', properties: { x: { $ref: 'https://example.test/schema' } } })).toBe('ref-remote');
    expect(diagnostic({ type: 'object', properties: { x: { $ref: '#anchor' } } })).toBe('ref-pointer');
    expect(diagnostic({ type: 'object', properties: { x: { $ref: '#/$defs/a~2b' } } })).toBe('ref-pointer');
    expect(diagnostic({ type: 'object', properties: { x: { $ref: '#/$defs/%E0%A4%A' } } })).toBe('ref-pointer');
    expect(diagnostic({ type: 'object', properties: { x: { $ref: '#/properties/x' } } })).toBe('ref-pointer');
    expect(diagnostic({ type: 'object', properties: { x: { $ref: '#/$defs/missing' } }, $defs: {} })).toBe('ref-pointer');
    expect(diagnostic({ type: 'object', properties: { x: { $ref: '#/$defs/value' } }, $defs: { value: 'text' as unknown as JsonSchema } })).toBe('ref-target');
    expect(diagnostic({ type: 'object', properties: { x: { $ref: '#/$defs/a' } }, $defs: { a: { $ref: '#/$defs/b' }, b: { $ref: '#/$defs/a' } } })).toBe('ref-cycle');
    expect(diagnostic({ type: 'object', properties: { x: { $ref: '#/$defs/a' } }, $defs: { a: { $ref: '#/$defs/b' }, b: { type: 'string' } } }, { maxDepth: 1 })).toBe('ref-depth');
    expect(diagnostic({ type: 'object', properties: { x: { $ref: '#/$defs/a' } }, $defs: { a: { type: 'string' } } }, { maxNodes: 2 })).toBe('ref-budget');
  });
});
