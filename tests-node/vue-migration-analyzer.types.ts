import {
  VUE_MIGRATION_REPORT_SCHEMA_VERSION,
  analyzeVueMigration,
  formatVueMigrationReport,
  type VueMigrationReport,
} from '../packages/vue-migration-analyzer/dist/src/index.js';
import { vueMigrationReportSchema } from '../packages/vue-migration-analyzer/dist/src/schema.js';

const report: Promise<VueMigrationReport> = analyzeVueMigration({ root: '.' });
void report;
VUE_MIGRATION_REPORT_SCHEMA_VERSION satisfies '1.0.0';
vueMigrationReportSchema.type;

// @ts-expect-error format is restricted to the public output formats
formatVueMigrationReport({} as VueMigrationReport, 'yaml');
// @ts-expect-error root is required
analyzeVueMigration({});
