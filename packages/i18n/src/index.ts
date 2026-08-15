import { shallowRef, type Ref } from '@gluonjs/reactivity';
import { createInjectionKey, inject, type GluonApp, type GluonPlugin } from '@gluonjs/core';

export type LocaleCode = string;
export type I18nValue = string | number | boolean | Date;
export type I18nMessages = Readonly<Record<string, string>>;
export type I18nNamespaceLoader = (locale: LocaleCode) => Promise<I18nMessages> | I18nMessages;
export type I18nNamespaceState = 'idle' | 'loading' | 'loaded' | 'error';
export type I18nCatalogValue = Readonly<Record<string, unknown>> | ReadonlyArray<readonly [string, unknown]>;
export type I18nCatalogInput = Readonly<Record<LocaleCode, unknown>> | Iterable<readonly [LocaleCode, unknown]>;
export type I18nMessagePatternType = 'message' | 'plural' | 'select' | 'selectordinal';
export type I18nDiagnosticCode =
  | 'gluon_i18n_invalid_catalog'
  | 'gluon_i18n_non_string_value'
  | 'gluon_i18n_duplicate_key'
  | 'gluon_i18n_malformed_interpolation'
  | 'gluon_i18n_malformed_choice'
  | 'gluon_i18n_missing_other_branch';

export interface I18nCatalogDiagnostic {
  readonly code: I18nDiagnosticCode;
  readonly locale: LocaleCode;
  readonly key: string;
  readonly message: string;
  readonly pattern?: I18nMessagePatternType;
}

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

export function validateI18nCatalog(input: I18nCatalogInput): readonly I18nCatalogDiagnostic[] {
  const diagnostics: I18nCatalogDiagnostic[] = [];
  for (const [locale, source] of iterateCatalogEntries(input, diagnostics)) {
    if (Array.isArray(source)) {
      const seen = new Set<string>();
      for (const entry of source) {
        if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string') {
          diagnostics.push(diagnostic('gluon_i18n_invalid_catalog', locale, '', `Catalog entries for locale "${locale}" must be [key, value] pairs.`));
          continue;
        }
        const [key, value] = entry;
        if (seen.has(key)) {
          diagnostics.push(diagnostic('gluon_i18n_duplicate_key', locale, key, `Duplicate catalog key "${key}" in locale "${locale}".`));
          continue;
        }
        seen.add(key);
        validateCatalogValue(locale, key, value, diagnostics);
      }
      continue;
    }
    if (isCatalogRecord(source)) {
      for (const [key, value] of Object.entries(source)) validateCatalogValue(locale, key, value, diagnostics);
      continue;
    }
    diagnostics.push(diagnostic('gluon_i18n_invalid_catalog', locale, '', `Catalog for locale "${locale}" must be a message record or iterable of key/value pairs.`));
  }
  return Object.freeze(diagnostics);
}

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

function iterateCatalogEntries(
  input: I18nCatalogInput,
  diagnostics: I18nCatalogDiagnostic[],
): readonly (readonly [LocaleCode, unknown])[] {
  if (input === null || typeof input !== 'object') {
    diagnostics.push(diagnostic('gluon_i18n_invalid_catalog', '', '', 'Catalog input must be a locale record or iterable of [locale, catalog] pairs.'));
    return [];
  }

  const entries: Array<readonly [LocaleCode, unknown]> = [];
  try {
    const iterator = (input as { readonly [Symbol.iterator]?: unknown })[Symbol.iterator];
    if (iterator === undefined && isCatalogRecord(input)) return Object.entries(input);
    if (typeof iterator !== 'function') {
      diagnostics.push(diagnostic('gluon_i18n_invalid_catalog', '', '', 'Catalog input must be a locale record or iterable of [locale, catalog] pairs.'));
      return entries;
    }
    for (const entry of input as Iterable<unknown>) {
      if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string') {
        diagnostics.push(diagnostic('gluon_i18n_invalid_catalog', '', '', 'Catalog iterable entries must be [locale, catalog] pairs with a string locale.'));
        continue;
      }
      entries.push([entry[0], entry[1]]);
    }
  } catch {
    diagnostics.push(diagnostic('gluon_i18n_invalid_catalog', '', '', 'Catalog iterable could not be read safely.'));
  }
  return entries;
}

function isCatalogRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validateCatalogValue(locale: LocaleCode, key: string, value: unknown, diagnostics: I18nCatalogDiagnostic[]): void {
  if (typeof value !== 'string') {
    diagnostics.push(diagnostic('gluon_i18n_non_string_value', locale, key, `Catalog value for "${key}" in locale "${locale}" must be a string.`));
    return;
  }
  validateMessagePattern(locale, key, value, diagnostics);
}

function diagnostic(code: I18nDiagnosticCode, locale: LocaleCode, key: string, message: string, pattern?: I18nMessagePatternType): I18nCatalogDiagnostic {
  return Object.freeze({ code, locale, key, message, ...(pattern ? { pattern } : {}) });
}

function validateMessagePattern(locale: LocaleCode, key: string, message: string, diagnostics: I18nCatalogDiagnostic[]): void {
  for (let index = 0; index < message.length; index += 1) {
    if (message[index] === '}') {
      diagnostics.push(diagnostic('gluon_i18n_malformed_interpolation', locale, key, `Unmatched "}" in catalog message "${key}" for locale "${locale}".`, 'message'));
      return;
    }
    if (message[index] !== '{') continue;
    const result = readBraceExpression(message, index);
    if (!result) {
      diagnostics.push(diagnostic('gluon_i18n_malformed_interpolation', locale, key, `Unmatched "{" in catalog message "${key}" for locale "${locale}".`, 'message'));
      return;
    }
    const { expression, end } = result;
    validateExpression(locale, key, expression, diagnostics);
    index = end;
  }
}

function readBraceExpression(source: string, start: number): { readonly expression: string; readonly end: number } | undefined {
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return { expression: source.slice(start + 1, index), end: index };
      if (depth < 0) return undefined;
    }
  }
  return undefined;
}

function validateExpression(locale: LocaleCode, key: string, expression: string, diagnostics: I18nCatalogDiagnostic[]): void {
  const parts = splitTopLevelCsv(expression);
  const argument = parts[0]?.trim();
  if (!argument || !isValidArgumentName(argument)) {
    diagnostics.push(diagnostic('gluon_i18n_malformed_interpolation', locale, key, `Invalid argument name in catalog message "${key}" for locale "${locale}".`, 'message'));
    return;
  }
  const type = parts[1]?.trim();
  if (!type) return;
  if (type === 'number' || type === 'date') {
    if (parts.length === 2) return;
    diagnostics.push(diagnostic('gluon_i18n_malformed_interpolation', locale, key, `Format styles are not supported for "${type}" in catalog message "${key}" for locale "${locale}".`, 'message'));
    return;
  }
  if (type === 'plural' || type === 'selectordinal' || type === 'select') {
    validateChoiceFormat(locale, key, type, parts.slice(2).join(','), diagnostics);
    return;
  }
  diagnostics.push(diagnostic('gluon_i18n_malformed_interpolation', locale, key, `Unsupported format type "${type}" in catalog message "${key}" for locale "${locale}".`, 'message'));
}

function validateChoiceFormat(
  locale: LocaleCode,
  key: string,
  pattern: I18nMessagePatternType,
  remainder: string,
  diagnostics: I18nCatalogDiagnostic[],
): void {
  if (remainder.includes('offset:')) {
    diagnostics.push(diagnostic('gluon_i18n_malformed_choice', locale, key, `Offset syntax is not supported in ${pattern} message "${key}" for locale "${locale}".`, pattern));
    return;
  }
  const entries = parseChoiceEntries(remainder);
  if (!entries || entries.length === 0) {
    diagnostics.push(diagnostic('gluon_i18n_malformed_choice', locale, key, `Malformed ${pattern} options in catalog message "${key}" for locale "${locale}".`, pattern));
    return;
  }
  let hasOther = false;
  const selectors = new Set<string>();
  for (const entry of entries) {
    if (selectors.has(entry.selector)) {
      diagnostics.push(diagnostic('gluon_i18n_malformed_choice', locale, key, `Duplicate selector "${entry.selector}" in ${pattern} message "${key}" for locale "${locale}".`, pattern));
      continue;
    }
    selectors.add(entry.selector);
    if (pattern !== 'select' && !/^(?:zero|one|two|few|many|other|=-?(?:\d+(?:\.\d+)?|\.\d+))$/.test(entry.selector)) {
      diagnostics.push(diagnostic('gluon_i18n_malformed_choice', locale, key, `Invalid selector "${entry.selector}" in ${pattern} message "${key}" for locale "${locale}".`, pattern));
    }
    if (entry.selector === 'other') hasOther = true;
    if (entry.message.includes('{')) validateMessagePattern(locale, key, entry.message, diagnostics);
  }
  if (!hasOther) diagnostics.push(diagnostic('gluon_i18n_missing_other_branch', locale, key, `Missing "other" branch in ${pattern} message "${key}" for locale "${locale}".`, pattern));
}

function parseChoiceEntries(source: string): readonly { selector: string; message: string }[] | undefined {
  const entries: { selector: string; message: string }[] = [];
  let index = 0;
  while (index < source.length) {
    while (/\s/.test(source[index] ?? '')) index += 1;
    if (index >= source.length) break;
    const selectorStart = index;
    while (index < source.length && source[index] !== '{' && source[index] !== ' ' && source[index] !== '\t') index += 1;
    const selector = source.slice(selectorStart, index).trim();
    while (source[index] === ' ' || source[index] === '\t') index += 1;
    if (!selector || source[index] !== '{') return undefined;
    const body = readBraceExpression(source, index);
    if (!body) return undefined;
    entries.push({ selector, message: body.expression });
    index = body.end + 1;
  }
  return entries;
}

function splitTopLevelCsv(source: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    else if (char === '}') depth -= 1;
    else if (char === ',' && depth === 0) {
      parts.push(source.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(source.slice(start));
  return parts;
}

function isValidArgumentName(value: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_-]*$/.test(value);
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
    const selected = exact ?? choices[category] ?? choices.other;
    if (selected === undefined) return `{${expression}}`;
    return formatMessage(selected.replaceAll('#', i18n.n(value)), values, targetLocale, i18n);
  }
  if (type === 'select') {
    const choices = parseChoices(parts.slice(2).join(','));
    const selected = choices[String(value)] ?? choices.other;
    return selected === undefined ? `{${expression}}` : formatMessage(selected, values, targetLocale, i18n);
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
