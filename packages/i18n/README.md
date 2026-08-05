<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/package-headers/core.png" alt="@gluonjs/i18n — Gluon package header" width="100%">
</p>
<!-- gluon-package-header:end -->

`@gluonjs/i18n` is the optional Gluon internationalization package. It depends
on `@gluonjs/core` for application injection and on `@gluonjs/reactivity` for the
reactive locale and ready counters, so applications that do not need translated
strings do not receive i18n exports from the core package.

## Install and provide i18n

```ts
import { createApp, html } from '@gluonjs/core';
import { createI18n, useI18n } from '@gluonjs/i18n';

const i18n = createI18n({
  locale: 'de',
  fallbackLocale: 'en',
  messages: { en: { 'bag.title': 'Bag' } },
  namespaces: {
    product: (locale) => import(`./locales/${locale}/product.js`).then((module) => module.messages),
  },
});

const ProductTitle = () => html`<h1>${useI18n().t('title', { namespace: 'product' })}</h1>`;

createApp(() => html`${ProductTitle()}`).use(i18n).mount(document.querySelector('#app')!);
```

Namespace loaders receive only the active locale. `t(key, { namespace })`
deduplicates concurrent requests, returns the configured fallback or key while
the namespace is loading, and invalidates the owning application render after
that locale namespace resolves. Call `loadNamespace(name)` before navigation
when a route can predict the next bundle.
