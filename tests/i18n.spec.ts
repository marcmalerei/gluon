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
});
