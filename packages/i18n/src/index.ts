import { shallowRef, type Ref } from '@gluonjs/reactivity';
import { createInjectionKey, inject, type GluonApp, type GluonPlugin } from '@gluonjs/core';

export type LocaleCode = string;
export type I18nMessages = Readonly<Record<string, string>>;
export type I18nNamespaceLoader = (locale: LocaleCode) => Promise<I18nMessages> | I18nMessages;

export interface I18nFallbackContext {
  readonly key: string;
  readonly locale: LocaleCode;
  readonly namespace?: string;
}

export interface I18nOptions {
  readonly locale: LocaleCode;
  readonly fallbackLocale?: LocaleCode;
  readonly messages?: Readonly<Record<LocaleCode, I18nMessages>>;
  readonly namespaces?: Readonly<Record<string, I18nNamespaceLoader>>;
  readonly missing?: (context: I18nFallbackContext) => string;
}

export interface TranslateOptions {
  readonly namespace?: string;
  readonly values?: Readonly<Record<string, string | number | boolean>>;
}

export interface I18n {
  readonly locale: Ref<LocaleCode>;
  readonly fallbackLocale?: LocaleCode;
  readonly ready: Ref<number>;
  setLocale(locale: LocaleCode): Promise<void>;
  loadNamespace(namespace: string): Promise<void>;
  t(key: string, options?: TranslateOptions): string;
}

export const i18nKey = createInjectionKey<I18n>('gluon:i18n');

export function createI18n(options: I18nOptions): I18n & GluonPlugin<void> {
  const locale = shallowRef(options.locale);
  const ready = shallowRef(0);
  const fallbackLocale = options.fallbackLocale;
  const missing = options.missing ?? ((context: I18nFallbackContext) => context.key);
  const namespaces = new Map(Object.entries(options.namespaces ?? {}));
  const loaded = new Map<LocaleCode, Map<string, I18nMessages>>();
  const pending = new Map<string, Promise<void>>();

  for (const [messageLocale, messages] of Object.entries(options.messages ?? {})) {
    ensureLocale(messageLocale).set('', messages);
  }

  function ensureLocale(targetLocale: LocaleCode): Map<string, I18nMessages> {
    let localeMessages = loaded.get(targetLocale);
    if (!localeMessages) {
      localeMessages = new Map();
      loaded.set(targetLocale, localeMessages);
    }
    return localeMessages;
  }

  function findMessage(targetLocale: LocaleCode, key: string, namespace = ''): string | undefined {
    const localeMessages = loaded.get(targetLocale);
    return localeMessages?.get(namespace)?.[key] ?? localeMessages?.get('')?.[namespace ? `${namespace}.${key}` : key];
  }

  async function loadForLocale(targetLocale: LocaleCode, namespace: string): Promise<void> {
    const loader = namespaces.get(namespace);
    if (!loader) throw new Error(`Missing Gluon i18n namespace loader for "${namespace}".`);
    const cacheKey = `${targetLocale}\u0000${namespace}`;
    const cached = loaded.get(targetLocale)?.get(namespace);
    if (cached) return;
    const existing = pending.get(cacheKey);
    if (existing) return existing;
    const request = Promise.resolve(loader(targetLocale)).then((messages) => {
      ensureLocale(targetLocale).set(namespace, messages);
      ready.value += 1;
    }).finally(() => pending.delete(cacheKey));
    pending.set(cacheKey, request);
    return request;
  }

  const i18n: I18n & GluonPlugin<void> = {
    locale,
    fallbackLocale,
    ready,
    async setLocale(nextLocale: LocaleCode) {
      if (locale.value === nextLocale) return;
      locale.value = nextLocale;
      ready.value += 1;
    },
    async loadNamespace(namespace: string) {
      await loadForLocale(locale.value, namespace);
    },
    t(key: string, options: TranslateOptions = {}) {
      ready.value;
      const namespace = options.namespace;
      if (namespace) void loadForLocale(locale.value, namespace);
      const translated = findMessage(locale.value, key, namespace);
      const fallback = translated ?? (fallbackLocale ? findMessage(fallbackLocale, key, namespace) : undefined);
      return interpolate(fallback ?? missing({ key, locale: locale.value, namespace }), options.values);
    },
    install(app: GluonApp) {
      app.provide(i18nKey, i18n);
    },
  };

  return i18n;
}

export function useI18n(): I18n {
  return inject(i18nKey);
}

function interpolate(message: string, values?: Readonly<Record<string, string | number | boolean>>): string {
  if (!values) return message;
  return message.replace(/\{([\w.-]+)\}/g, (match, name: string) => {
    const value = values[name];
    return value === undefined ? match : String(value);
  });
}
