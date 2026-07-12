#!/usr/bin/env node
import { analyzeVueMigration, formatVueMigrationReport, VueMigrationAnalyzerError } from './index.js';

const arguments_ = process.argv.slice(2);
if (arguments_.includes('--help')) {
  process.stdout.write('Usage: gluon-vue-analyze [root] [--format human|json]\n');
} else if (arguments_.includes('--version')) {
  process.stdout.write('0.0.0\n');
} else {
  const formatIndex = arguments_.indexOf('--format');
  const format = formatIndex >= 0 ? arguments_[formatIndex + 1] : 'human';
  const positional = arguments_.filter((_argument, index) => formatIndex < 0 || (index !== formatIndex && index !== formatIndex + 1));
  if (!['human', 'json'].includes(format ?? '') || positional.length > 1 || positional.some((argument) => argument.startsWith('-'))) {
    process.stderr.write('Usage: gluon-vue-analyze [root] [--format human|json]\n');
    process.exitCode = 2;
  } else {
    try {
      const report = await analyzeVueMigration({ root: positional[0] ?? '.' });
      process.stdout.write(formatVueMigrationReport(report, format as 'human' | 'json'));
      process.exitCode = report.findings.some((finding) => finding.code === 'GVA9002') ? 3
        : report.findings.some((finding) => finding.severity === 'error') ? 1 : 0;
    } catch (error) {
      const analyzerError = error instanceof VueMigrationAnalyzerError ? error : new VueMigrationAnalyzerError('Vue migration analysis failed.', 2);
      process.stderr.write(`${analyzerError.message}\n`);
      process.exitCode = analyzerError.exitCode;
    }
  }
}
