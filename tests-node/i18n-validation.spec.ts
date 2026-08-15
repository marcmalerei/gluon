import { describe, expect, it } from 'vitest';
import { html } from '@gluonjs/core';
import { createI18n, validateI18nCatalog } from '@gluonjs/i18n';
import { renderToString } from '@gluonjs/ssr';

describe('DOM-free i18n catalog validation', () => {
  it('accepts the exact supported message grammar', () => {
    expect(validateI18nCatalog({
      en: {
        greeting: 'Hello {name}',
        amount: '{value, number}',
        date: '{value, date}',
        count: '{count, plural, =0 {none} one {# item} other {# items}}',
        rank: '{rank, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}',
        kind: '{kind, select, known {Known} other {Unknown}}',
      },
    })).toEqual([]);
  });

  it('returns stable adversarial diagnostics without requiring browser globals', () => {
    const diagnostics = validateI18nCatalog([
      ['en', [
        ['duplicate', 'first'],
        ['duplicate', 'second'],
        ['value', false],
        ['open', 'Hello {name'],
        ['close', 'Hello }'],
        ['format', '{amount, number, currency}'],
        ['unsupported', '{started, time}'],
        ['choice', '{count, plural, banana {x} other {y}}'],
        ['duplicate-choice', '{count, plural, one {x} one {y} other {z}}'],
        ['offset', '{count, plural, offset:1 one {x} other {y}}'],
      ]],
      ['de', 'not-a-catalog'],
    ]);

    expect(diagnostics.map(({ code, locale, key }) => ({ code, locale, key }))).toEqual(expect.arrayContaining([
      { code: 'gluon_i18n_duplicate_key', locale: 'en', key: 'duplicate' },
      { code: 'gluon_i18n_non_string_value', locale: 'en', key: 'value' },
      { code: 'gluon_i18n_malformed_interpolation', locale: 'en', key: 'open' },
      { code: 'gluon_i18n_malformed_interpolation', locale: 'en', key: 'close' },
      { code: 'gluon_i18n_malformed_interpolation', locale: 'en', key: 'format' },
      { code: 'gluon_i18n_malformed_interpolation', locale: 'en', key: 'unsupported' },
      { code: 'gluon_i18n_malformed_choice', locale: 'en', key: 'choice' },
      { code: 'gluon_i18n_malformed_choice', locale: 'en', key: 'duplicate-choice' },
      { code: 'gluon_i18n_malformed_choice', locale: 'en', key: 'offset' },
      { code: 'gluon_i18n_invalid_catalog', locale: 'de', key: '' },
    ]));
  });

  it('diagnoses malformed and throwing catalog iterables instead of throwing', () => {
    const throwing = {
      *[Symbol.iterator](): IterableIterator<unknown> {
        yield ['en', { valid: 'message' }];
        throw new Error('untrusted iterator');
      },
    };
    const malformed = [
      ['en', { valid: 'message' }],
      [42, { invalid: 'locale' }],
      ['missing-catalog'],
      null,
    ];

    expect(validateI18nCatalog(throwing as never)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'gluon_i18n_invalid_catalog', locale: '', key: '' }),
    ]));
    expect(validateI18nCatalog(malformed as never).filter(({ code }) => code === 'gluon_i18n_invalid_catalog')).toHaveLength(3);
    expect(validateI18nCatalog(null as never)).toEqual([
      expect.objectContaining({ code: 'gluon_i18n_invalid_catalog', locale: '', key: '' }),
    ]);
  });

  it('does not change locale fallback or snapshot hydration', () => {
    const server = createI18n({
      locale: 'de-AT',
      fallbackLocale: ['de', 'en'],
      messages: { de: { title: 'Warenkorb' }, en: { title: 'Bag' } },
    });
    expect(validateI18nCatalog({ de: { title: 'Warenkorb' } })).toEqual([]);
    const client = createI18n({ locale: 'en', messages: { en: { title: 'Bag' } } });
    client.hydrate(server.snapshot());
    expect(client.locale.value).toBe('de-AT');
    expect(client.t('title')).toBe('Warenkorb');
  });

  it('keeps validated messages deterministic through DOM-free SSR', async () => {
    const messages = { de: { count: '{count, plural, one {# Artikel} other {# Artikel}}' } };
    expect(validateI18nCatalog(messages)).toEqual([]);
    const i18n = createI18n({ locale: 'de', messages });

    await expect(renderToString(html`<p>${i18n.t('count', { values: { count: 2 } })}</p>`))
      .resolves.toBe('<p><!--gluon:h:0-->2 Artikel<!--gluon:/h:0--></p>');
  });
});
