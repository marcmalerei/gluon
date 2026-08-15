import { describe, expect, it } from 'vitest';
import { createApp, defineAtom, defineMolecule, defineOrganism, html } from '../src/index.js';
import { createI18n, useI18n, validateI18nCatalog } from '@gluonjs/i18n';

async function tick(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('core i18n', () => {
  it('validates message catalogs with stable locale and key diagnostics', () => {
    const diagnostics = validateI18nCatalog([
      ['en', {
        'bag.title': 'Bag',
        'bag.count': '{count, plural, one {# item}}',
      }],
      ['de', [
        ['bag.title', 'Tasche'],
        ['bag.title', 'Korb'],
        ['bag.count', '{count, selectordinal, one {#st}}'],
        ['bag.kind', '{kind, select, known {known}}'],
        ['bag.bad', '{name, plural, other {oops}'],
        ['bag.value', 123],
        ['bag.style', '{amount, number, currency}'],
        ['bag.close', 'Hello }'],
        ['bag.invalid-argument', '{invalid argument}'],
        ['bag.unsupported-format', '{started, time}'],
        ['bag.empty-choice', '{count, plural,}'],
        ['bag.duplicate-choice', '{count, plural, one {x} one {y} other {z}}'],
        ['bag.invalid-selector', '{count, plural, banana {x} other {y}}'],
        ['bag.offset', '{count, plural, offset:1 one {x} other {y}}'],
      ]],
    ]);

    expect(diagnostics.some((entry) => entry.code === 'gluon_i18n_missing_other_branch' && entry.locale === 'en' && entry.key === 'bag.count' && entry.pattern === 'plural')).toBe(true);
    expect(diagnostics.some((entry) => entry.code === 'gluon_i18n_duplicate_key' && entry.locale === 'de' && entry.key === 'bag.title')).toBe(true);
    expect(diagnostics.some((entry) => entry.code === 'gluon_i18n_missing_other_branch' && entry.locale === 'de' && entry.key === 'bag.count' && entry.pattern === 'selectordinal')).toBe(true);
    expect(diagnostics.some((entry) => entry.code === 'gluon_i18n_missing_other_branch' && entry.locale === 'de' && entry.key === 'bag.kind' && entry.pattern === 'select')).toBe(true);
    expect(diagnostics.some((entry) => entry.code === 'gluon_i18n_malformed_interpolation' && entry.locale === 'de' && entry.key === 'bag.bad' && entry.pattern === 'message')).toBe(true);
    expect(diagnostics.some((entry) => entry.code === 'gluon_i18n_non_string_value' && entry.locale === 'de' && entry.key === 'bag.value')).toBe(true);
    expect(diagnostics.some((entry) => entry.code === 'gluon_i18n_malformed_interpolation' && entry.locale === 'de' && entry.key === 'bag.style')).toBe(true);
    expect(diagnostics.some((entry) => entry.code === 'gluon_i18n_malformed_interpolation' && entry.locale === 'de' && entry.key === 'bag.close')).toBe(true);
    expect(diagnostics.some((entry) => entry.code === 'gluon_i18n_malformed_interpolation' && entry.locale === 'de' && entry.key === 'bag.invalid-argument')).toBe(true);
    expect(diagnostics.some((entry) => entry.code === 'gluon_i18n_malformed_interpolation' && entry.locale === 'de' && entry.key === 'bag.unsupported-format')).toBe(true);
    for (const key of ['bag.empty-choice', 'bag.duplicate-choice', 'bag.invalid-selector', 'bag.offset']) {
      expect(diagnostics.some((entry) => entry.code === 'gluon_i18n_malformed_choice' && entry.locale === 'de' && entry.key === key)).toBe(true);
    }
  });

  it('fails closed for malformed or throwing catalog iterables', () => {
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
    const nonIterable = Object.create({});

    expect(validateI18nCatalog(throwing as never)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'gluon_i18n_invalid_catalog', locale: '', key: '' }),
    ]));
    expect(validateI18nCatalog(malformed as never).filter(({ code }) => code === 'gluon_i18n_invalid_catalog')).toHaveLength(3);
    expect(validateI18nCatalog(nonIterable as never)).toEqual([
      expect.objectContaining({ code: 'gluon_i18n_invalid_catalog' }),
    ]);
    expect(validateI18nCatalog(null as never)).toEqual([
      expect.objectContaining({ code: 'gluon_i18n_invalid_catalog' }),
    ]);
  });

  it('loads only the active locale namespace lazily', async () => {
    const requested: string[] = [];
    const i18n = createI18n({
      locale: 'de',
      fallbackLocale: 'en',
      messages: { en: { greeting: 'Hello {name}' } },
      namespaces: {
        product: (locale) => {
          requested.push(locale);
          return { title: locale === 'de' ? 'Lampe' : 'Lamp' };
        },
      },
    });

    expect(i18n.t('greeting', { values: { name: 'Ada' } })).toBe('Hello Ada');
    expect(i18n.t('title', { namespace: 'product' })).toBe('title');
    expect(requested).toEqual(['de']);

    await tick();
    expect(i18n.t('title', { namespace: 'product' })).toBe('Lampe');
    expect(requested).toEqual(['de']);
  });

  it('supports installed i18n from atoms, molecules, organisms, and components', async () => {
    const LabelAtom = defineAtom(() => html`<span>${useI18n().t('label')}</span>`, 'LabelAtom');
    const LabelMolecule = defineMolecule(() => html`<p>${useI18n().t('label')}</p>`, 'LabelMolecule');
    const LabelOrganism = defineOrganism(() => html`<section>${useI18n().t('label')}</section>`, 'LabelOrganism');
    const i18n = createI18n({ locale: 'en', messages: { en: { label: 'Bag' } } });
    const app = createApp(() => html`${LabelAtom({})}${LabelMolecule({})}${LabelOrganism({})}${useI18n().t('label')}`);
    const host = document.createElement('main');

    app.use(i18n).mount(host);

    expect(host.textContent).toBe('BagBagBagBag');
  });

  it('renders loaded lazy namespaces after the loader resolves', async () => {
    const i18n = createI18n({
      locale: 'en',
      namespaces: { checkout: async () => ({ cta: 'Checkout' }) },
    });
    const app = createApp(() => html`<button>${useI18n().t('cta', { namespace: 'checkout' })}</button>`);
    const host = document.createElement('main');

    app.use(i18n).mount(host);
    expect(host.textContent).toBe('cta');

    await tick();
    await tick();
    expect(host.textContent).toBe('Checkout');
  });

  it('resolves regional locale chains before configured fallbacks', () => {
    const i18n = createI18n({
      locale: 'de-AT',
      fallbackLocale: ['en-US', 'fr'],
      messages: {
        de: { greeting: 'Servus' },
        en: { fallback: 'Hello' },
        fr: { missing: 'Bonjour' },
      },
    });

    expect(i18n.fallbackLocales).toEqual(['en-US', 'fr']);
    expect(i18n.t('greeting')).toBe('Servus');
    expect(i18n.t('fallback')).toBe('Hello');
    expect(i18n.t('missing')).toBe('Bonjour');
  });

  it('formats plural, ordinal, select, numbers, and dates with the active locale', () => {
    const i18n = createI18n({
      locale: 'en-US',
      messages: {
        'en-US': {
          items: '{count, plural, one {# item} other {# items}}',
          rank: '{count, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}',
          greeting: '{gender, select, female {Ms. {name}} other {Mx. {name}}}',
        },
      },
    });

    expect(i18n.t('items', { values: { count: 2 } })).toBe('2 items');
    expect(i18n.t('rank', { values: { count: 2 } })).toBe('2nd');
    expect(i18n.t('greeting', { values: { gender: 'female', name: 'Ada' } })).toBe('Ms. Ada');
    expect(i18n.n(1234.5, { minimumFractionDigits: 1 })).toBe('1,234.5');
    expect(i18n.d(new Date('2024-01-02T00:00:00Z'), { timeZone: 'UTC', dateStyle: 'medium' })).toContain('Jan');
  });

  it('exposes namespace failures and round-trips loaded state for SSR hydration', async () => {
    const server = createI18n({
      locale: 'de',
      messages: { de: { title: 'Warenkorb' } },
      namespaces: {
        checkout: () => ({ cta: 'Kaufen' }),
        broken: () => { throw new Error('locale bundle unavailable'); },
      },
    });
    await server.loadNamespace('checkout');
    const snapshot = server.snapshot();

    const client = createI18n({ locale: 'en', namespaces: { checkout: () => ({ cta: 'Buy' }) } });
    client.hydrate(snapshot);
    expect(client.locale.value).toBe('de');
    expect(client.t('title')).toBe('Warenkorb');
    expect(client.t('cta', { namespace: 'checkout' })).toBe('Kaufen');

    await expect(server.loadNamespace('broken')).rejects.toThrow('locale bundle unavailable');
    expect(server.namespaceStatus.value.broken).toMatchObject({ state: 'error', error: 'locale bundle unavailable' });
  });

  it('tracks namespace state across locale changes, caching, and concurrent loads', async () => {
    let resolveNamespace: ((messages: { title: string }) => void) | undefined;
    let requests = 0;
    const i18n = createI18n({
      locale: 'en',
      namespaces: {
        catalog: () => {
          requests += 1;
          return new Promise<{ title: string }>((resolve) => { resolveNamespace = resolve; });
        },
      },
    });

    const first = i18n.loadNamespace('catalog');
    expect(i18n.namespaceStatus.value.catalog).toEqual({ state: 'loading' });
    const second = i18n.loadNamespace('catalog');
    expect(requests).toBe(1);
    resolveNamespace?.({ title: 'Catalog' });
    await Promise.all([first, second]);
    expect(i18n.namespaceStatus.value.catalog).toEqual({ state: 'loaded' });
    await i18n.loadNamespace('catalog');
    expect(requests).toBe(1);

    await i18n.setLocale('de');
    expect(i18n.namespaceStatus.value.catalog).toEqual({ state: 'idle' });
    await i18n.setLocale('de');
    expect(i18n.namespaceStatus.value.catalog).toEqual({ state: 'idle' });
  });

  it('reports missing loaders and non-Error loader failures', async () => {
    const i18n = createI18n({ locale: 'en', namespaces: { sync: () => { throw 'sync failure'; } } });
    await expect(i18n.loadNamespace('missing')).rejects.toThrow('Missing Gluon i18n namespace loader');
    expect(i18n.namespaceStatus.value.missing).toMatchObject({ state: 'error' });
    await expect(i18n.loadNamespace('sync')).rejects.toBe('sync failure');
    expect(i18n.namespaceStatus.value.sync).toEqual({ state: 'error', error: 'sync failure' });

    const rejected = createI18n({
      locale: 'en',
      namespaces: { async: () => Promise.reject('async failure') },
    });
    await expect(rejected.loadNamespace('async')).rejects.toBe('async failure');
    expect(rejected.namespaceStatus.value.async).toEqual({ state: 'error', error: 'async failure' });
  });

  it('keeps malformed and unsupported message expressions safe', () => {
    const i18n = createI18n({
      locale: 'en-US',
      messages: {
        'en-US': {
          plain: 'Hello {name}',
          trailing: 'Hello {name}!',
          malformed: 'Broken {name',
          number: '{value, number}',
          pluralExact: '{count, plural, =2 {exact} one {one} other {other}}',
          pluralFallback: '{count, plural, one {one}}',
          pluralMalformedChoice: '{count, plural, garbage}',
          selectFallback: '{kind, select, known {known} other {other}}',
          selectMissing: '{kind, select, known {known}}',
          selectMalformed: '{kind, select, known {known}',
          empty: '{, select, other {value}}',
          numericDate: '{when, date}',
          invalidNumber: '{value, number}',
        },
      },
    });

    expect(i18n.t('plain')).toBe('Hello {name}');
    expect(i18n.t('plain', { values: { name: 'Ada' } })).toBe('Hello Ada');
    expect(i18n.t('plain', { values: {} })).toBe('Hello {name}');
    expect(i18n.t('trailing', { values: { name: 'Ada' } })).toBe('Hello Ada!');
    expect(i18n.t('malformed', { values: { name: 'Ada' } })).toBe('Broken {name');
    expect(i18n.t('number', { values: { value: 1234.5 } })).toBe('1,234.5');
    expect(i18n.t('pluralExact', { values: { count: 2 } })).toBe('exact');
    expect(i18n.t('pluralExact', { values: { count: 1 } })).toBe('one');
    expect(i18n.t('pluralExact', { values: { count: 3 } })).toBe('other');
    expect(i18n.t('pluralFallback', { values: { count: 2 } })).toBe('{count, plural, one {one}}');
    expect(i18n.t('pluralMalformedChoice', { values: { count: 1 } })).toBe('{count, plural, garbage}');
    expect(i18n.t('selectFallback', { values: { kind: 'unknown' } })).toBe('other');
    expect(i18n.t('selectMissing', { values: { kind: 'unknown' } })).toBe('{kind, select, known {known}}');
    expect(i18n.t('selectMalformed', { values: { kind: 'known' } })).toBe('{kind, select, known {known}');
    expect(i18n.t('empty', { values: {} })).toBe('{, select, other {value}}');
    expect(i18n.t('numericDate', { values: { when: 0 } })).toContain('1970');
    expect(i18n.t('invalidNumber', { values: { value: 'not a number' } })).toBe('{value, number}');
  });

  it('keeps namespace status request-local when locale changes during loading', async () => {
    let resolveNamespace: ((messages: { title: string }) => void) | undefined;
    let rejectNamespace: ((error: unknown) => void) | undefined;
    const i18n = createI18n({
      locale: 'en-US',
      fallbackLocale: ['en-US', 'en'],
      namespaces: {
        catalog: () => new Promise<{ title: string }>((resolve) => { resolveNamespace = resolve; }),
        broken: () => new Promise<{ title: string }>((_, reject) => { rejectNamespace = reject; }),
      },
    });

    const catalog = i18n.loadNamespace('catalog');
    await i18n.setLocale('de');
    resolveNamespace?.({ title: 'Catalog' });
    await catalog;
    expect(i18n.namespaceStatus.value.catalog).toEqual({ state: 'idle' });

    await i18n.setLocale('en-US');
    expect(i18n.namespaceStatus.value.catalog).toEqual({ state: 'loaded' });
    expect(i18n.fallbackLocales).toEqual(['en-US', 'en']);

    const broken = i18n.loadNamespace('broken');
    await i18n.setLocale('de');
    rejectNamespace?.('late failure');
    await expect(broken).rejects.toBe('late failure');
    expect(i18n.namespaceStatus.value.broken).toEqual({ state: 'idle' });
  });

  it('keeps unsupported values and unknown namespace requests literal', async () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        en: {
          spaced: '{count, plural,   one {one}   other {other}}',
          unsupported: '{value, unsupported}',
          wrongPlural: '{count, plural, one {one} other {other}}',
          selectMissing: '{kind, select, other {other}}',
        },
      },
    });

    expect(i18n.t('spaced', { values: { count: 1 } })).toBe('one');
    expect(i18n.t('unsupported', { values: { value: 'value' } })).toBe('{value, unsupported}');
    expect(i18n.t('wrongPlural', { values: { count: '1' } })).toBe('{count, plural, one {one} other {other}}');
    expect(i18n.t('selectMissing', { values: {} })).toBe('other');
    expect(i18n.t('missing', { namespace: 'not-registered' })).toBe('missing');
    await tick();
  });

  it('preserves fallback and SSR snapshot behavior when validating catalogs', async () => {
    const server = createI18n({
      locale: 'de-AT',
      fallbackLocale: ['de', 'en'],
      messages: {
        de: { title: 'Warenkorb', count: '{count, plural, one {# Artikel} other {# Artikel}}' },
        en: { title: 'Bag' },
      },
    });

    expect(validateI18nCatalog({
      de: { title: 'Warenkorb', count: '{count, plural, one {# Artikel} other {# Artikel}}' },
    })).toEqual([]);
    expect(server.t('title')).toBe('Warenkorb');
    expect(server.t('count', { values: { count: 3 } })).toBe('3 Artikel');

    await server.loadNamespace('missing').catch(() => undefined);
    const snapshot = server.snapshot();
    const client = createI18n({
      locale: 'en',
      fallbackLocale: ['de', 'en'],
      messages: { en: { title: 'Bag' } },
    });
    client.hydrate(snapshot);

    expect(client.locale.value).toBe('de-AT');
    expect(client.t('title')).toBe('Warenkorb');
    expect(client.t('count', { values: { count: 2 } })).toBe('2 Artikel');
  });
});
