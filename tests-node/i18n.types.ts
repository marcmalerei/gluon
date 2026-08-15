import {
  validateI18nCatalog,
  type I18nCatalogDiagnostic,
  type I18nCatalogInput,
  type I18nCatalogValue,
  type I18nDiagnosticCode,
  type I18nMessagePatternType,
} from '../packages/i18n/dist/index.js';

const messages: I18nCatalogValue = [
  ['title', 'Bag'],
  ['count', '{count, plural, one {# item} other {# items}}'],
];
const input: I18nCatalogInput = new Map([['en', messages]]);
const diagnostics: readonly I18nCatalogDiagnostic[] = validateI18nCatalog(input);
const code: I18nDiagnosticCode | undefined = diagnostics[0]?.code;
const pattern: I18nMessagePatternType | undefined = diagnostics[0]?.pattern;
void code;
void pattern;

// @ts-expect-error diagnostics are immutable evidence
diagnostics.push({ code: 'gluon_i18n_invalid_catalog', locale: 'en', key: '', message: 'invalid' });
