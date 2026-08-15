<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/package-headers/i18n.png" alt="@gluonjs/i18n — Gluon package header" width="100%">
</p>
<!-- gluon-package-header:end -->

`@gluonjs/i18n` is the optional Gluon internationalization package. It depends
on `@gluonjs/core` for application injection and on `@gluonjs/reactivity` for the
reactive locale and ready counters, so applications that do not need translated
strings do not receive i18n exports from the core package.

The package also exports `validateI18nCatalog()` for build-time and test-time
catalog checks. The validator is DOM-free and returns typed diagnostics that
include the locale, source key, machine-readable code, and human-readable
message.

```ts
import { validateI18nCatalog } from '@gluonjs/i18n';

const diagnostics = validateI18nCatalog(new Map([
  ['en', [
    ['bag.title', 'Bag'],
    ['bag.count', '{count, plural, one {# item} other {# items}}'],
  ]],
]));
```

Record input is convenient for ordinary catalogs. Iterable `[key, value]`
pairs additionally let build tools diagnose duplicate source keys before an
object conversion would overwrite them. Diagnostics retain source order and
do not throw for malformed catalogs. Non-string values and malformed locale
catalog containers receive explicit diagnostics. Malformed or throwing
iterables fail closed as `gluon_i18n_invalid_catalog`; the validator never loads
a catalog or changes runtime fallback state.

## Install and provide i18n

```ts
import { createApp, html } from "@gluonjs/core";
import { createI18n, useI18n } from "@gluonjs/i18n";

const i18n = createI18n({
  locale: "de",
  fallbackLocale: "en",
  messages: { en: { "bag.title": "Bag" } },
  namespaces: {
    product: (locale) =>
      import(`./locales/${locale}/product.js`).then(
        (module) => module.messages,
      ),
  },
});

const ProductTitle = () =>
  html`<h1>${useI18n().t("title", { namespace: "product" })}</h1>`;

createApp(() => html`${ProductTitle()}`)
  .use(i18n)
  .mount(document.querySelector("#app")!);
```

Namespace loaders receive only the active locale. `t(key, { namespace })`
deduplicates concurrent requests, returns the configured fallback or key while
the namespace is loading, and invalidates the owning application render after
that locale namespace resolves. Call `loadNamespace(name)` before navigation
when a route can predict the next bundle.

## Fallbacks and formatting

Locale lookup tries the regional locale, its base language, and each configured
fallback in the same order. `fallbackLocale` accepts one locale or an ordered
array of locales:

```ts
const i18n = createI18n({
  locale: "de-AT",
  fallbackLocale: ["de", "en-US"],
  messages: {
    de: { "cart.items": "{count, plural, one {# Artikel} other {# Artikel}}" },
  },
});

i18n.t("cart.items", { values: { count: 3 } });
i18n.n(1234.5, { style: "currency", currency: "EUR" });
i18n.d(new Date(), { dateStyle: "medium" });
```

Messages support simple ICU-style `plural`, `selectordinal`, and `select`
expressions. The supported message grammar is intentionally small:

- literal text;
- a simple argument replacement, written as `{name}`;
- a typed argument formatter, written as `{name, number}` or `{name, date}`;
- a choice message, written as `{name, plural, ...}`, `{name, selectordinal,
  ...}`, or `{name, select, ...}` with `one`, `few`, `many`, `two`, `zero`, and
  `other` branches plus exact matches such as `=2`.

Unsupported Unicode MessageFormat features are intentionally rejected or left
literal instead of being claimed as supported. That includes nested plural
offsets, rich argument style options, selectors other than `plural`,
`selectordinal`, and `select`, apostrophe escaping rules, list or duration
formatters, `select` fallback chains beyond `other`, and full ICU/Unicode
MessageFormat conformance.

For loading diagnostics, `namespaceStatus` exposes `idle`, `loading`, `loaded`,
and `error` for the active locale. Namespace errors remain available to
explicit `loadNamespace` callers and are rendered as the missing key by `t`
until the application handles them. Unsupported or incomplete expressions remain
literal text; they do not throw or recursively re-enter the formatter.

## SSR state

The server can transfer the active locale and all messages already loaded during
rendering. The snapshot is JSON-safe and can be embedded in the document:

```ts
const state = i18n.snapshot();
clientI18n.hydrate(state);
```

Hydration restores root messages and resolved namespaces before the client
renders, so a translated key does not briefly fall back to its key after SSR.
