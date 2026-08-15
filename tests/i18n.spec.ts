import { describe, expect, it } from 'vitest';
import { createApp, defineAtom, defineMolecule, defineOrganism, html } from '../src/index.js';
import { createI18n, useI18n } from '@gluonjs/i18n';

async function tick(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('core i18n', () => {
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
});
