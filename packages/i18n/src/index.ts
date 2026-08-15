import { shallowRef, type Ref } from '@gluonjs/reactivity';
import { createInjectionKey, inject, type GluonApp, type GluonPlugin } from '@gluonjs/core';

export type LocaleCode = string;
export type I18nValue = string | number | boolean | Date;
export type I18nMessages = Readonly<Record<string, string>>;
export type I18nNamespaceLoader = (locale: LocaleCode) => Promise<I18nMessages> | I18nMessages;
export type I18nNamespaceState = 'idle' | 'loading' | 'loaded' | 'error';

export interface I18nNamespaceStatus {
  readonly state: I18nNamespaceState;
  readonly error?: string;
}

export interface I18nFallbackContext {
  readonly key: string;
  readonly locale: LocaleCode;
  readonly namespace?: string;
}

export interface I18nOptions {
  readonly locale: LocaleCode;
  readonly fallbackLocale?: LocaleCode | readonly LocaleCode[];
  readonly messages?: Readonly<Record<LocaleCode, I18nMessages>>;
  readonly namespaces?: Readonly<Record<string, I18nNamespaceLoader>>;
  readonly missing?: (context: I18nFallbackContext) => string;
}

export interface TranslateOptions {
  readonly namespace?: string;
  readonly values?: Readonly<Record<string, I18nValue>>;
}

export interface I18nSnapshot {
  readonly locale: LocaleCode;
  readonly messages: Readonly<Record<LocaleCode, Readonly<Record<string, I18nMessages>>>>;
}

export interface I18n {
  readonly locale: Ref<LocaleCode>;
  readonly fallbackLocale?: LocaleCode | readonly LocaleCode[];
  readonly fallbackLocales: readonly LocaleCode[];
  readonly ready: Ref<number>;
  readonly namespaceStatus: Ref<Readonly<Record<string, I18nNamespaceStatus>>>;
  setLocale(locale: LocaleCode): Promise<void>;
  loadNamespace(namespace: string): Promise<void>;
  t(key: string, options?: TranslateOptions): string;
  n(value: number, options?: Intl.NumberFormatOptions): string;
  d(value: Date | number, options?: Intl.DateTimeFormatOptions): string;
  snapshot(): I18nSnapshot;
  hydrate(snapshot: I18nSnapshot): void;
}

export const i18nKey = createInjectionKey<I18n>('gluon:i18n');

export function createI18n(options: I18nOptions): I18n & GluonPlugin<void> {
  const locale = shallowRef(options.locale);
  const ready = shallowRef(0);
  const fallbackLocale = options.fallbackLocale;
  const fallbackLocales = normalizeFallbackLocales(fallbackLocale);
  const missing = options.missing ?? ((context: I18nFallbackContext) => context.key);
  const namespaces = new Map(Object.entries(options.namespaces ?? {}));
  const loaded = new Map<LocaleCode, Map<string, I18nMessages>>();
  const pending = new Map<string, Promise<void>>();
  const namespaceStatus = shallowRef<Readonly<Record<string, I18nNamespaceStatus>>>({});

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

  function localeChain(targetLocale: LocaleCode): LocaleCode[] {
    const chain: LocaleCode[] = [];
    addLocaleVariants(chain, targetLocale);
    for (const fallback of fallbackLocales) addLocaleVariants(chain, fallback);
    return chain;
  }

  function findMessage(targetLocale: LocaleCode, key: string, namespace = ''): string | undefined {
    const localeMessages = loaded.get(targetLocale);
    return localeMessages?.get(namespace)?.[key]
      ?? localeMessages?.get('')?.[namespace ? `${namespace}.${key}` : key];
  }

  function updateNamespaceStatus(namespace: string, status: I18nNamespaceStatus): void {
    namespaceStatus.value = { ...namespaceStatus.value, [namespace]: status };
    ready.value += 1;
  }

  async function loadForLocale(targetLocale: LocaleCode, namespace: string): Promise<void> {
    const loader = namespaces.get(namespace);
    if (!loader) {
      const error = new Error(`Missing Gluon i18n namespace loader for "${namespace}".`);
      if (targetLocale === locale.value) updateNamespaceStatus(namespace, { state: 'error', error: error.message });
      throw error;
    }
    const cacheKey = `${targetLocale}\u0000${namespace}`;
    const cached = loaded.get(targetLocale)?.get(namespace);
    if (cached) {
      if (targetLocale === locale.value) updateNamespaceStatus(namespace, { state: 'loaded' });
      return;
    }
    const existing = pending.get(cacheKey);
    if (existing) return existing;
    if (targetLocale === locale.value) updateNamespaceStatus(namespace, { state: 'loading' });
    let loadedMessages: Promise<I18nMessages> | I18nMessages;
    try {
      loadedMessages = loader(targetLocale);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (targetLocale === locale.value) updateNamespaceStatus(namespace, { state: 'error', error: message });
      return Promise.reject(error);
    }
    const request = Promise.resolve(loadedMessages)
      .then((messages) => {
        ensureLocale(targetLocale).set(namespace, messages);
        if (targetLocale === locale.value) updateNamespaceStatus(namespace, { state: 'loaded' });
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        if (targetLocale === locale.value) updateNamespaceStatus(namespace, { state: 'error', error: message });
        throw error;
      })
      .finally(() => pending.delete(cacheKey));
    pending.set(cacheKey, request);
    return request;
  }

  function refreshNamespaceStatus(): void {
    const next: Record<string, I18nNamespaceStatus> = {};
    for (const namespace of namespaces.keys()) {
      next[namespace] = loaded.get(locale.value)?.has(namespace)
        ? { state: 'loaded' }
        : { state: 'idle' };
    }
    namespaceStatus.value = next;
    ready.value += 1;
  }

  const i18n: I18n & GluonPlugin<void> = {
    locale,
    fallbackLocale,
    fallbackLocales,
    ready,
    namespaceStatus,
    async setLocale(nextLocale: LocaleCode) {
      if (locale.value === nextLocale) return;
      locale.value = nextLocale;
      refreshNamespaceStatus();
    },
    async loadNamespace(namespace: string) {
      await loadForLocale(locale.value, namespace);
    },
    t(key: string, options: TranslateOptions = {}) {
      ready.value;
      const namespace = options.namespace;
      if (namespace && !loaded.get(locale.value)?.has(namespace)) {
        void loadForLocale(locale.value, namespace).catch(() => undefined);
      }
      const translated = localeChain(locale.value)
        .map((candidate) => findMessage(candidate, key, namespace))
        .find((value): value is string => value !== undefined);
      return formatMessage(
        translated ?? missing({ key, locale: locale.value, namespace }),
        options.values,
        locale.value,
        this,
      );
    },
    n(value: number, formatOptions: Intl.NumberFormatOptions = {}) {
      return new Intl.NumberFormat(locale.value, formatOptions).format(value);
    },
    d(value: Date | number, formatOptions: Intl.DateTimeFormatOptions = {}) {
      return new Intl.DateTimeFormat(locale.value, formatOptions).format(value);
    },
    snapshot(): I18nSnapshot {
      const messages: Record<LocaleCode, Readonly<Record<string, I18nMessages>>> = {};
      for (const [messageLocale, localeMessages] of loaded) {
        messages[messageLocale] = Object.fromEntries(localeMessages);
      }
      return { locale: locale.value, messages };
    },
    hydrate(snapshot: I18nSnapshot) {
      for (const [messageLocale, localeMessages] of Object.entries(snapshot.messages)) {
        const target = ensureLocale(messageLocale);
        for (const [namespace, messages] of Object.entries(localeMessages)) target.set(namespace, messages);
      }
      locale.value = snapshot.locale;
      refreshNamespaceStatus();
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

function normalizeFallbackLocales(fallbackLocale: I18nOptions['fallbackLocale']): readonly LocaleCode[] {
  if (!fallbackLocale) return [];
  return typeof fallbackLocale === 'string' ? [fallbackLocale] : fallbackLocale;
}

function addLocaleVariants(chain: LocaleCode[], targetLocale: LocaleCode): void {
  if (!chain.includes(targetLocale)) chain.push(targetLocale);
  const base = targetLocale.split('-')[0];
  if (base && base !== targetLocale && !chain.includes(base)) chain.push(base);
}

function formatMessage(message: string, values: Readonly<Record<string, I18nValue>> | undefined, targetLocale: LocaleCode, i18n: I18n): string {
  if (!values) return message;
  let output = '';
  let cursor = 0;
  while (cursor < message.length) {
    const open = message.indexOf('{', cursor);
    if (open < 0) return output + message.slice(cursor);
    output += message.slice(cursor, open);
    const close = matchingBrace(message, open);
    if (close < 0) return output + message.slice(open);
    output += formatExpression(message.slice(open + 1, close), values, targetLocale, i18n);
    cursor = close + 1;
  }
  return output;
}

function formatExpression(expression: string, values: Readonly<Record<string, I18nValue>>, targetLocale: LocaleCode, i18n: I18n): string {
  const parts = splitTopLevel(expression);
  const name = parts[0]?.trim();
  if (!name) return `{${expression}}`;
  const value = values[name];
  if (parts.length === 1) return value === undefined ? `{${expression}}` : String(value);
  const type = parts[1]?.trim();
  if (type === 'number' && typeof value === 'number') return i18n.n(value);
  if (type === 'date' && (value instanceof Date || typeof value === 'number')) return i18n.d(value);
  if ((type === 'plural' || type === 'selectordinal') && typeof value === 'number') {
    const choices = parseChoices(parts.slice(2).join(','));
    const exact = choices[`=${value}`];
    const category = new Intl.PluralRules(targetLocale, { type: type === 'selectordinal' ? 'ordinal' : 'cardinal' }).select(value);
    const selected = exact ?? choices[category] ?? choices.other ?? `{${expression}}`;
    return formatMessage(selected.replaceAll('#', i18n.n(value)), values, targetLocale, i18n);
  }
  if (type === 'select') {
    const choices = parseChoices(parts.slice(2).join(','));
    return formatMessage(choices[String(value)] ?? choices.other ?? `{${expression}}`, values, targetLocale, i18n);
  }
  return `{${expression}}`;
}

function matchingBrace(value: string, open: number): number {
  let depth = 0;
  for (let index = open; index < value.length; index += 1) {
    if (value[index] === '{') depth += 1;
    if (value[index] === '}' && --depth === 0) return index;
  }
  return -1;
}

function splitTopLevel(value: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '{') depth += 1;
    if (value[index] === '}') depth -= 1;
    if (value[index] === ',' && depth === 0) {
      parts.push(value.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(value.slice(start));
  return parts;
}

function parseChoices(value: string): Record<string, string> {
  const choices: Record<string, string> = {};
  let cursor = 0;
  while (cursor < value.length) {
    while (/\s/.test(value[cursor] ?? '')) cursor += 1;
    const keyStart = cursor;
    while (cursor < value.length && !/[\s{]/.test(value[cursor] ?? '')) cursor += 1;
    const key = value.slice(keyStart, cursor);
    while (/\s/.test(value[cursor] ?? '')) cursor += 1;
    if (!key || value[cursor] !== '{') break;
    const end = matchingBrace(value, cursor);
    if (end < 0) break;
    choices[key] = value.slice(cursor + 1, end);
    cursor = end + 1;
  }
  return choices;
}
