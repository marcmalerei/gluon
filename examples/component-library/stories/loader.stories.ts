import type { Meta, StoryObj } from '@gluonjs/gluon-components-vite';
import { css, html } from '@gluonjs/core';
import { componentLibraryManifest } from '@gluonjs/example-component-library/manifest';
import {
  createComponentLibraryLoader,
  type ComponentLibraryEntry,
} from '@gluonjs/quarks';

type LoaderMode = 'loading' | 'cache' | 'error';

const panelStyles = css`
  :host { display: block; color: #101010; font: 16px/1.5 system-ui, sans-serif; }
  section { inline-size: 28rem; min-block-size: 12rem; padding: 2rem; border: 1px solid #d8d8d8; }
  h2 { margin: 0 0 0.5rem; font-size: 1.25rem; }
  p { margin: 0 0 1rem; color: #444; }
  button { min-block-size: 44px; padding: 0.5rem 1rem; border: 1px solid #101010; background: #d9ff43; color: #101010; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.25rem 1rem; margin: 1rem 0 0; }
  dt { font-weight: 700; }
  dd { margin: 0; }
  [data-loaded-component] { display: block; margin-block-start: 1rem; }
`;

const meta = {
  title: 'Component library/Loader',
  render: ({ mode }) => html`${createLoaderPanel(mode)}`,
  args: { mode: 'loading' as LoaderMode },
  argTypes: {
    mode: {
      control: 'select',
      options: ['loading', 'cache', 'error'],
    },
  },
} satisfies Meta<{ mode: LoaderMode }>;

export default meta;
type Story = StoryObj<{ mode: LoaderMode }>;

export const Loading: Story = {
  args: { mode: 'loading' },
  play: async ({ canvasElement }) => {
    const panel = requirePanel(canvasElement);
    panel.button.click();
    await waitFor(() => panel.status.textContent === 'loading');
    if (panel.attempts.textContent !== '1') throw new Error('Loading story must start exactly one public module request.');
  },
};

export const Cached: Story = {
  args: { mode: 'cache' },
  play: async ({ canvasElement }) => {
    const panel = requirePanel(canvasElement);
    panel.button.click();
    await waitFor(() => panel.status.textContent === 'loaded');
    panel.button.click();
    await waitFor(() => panel.status.textContent === 'loaded (cache hit)');
    if (panel.attempts.textContent !== '1') throw new Error('Cache story must resolve the public module only once.');
  },
};

export const ErrorState: Story = {
  name: 'Error',
  args: { mode: 'error' },
  play: async ({ canvasElement }) => {
    const panel = requirePanel(canvasElement);
    panel.button.click();
    await waitFor(() => panel.status.textContent === 'failed');
    if (panel.attempts.textContent !== '1') throw new Error('Error story must report the failed public module request.');
  },
};

function createLoaderPanel(mode: LoaderMode): HTMLElement {
  const host = document.createElement('div');
  host.dataset.loaderStory = mode;
  const root = host.attachShadow({ mode: 'open' });
  root.adoptedStyleSheets = [panelStyles];

  const section = document.createElement('section');
  const heading = document.createElement('h2');
  heading.id = `loader-${mode}-heading`;
  heading.textContent = `${label(mode)} loader state`;
  section.setAttribute('aria-labelledby', heading.id);
  const description = document.createElement('p');
  description.textContent = descriptions[mode];
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Load product picker';
  const status = document.createElement('output');
  status.dataset.loaderStatus = '';
  status.setAttribute('aria-live', 'polite');
  status.textContent = 'idle';
  const attempts = document.createElement('output');
  attempts.dataset.loaderAttempts = '';
  attempts.textContent = '0';
  const details = document.createElement('dl');
  details.append(
    term('Status'), definition(status),
    term('Module requests'), definition(attempts),
  );
  const loadedComponent = document.createElement('div');
  loadedComponent.dataset.loadedComponent = '';
  section.append(heading, description, button, details, loadedComponent);
  root.append(section);

  let requestCount = 0;
  const loader = createComponentLibraryLoader(componentLibraryManifest, {
    async load(entry: ComponentLibraryEntry) {
      requestCount += 1;
      attempts.textContent = String(requestCount);
      if (mode === 'loading') return new Promise<never>(() => undefined);
      if (mode === 'error') throw new Error(`Story resolver rejected ${entry.module}.`);
      const module = await loadPublicModule(entry);
      if (!(entry.exportName in module)) throw new TypeError(`Missing public export ${entry.exportName}.`);
      return module[entry.exportName];
    },
  });

  button.addEventListener('click', () => {
    const requestsBeforeLoad = requestCount;
    const result = loader.load('product-picker');
    status.textContent = loader.status('product-picker');
    void result.then((loaded) => {
      status.textContent = requestCount === requestsBeforeLoad ? 'loaded (cache hit)' : loader.status('product-picker');
      const picker = document.createElement(loaded.entry.tag!);
      picker.setAttribute('value', '1');
      loadedComponent.replaceChildren(picker);
    }, () => {
      status.textContent = loader.status('product-picker');
      loadedComponent.replaceChildren();
    });
  });

  return host;
}

const publicModules: Readonly<Record<string, () => Promise<Record<string, unknown>>>> = {
  '@gluonjs/example-component-library/product-badge': () => import('@gluonjs/example-component-library/product-badge'),
  '@gluonjs/example-component-library/product-picker': () => import('@gluonjs/example-component-library/product-picker'),
};

async function loadPublicModule(entry: ComponentLibraryEntry): Promise<Record<string, unknown>> {
  const loadModule = publicModules[entry.module];
  if (!loadModule) throw new RangeError(`No public story resolver for ${entry.module}.`);
  return loadModule();
}

function requirePanel(canvasElement: HTMLElement): {
  button: HTMLButtonElement;
  status: HTMLOutputElement;
  attempts: HTMLOutputElement;
} {
  const root = canvasElement.querySelector<HTMLElement>('[data-loader-story]')?.shadowRoot;
  const button = root?.querySelector<HTMLButtonElement>('button');
  const status = root?.querySelector<HTMLOutputElement>('[data-loader-status]');
  const attempts = root?.querySelector<HTMLOutputElement>('[data-loader-attempts]');
  if (!button || !status || !attempts) throw new Error('Loader story did not render its public state controls.');
  return { button, status, attempts };
}

function term(value: string): HTMLElement {
  const element = document.createElement('dt');
  element.textContent = value;
  return element;
}

function definition(value: HTMLElement): HTMLElement {
  const element = document.createElement('dd');
  element.append(value);
  return element;
}

function label(mode: LoaderMode): string {
  return mode[0]!.toUpperCase() + mode.slice(1);
}

async function waitFor(assertion: () => boolean): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (!assertion()) {
    if (Date.now() >= deadline) throw new Error('Loader story interaction timed out.');
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 10));
  }
}

const descriptions: Readonly<Record<LoaderMode, string>> = {
  loading: 'The public module promise remains pending while the loader exposes its loading state.',
  cache: 'Two explicit loads reuse one public module request and the same loader promise.',
  error: 'A rejected public module request becomes an observable failed state.',
};
