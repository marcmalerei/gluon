import * as GluonCore from '@gluonjs/core';
import {
  createApp,
  defineElement,
  elementRef,
  GluonElement,
  html,
  type GluonApp,
  type TemplateResult,
} from '@gluonjs/core';
import * as GluonReactivity from '@gluonjs/reactivity';
import { reactive } from '@gluonjs/reactivity';
import { gluonDiagnosticCatalog, type GluonDiagnosticDefinition } from '@gluonjs/compiler/diagnostics';
import type { TemplateDiagnostic } from '@gluonjs/language-server';
import { createStarterTar } from './archive.js';
import { defaultProject, encodePlaygroundProject, projectFromLocation, type PlaygroundProject } from './project.js';

type WorkspaceTab = 'app' | 'config' | 'styles';

export interface PlaygroundState {
  tab: WorkspaceTab;
  project: PlaygroundProject;
  diagnostics: readonly TemplateDiagnostic[];
  query: string;
  selectedCode: string;
  toast: string;
  previewError: string;
}

export interface PlaygroundApplication { readonly app: GluonApp; readonly state: PlaygroundState }

export function createPlaygroundApplication(location: Pick<Location, 'hash' | 'href'> = window.location): PlaygroundApplication {
  const initial = projectFromLocation(location);
  const preview = elementRef<PlaygroundPreviewElement>();
  let initialPreviewStarted = false;
  const state = reactive<PlaygroundState>({
    tab: 'app', project: initial, diagnostics: [], query: '',
    selectedCode: 'GLUON_TEMPLATE_VOID_CHILDREN', toast: '', previewError: '',
  });
  const attachPreview = (element: Element | undefined) => {
    preview.value = element as PlaygroundPreviewElement | undefined;
    if (!preview.value || initialPreviewStarted) return;
    initialPreviewStarted = true;
    void Promise.all([analyze(initial.app), preview.value.runProject(initial)])
      .then(([diagnostics]) => { state.diagnostics = diagnostics; })
      .catch((error) => { state.previewError = errorMessage(error); });
  };

  const run = async () => {
    state.diagnostics = await analyze(state.project.app);
    try {
      await preview.value?.runProject(state.project);
      state.previewError = '';
      notify('Preview and diagnostics updated');
    } catch (error) {
      await preview.value?.clearProject();
      state.previewError = errorMessage(error);
      notify('Preview failed');
    }
  };
  const updateSource = (value: string) => {
    state.project = Object.freeze({ ...state.project, [state.tab === 'styles' ? 'styles' : 'app']: value });
  };
  const share = async () => {
    const hash = `p=${encodePlaygroundProject(state.project)}`;
    history.replaceState(null, '', `#${hash}`);
    try { await navigator.clipboard?.writeText(window.location.href); notify('Stable reproduction URL copied'); }
    catch { notify('Stable reproduction URL updated'); }
  };
  const download = () => {
    const url = URL.createObjectURL(createStarterTar(state.project));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'gluon-playground-reproduction.tar'; anchor.click();
    queueMicrotask(() => URL.revokeObjectURL(url));
    notify('Starter archive downloaded');
  };
  const notify = (message: string) => {
    state.toast = message;
    globalThis.setTimeout(() => { if (state.toast === message) state.toast = ''; }, 1800);
  };
  const reset = () => {
    state.project = defaultProject; state.diagnostics = []; state.tab = 'app'; state.previewError = '';
    void Promise.all([analyze(defaultProject.app), preview.value?.runProject(defaultProject)])
      .then(([diagnostics]) => { state.diagnostics = diagnostics; })
      .catch((error) => { state.previewError = errorMessage(error); });
    history.replaceState(null, '', window.location.pathname); notify('New reproduction ready');
  };
  const selectDiagnostic = (code: string) => { state.selectedCode = code; state.tab = 'config'; };

  const app = createApp(() => html`
    <div class="shell">
      <header class="topbar">
        <div class="brand"><strong>GLUON</strong>&nbsp;/&nbsp;PLAYGROUND</div>
        <nav class="top-actions" aria-label="Playground actions">
          <button type="button" @click=${reset}>${Icon('new')}<span>New</span></button>
          <button class="primary" type="button" @click=${run}>${Icon('run')}<span>Run</span></button>
          <button type="button" @click=${share}>${Icon('share')}<span>Share</span></button>
          <button type="button" @click=${download}>${Icon('download')}<span>Download</span></button>
        </nav>
      </header>
      <div class="workbench">
        <nav class="rail" aria-label="Workspace files" role="tablist">
          ${tabButton('app', 'App', state, () => { state.tab = 'app'; })}
          ${tabButton('styles', 'Styles', state, () => { state.tab = 'styles'; })}
          ${tabButton('config', 'Config', state, () => { state.tab = 'config'; })}
        </nav>
        ${state.tab === 'config'
          ? DiagnosticReference(state)
          : html`
            <section class="panel editor-panel" aria-label="Code editor">
              <div class="panel-heading"><span>${state.tab === 'app' ? 'App.ts' : 'styles.ts'}</span><span>●</span></div>
              <div class="editor-wrap">
                <div class="line-numbers" aria-hidden="true">${lineNumbers(state.tab === 'app' ? state.project.app : state.project.styles)}</div>
                <textarea aria-label=${`${state.tab === 'app' ? 'Application' : 'Styles'} source`} spellcheck="false"
                  .value=${state.tab === 'app' ? state.project.app : state.project.styles}
                  @input=${(event: Event) => updateSource((event.currentTarget as HTMLTextAreaElement).value)}></textarea>
              </div>
            </section>
            <section class="panel preview-panel" aria-label="Live preview">
              <div class="panel-heading"><span>Preview</span><span>Desktop</span></div>
              <div class="preview"><gluon-playground-preview ...=${{ ref: attachPreview }}></gluon-playground-preview></div>
              ${state.previewError ? html`<p class="preview-error" role="alert">${state.previewError}</p>` : null}
            </section>`}
      </div>
      <section class="diagnostics" aria-label="Diagnostics">
        <div class="diagnostic-head"><h2>Diagnostics <span>${state.diagnostics.length}</span></h2><button type="button" @click=${() => { state.diagnostics = []; }}>Clear</button></div>
        ${state.diagnostics.map((entry) => html`<button class="diagnostic-row" type="button" @click=${() => selectDiagnostic(entry.code)}>
          <code>${entry.code}</code><small>App.ts:${entry.range.start.line + 1}:${entry.range.start.character + 1}</small><span>${catalog(entry.code)?.remediation ?? entry.message}</span>
        </button>`)}
      </section>
      <footer class="status"><span>Gluon 1.0.3</span><span>TypeScript</span><span class="ready">Ready</span></footer>
      ${state.toast ? html`<div class="toast" role="status">${state.toast}</div>` : null}
    </div>
  `);
  return { app, state };
}

function tabButton(tab: WorkspaceTab, label: string, state: PlaygroundState, select: () => void) {
  return html`<button type="button" role="tab" aria-selected=${String(state.tab === tab)} @click=${select}>${Icon(tab)}<span>${label}</span></button>`;
}

function DiagnosticReference(state: PlaygroundState) {
  const query = state.query.trim().toLowerCase();
  const filtered = gluonDiagnosticCatalog.filter((entry) => !query || `${entry.code} ${entry.title} ${entry.remediation}`.toLowerCase().includes(query));
  const selected = filtered.find((entry) => entry.code === state.selectedCode) ?? filtered[0];
  const matches = selected ? [selected, ...filtered.filter((entry) => entry !== selected)] : [];
  return html`<section class="reference" aria-label="Diagnostic reference">
    <aside class="reference-index">
      <input type="search" aria-label="Search diagnostic codes or remediation" placeholder="Search codes or remediation" .value=${state.query}
        @input=${(event: Event) => { state.query = (event.currentTarget as HTMLInputElement).value; }}>
      <div class="code-list">${matches.map((entry) => html`<button type="button" aria-current=${String(entry.code === selected?.code)} @click=${() => { state.selectedCode = entry.code; }}>${entry.code}</button>`)}</div>
    </aside>
    <article class="reference-detail">
      ${selected ? html`
        <h1>${selected.code}</h1>
        ${detailSection('Meaning', selected.summary)}
        ${detailSection('Why this happens', selected.why)}
        ${detailSection('How to fix it', selected.remediation)}
        <section><h2>Examples (TypeScript)</h2><div class="examples"><div><strong>Before</strong><pre>${selected.before ?? `// ${selected.code}\n// invalid usage`}</pre></div><div><strong>After</strong><pre>${selected.after ?? `// Apply the documented remediation.\n// Then rerun npm run check:templates.`}</pre></div></div></section>
      ` : html`<p role="status">No diagnostics match this search.</p>`}
    </article>
  </section>`;
}

function detailSection(title: string, value: string) { return html`<section><h2>${title}</h2><p>${value}</p></section>`; }
function catalog(code: string): GluonDiagnosticDefinition | undefined { return gluonDiagnosticCatalog.find((entry) => entry.code === code); }
async function analyze(source: string): Promise<readonly TemplateDiagnostic[]> {
  const { analyzeGluonDocument } = await import('@gluonjs/language-server');
  return analyzeGluonDocument('playground:///App.ts', source).diagnostics.map((entry) => ({
    ...entry,
    range: { start: { ...entry.range.start }, end: { ...entry.range.end } },
  }));
}
function lineNumbers(source: string): string { return Array.from({ length: source.split('\n').length }, (_, index) => index + 1).join('\n'); }

type PlaygroundModule = Record<string, unknown>;
type PlaygroundRenderer = (count: number, increment: () => void) => TemplateResult;

class PlaygroundPreviewElement extends GluonElement {
  private count = 2;
  private renderer?: PlaygroundRenderer;

  async runProject(project: PlaygroundProject): Promise<void> {
    const [application, styles] = await Promise.all([
      executeModule(project.app, 'App.ts'),
      executeModule(project.styles, 'styles.ts'),
    ]);
    const renderer = application.default ?? application.App ?? application.Counter
      ?? Object.values(application).find((value) => typeof value === 'function');
    if (typeof renderer !== 'function') {
      throw new Error('GLUON_PLAYGROUND_RENDER_EXPORT_MISSING: Export a default, App, Counter, or render function.');
    }
    this.renderer = renderer as PlaygroundRenderer;
    this.count = initialCount(project.app);
    this.shadowRoot!.adoptedStyleSheets = Object.values(styles)
      .filter((value): value is CSSStyleSheet => value instanceof CSSStyleSheet);
    await this.requestUpdate();
  }

  async clearProject(): Promise<void> {
    this.renderer = undefined;
    this.shadowRoot!.adoptedStyleSheets = [];
    await this.requestUpdate();
  }

  protected override render(): TemplateResult {
    if (!this.renderer) return html`<p class="preview-placeholder">Run the reproduction to render its exported component.</p>`;
    try {
      return this.renderer(this.count, () => { this.count += 1; void this.requestUpdate(); });
    } catch (error) {
      return html`<p class="preview-runtime-error" role="alert">${errorMessage(error)}</p>`;
    }
  }
}

if (!customElements.get('gluon-playground-preview')) {
  defineElement('gluon-playground-preview', PlaygroundPreviewElement);
}

async function executeModule(source: string, fileName: string): Promise<PlaygroundModule> {
  const { default: ts } = await import('typescript');
  const result = ts.transpileModule(source, {
    fileName,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      isolatedModules: true,
    },
  });
  const failures = result.diagnostics?.filter((entry) => entry.category === ts.DiagnosticCategory.Error) ?? [];
  if (failures.length > 0) {
    const message = failures.map((entry) => ts.flattenDiagnosticMessageText(entry.messageText, ' ')).join(' ');
    throw new Error(`GLUON_PLAYGROUND_COMPILE_FAILED: ${message}`);
  }
  const playgroundModule: { exports: PlaygroundModule } = { exports: {} };
  const requireModule = (specifier: string): object => {
    if (specifier === '@gluonjs/core') return GluonCore;
    if (specifier === '@gluonjs/reactivity') return GluonReactivity;
    throw new Error(`GLUON_PLAYGROUND_IMPORT_UNSUPPORTED: ${specifier}`);
  };
  const evaluate = new Function('require', 'module', 'exports', `'use strict';\n${result.outputText}`);
  evaluate(requireModule, playgroundModule, playgroundModule.exports);
  return playgroundModule.exports;
}

function initialCount(source: string): number {
  return Number(/(?:count\s*=|Counter\()\s*(\d+)/.exec(source)?.[1] ?? 2);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function Icon(name: WorkspaceTab | 'download' | 'new' | 'run' | 'share') {
  if (name === 'run') return html`<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 4.5 19 12 7 19.5Z"></path></svg>`;
  if (name === 'share') return html`<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="6" cy="12" r="2.5"></circle><circle cx="18" cy="6" r="2.5"></circle><circle cx="18" cy="18" r="2.5"></circle><path d="m8.3 10.8 7.4-3.6M8.3 13.2l7.4 3.6"></path></svg>`;
  if (name === 'download') return html`<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3v12m-4-4 4 4 4-4M4 19h16"></path></svg>`;
  if (name === 'new') return html`<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6Zm8 0v5h4"></path></svg>`;
  if (name === 'styles') return html`<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m4 19 5-5m1-8 8-3 3 3-3 8-8 3-3-3Zm6 1 4 4"></path></svg>`;
  if (name === 'config') return html`<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"></path></svg>`;
  return html`<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m8 6-5 6 5 6m8-12 5 6-5 6M14 3l-4 18"></path></svg>`;
}
