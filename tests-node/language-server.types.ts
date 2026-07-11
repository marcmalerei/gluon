import {
  GluonLanguageService,
  GluonProtocolServer,
  analyzeGluonProject,
  type DocumentAnalysis,
  type WorkspaceEdit,
} from '../packages/language-server/dist/index.js';

const analyses: readonly DocumentAnalysis[] = analyzeGluonProject([{ uri: 'file:///app.ts', text: '' }]);
const service = new GluonLanguageService();
service.open('file:///app.ts', '');
const edit: WorkspaceEdit | undefined = service.rename('file:///app.ts', { line: 0, character: 0 }, 'new-tag');
void analyses;
void edit;
new GluonProtocolServer().handle({ jsonrpc: '2.0', id: 1, method: 'initialize' });
