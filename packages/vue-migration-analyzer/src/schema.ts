import reportSchema from '../schemas/vue-migration-report.schema.json' with { type: 'json' };

/** JSON Schema version implemented by this package. */
export const VUE_MIGRATION_REPORT_SCHEMA_VERSION = '1.0.0' as const;

/** Frozen public JSON Schema for `VueMigrationReport`. */
export const vueMigrationReportSchema = deepFreeze(reportSchema) as Readonly<Record<string, unknown>>;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) deepFreeze(nested);
  }
  return value;
}
