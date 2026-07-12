export const componentKinds = ['atom', 'molecule', 'organism', 'element', 'headless'] as const;

export type ComponentKind = typeof componentKinds[number];

export interface ComponentTemplateOptions {
  readonly kind: ComponentKind;
  readonly name: string;
  readonly slug: string;
  readonly tagName?: string;
}

export interface ComponentTemplate {
  readonly files: ReadonlyMap<string, string>;
  readonly dependencies: readonly string[];
  readonly developmentDependencies: readonly string[];
  readonly barrelExport: string;
}

export function createComponentTemplate(options: ComponentTemplateOptions): ComponentTemplate {
  const files = new Map<string, string>();
  const source = componentSource(options);
  files.set(`${options.slug}.ts`, source);
  files.set(`${options.slug}.spec.ts`, componentTestSource(options));
  if (options.kind === 'element') {
    files.set(`${options.slug}.usage.html`, elementUsageSource(options));
  }
  return Object.freeze({
    files,
    dependencies: Object.freeze([...componentDependencies[options.kind]]),
    developmentDependencies: Object.freeze(options.kind === 'element' ? ['@gluonjs/devtools'] : []),
    barrelExport: `export * from './${options.slug}.js';`,
  });
}

const componentDependencies: Record<ComponentKind, readonly string[]> = {
  atom: ['@gluonjs/core', '@gluonjs/quarks', '@gluonjs/atoms'],
  molecule: ['@gluonjs/core', '@gluonjs/quarks', '@gluonjs/atoms', '@gluonjs/molecules'],
  organism: ['@gluonjs/core', '@gluonjs/quarks', '@gluonjs/atoms', '@gluonjs/molecules', '@gluonjs/organisms'],
  element: ['@gluonjs/core'],
  headless: ['@gluonjs/quarks'],
};

function componentSource(options: ComponentTemplateOptions): string {
  switch (options.kind) {
    case 'atom': return atomSource(options);
    case 'molecule': return moleculeSource(options);
    case 'organism': return organismSource(options);
    case 'element': return elementSource(options);
    case 'headless': return headlessSource(options);
  }
}

function componentTestSource(options: ComponentTemplateOptions): string {
  switch (options.kind) {
    case 'atom': return atomTestSource(options);
    case 'molecule': return moleculeTestSource(options);
    case 'organism': return organismTestSource(options);
    case 'element': return elementTestSource(options);
    case 'headless': return headlessTestSource(options);
  }
}

function visualImports(): string {
  return `import {
  createStyleSheetOwner,
  createStyleSheetSelection,
  css,
  type StyleTarget,
} from '@gluonjs/core';`;
}

function visualOwnership(name: string, slug: string): string {
  return `export const ${name}Styles = css\`
  @layer app.components {
    .app-${slug} { min-height: 44px; }
  }
\`;

export const ${name}StyleSelection = createStyleSheetSelection([
  { id: 'app-${slug}', scope: 'app-components', sheet: ${name}Styles },
]);

/** Installs this app-owned sheet on one Document or ShadowRoot owner. */
export function install${name}Styles(target: StyleTarget = document) {
  const owner = createStyleSheetOwner(target);
  owner.retain(${name}Styles);
  return owner;
}`;
}

function atomSource({ name, slug }: ComponentTemplateOptions): string {
  return `${visualImports()}
import { defineAtom } from '@gluonjs/atoms';
import { q, type QuarkRef } from '@gluonjs/quarks';

export interface ${name}Props {
  readonly label: string;
  readonly pressed?: boolean;
  readonly ref?: QuarkRef<HTMLButtonElement>;
  readonly onPress?: (event: MouseEvent) => void;
}

${visualOwnership(name, slug)}

export const ${name} = defineAtom((props: ${name}Props) => q.button({
  type: 'button',
  class: 'app-${slug}',
  data: { component: '${slug}' },
  aria: { pressed: props.pressed ?? false },
  ref: props.ref,
  onClick: props.onPress,
  children: props.label,
}), '${name}');
`;
}

function moleculeSource({ name, slug }: ComponentTemplateOptions): string {
  return `${visualImports()}
import { Button } from '@gluonjs/atoms';
import { defineMolecule } from '@gluonjs/molecules';
import { q } from '@gluonjs/quarks';

export interface ${name}Props {
  readonly title: string;
  readonly actionLabel: string;
  readonly onAction?: (event: MouseEvent) => void;
}

${visualOwnership(name, slug)}

export const ${name} = defineMolecule((props: ${name}Props) => q.section({
  class: 'app-${slug}',
  data: { component: '${slug}' },
  aria: { label: props.title },
  children: [
    q.h2({ children: props.title }),
    Button({ label: props.actionLabel, onClick: props.onAction }),
  ],
}), '${name}');
`;
}

function organismSource({ name, slug }: ComponentTemplateOptions): string {
  return `${visualImports()}
import { Button } from '@gluonjs/atoms';
import { Card } from '@gluonjs/molecules';
import { defineOrganism } from '@gluonjs/organisms';
import { q } from '@gluonjs/quarks';

export interface ${name}Props {
  readonly heading: string;
  readonly summary: string;
  readonly continueLabel: string;
  readonly onContinue?: (event: MouseEvent) => void;
}

${visualOwnership(name, slug)}

export const ${name} = defineOrganism((props: ${name}Props) => q.main({
  class: 'app-${slug}',
  data: { component: '${slug}' },
  aria: { label: props.heading },
  children: Card({
    title: props.heading,
    actions: Button({ label: props.continueLabel, onClick: props.onContinue }),
    children: q.p({ children: props.summary }),
  }),
}), '${name}');
`;
}

function elementSource({ name, slug, tagName }: ComponentTemplateOptions): string {
  if (!tagName) throw new Error('A generated element requires a tag name.');
  return `import {
  css,
  defineGluonElement,
  elementEvent,
  elementProperty,
  html,
} from '@gluonjs/core';

export interface ${name}Metadata {
  readonly source: string;
}

export interface ${name}ActivateDetail {
  readonly label: string;
  readonly source: string;
}

export const ${name}Tag = '${tagName}' as const;

export const ${name}Styles = css\`
  :host { display: block; }
  .control { display: grid; gap: 8px; }
  button { min-height: 44px; font: inherit; }
  button:focus-visible { outline: 3px solid #173f91; outline-offset: 3px; }
\`;

/**
 * Standalone usage:
 * <${tagName} label="Continue">Account <span slot="help">Required</span></${tagName}>
 */
export const ${name} = defineGluonElement({
  tagName: '${tagName}',
  properties: {
    label: { type: String, reflect: true, default: 'Continue' },
    disabled: { type: Boolean, reflect: true, default: false },
    metadata: elementProperty<${name}Metadata>({
      attribute: false,
      default: () => ({ source: 'application' }),
    }),
  },
  events: {
    activate: elementEvent<${name}ActivateDetail>({ cancelable: true }),
  },
  slots: {
    default: { required: true },
    help: { fallback: true },
  },
  styles: ${name}Styles,
  setup(context) {
    const refreshCount = context.state('refresh-count', 0);
    const refresh = () => { refreshCount.value += 1; };
    if (typeof window !== 'undefined') {
      window.addEventListener('${slug}:refresh', refresh);
      context.onCleanup(() => window.removeEventListener('${slug}:refresh', refresh));
    }
    return {
      expose: {
        focus: (options?: FocusOptions) => context.host.shadowRoot?.querySelector('button')?.focus(options),
        refreshCount: () => refreshCount.value,
      },
      render: () => html\`
        <section class="control" aria-label=\${context.props.label}>
          <slot></slot>
          <button
            type="button"
            ?disabled=\${context.props.disabled}
            @click=\${() => context.emit('activate', {
              label: context.props.label,
              source: context.props.metadata.source,
            })}
          >\${context.props.label}</button>
          <slot name="help"><span>Choose an action.</span></slot>
          <output aria-live="polite">Refreshes: \${refreshCount.value}</output>
        </section>
      \`,
    };
  },
});

export type ${name}Element = InstanceType<typeof ${name}>;
`;
}

function headlessSource({ name }: ComponentTemplateOptions): string {
  return `import {
  createFocusScope,
  type FocusScope,
  type FocusScopeOptions,
} from '@gluonjs/quarks';

export interface ${name}Options extends FocusScopeOptions {
  readonly activate?: boolean;
}

/** Owns focus behavior only; its caller owns markup, styles, and deactivation. */
export function create${name}(
  container: HTMLElement,
  options: ${name}Options = {},
): FocusScope {
  const { activate = false, ...focusOptions } = options;
  const scope = createFocusScope(container, focusOptions);
  if (activate) scope.activate();
  return scope;
}
`;
}

function atomTestSource({ name, slug }: ComponentTemplateOptions): string {
  return `import { afterEach, expect, test, vi } from 'vitest';
import { cleanupFixtures, renderFixture } from '@gluonjs/test-utils';
import { ${name}, ${name}StyleSelection, install${name}Styles } from './${slug}.js';

afterEach(() => cleanupFixtures());

test('${name} renders native semantics, interaction, accessibility, and owned style cleanup', () => {
  const press = vi.fn();
  const ref: { value?: HTMLButtonElement } = {};
  const fixture = renderFixture(() => ${name}({ label: 'Save changes', pressed: true, ref, onPress: press }));
  const owner = install${name}Styles(document);
  fixture.own(() => owner.dispose(), '${name} stylesheet owner');
  const button = fixture.get<HTMLButtonElement>('button');
  expect(button.type).toBe('button');
  expect(button.getAttribute('aria-pressed')).toBe('true');
  expect(button.dataset.component).toBe('${slug}');
  expect(ref.value).toBe(button);
  expect(${name}StyleSelection.entries[0]?.id).toBe('app-${slug}');
  button.click();
  expect(press).toHaveBeenCalledOnce();
  fixture.cleanup();
  expect(ref.value).toBeUndefined();
  expect(owner.disposed).toBe(true);
});
`;
}

function moleculeTestSource({ name, slug }: ComponentTemplateOptions): string {
  return `import { afterEach, expect, test, vi } from 'vitest';
import { cleanupFixtures, renderFixture } from '@gluonjs/test-utils';
import { ${name}, ${name}StyleSelection, install${name}Styles } from './${slug}.js';

afterEach(() => cleanupFixtures());

test('${name} composes an Atom with semantic output and releases owned styles', () => {
  const action = vi.fn();
  const fixture = renderFixture(() => ${name}({ title: 'Delivery', actionLabel: 'Continue', onAction: action }));
  const owner = install${name}Styles(document);
  fixture.own(() => owner.dispose(), '${name} stylesheet owner');
  const section = fixture.get<HTMLElement>('section');
  expect(section.getAttribute('aria-label')).toBe('Delivery');
  expect(section.querySelector('h2')?.textContent).toBe('Delivery');
  const button = fixture.get<HTMLButtonElement>('button');
  expect(button.textContent).toBe('Continue');
  expect(${name}StyleSelection.entries[0]?.scope).toBe('app-components');
  button.click();
  expect(action).toHaveBeenCalledOnce();
  fixture.cleanup();
  expect(owner.disposed).toBe(true);
});
`;
}

function organismTestSource({ name, slug }: ComponentTemplateOptions): string {
  return `import { afterEach, expect, test, vi } from 'vitest';
import { cleanupFixtures, renderFixture } from '@gluonjs/test-utils';
import { ${name}, ${name}StyleSelection, install${name}Styles } from './${slug}.js';

afterEach(() => cleanupFixtures());

test('${name} composes only downward with landmarks, interaction, and cleanup', () => {
  const continuation = vi.fn();
  const fixture = renderFixture(() => ${name}({
    heading: 'Review order',
    summary: 'One configured object',
    continueLabel: 'Place order',
    onContinue: continuation,
  }));
  const owner = install${name}Styles(document);
  fixture.own(() => owner.dispose(), '${name} stylesheet owner');
  const landmark = fixture.get<HTMLElement>('main');
  expect(landmark.getAttribute('aria-label')).toBe('Review order');
  expect(landmark.querySelector('article')).not.toBeNull();
  expect(landmark.textContent).toContain('One configured object');
  expect(${name}StyleSelection.entries[0]?.id).toBe('app-${slug}');
  fixture.get<HTMLButtonElement>('button').click();
  expect(continuation).toHaveBeenCalledOnce();
  fixture.cleanup();
  expect(owner.disposed).toBe(true);
});
`;
}

function elementTestSource({ name, slug }: ComponentTemplateOptions): string {
  return `import { afterEach, expect, test, vi } from 'vitest';
import { createDevtoolsBridge } from '@gluonjs/devtools';
import { cleanupFixtures, mountElement } from '@gluonjs/test-utils';
import { ${name}, ${name}Tag, type ${name}Element } from './${slug}.js';

afterEach(() => cleanupFixtures());

test('${name} exposes typed inputs, native events, slots, styles, and connection cleanup', async () => {
  const activate = vi.fn();
  const fixture = mountElement<${name}Element>(${name}Tag, {
    properties: { label: 'Continue', metadata: { source: 'checkout' } },
    slots: { default: 'Account', help: 'Required field' },
    events: { activate },
  });
  await fixture.element.updateComplete;
  const bridge = createDevtoolsBridge({ enabled: true });
  const unregister = bridge.registerApplication({
    id: 'generated-component',
    name: '${name}',
    app: fixture.app,
    root: fixture.container,
  });
  fixture.own(() => { unregister(); bridge.dispose(); }, '${name} Devtools registration');
  expect(fixture.element).toBeInstanceOf(${name});
  expect(fixture.element.shadowRoot?.adoptedStyleSheets).toHaveLength(1);
  expect(fixture.element.shadowRoot?.querySelector('section')?.getAttribute('aria-label')).toBe('Continue');
  expect(fixture.element.textContent).toContain('Account');
  expect(bridge.snapshot().applications[0]?.components[0]).toEqual(expect.objectContaining({
    name: ${name}Tag,
    properties: expect.objectContaining({ label: 'Continue', metadata: { source: 'checkout' } }),
    stylesheets: 1,
  }));
  fixture.element.shadowRoot?.querySelector<HTMLButtonElement>('button')?.click();
  expect((activate.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({ label: 'Continue', source: 'checkout' });
  window.dispatchEvent(new Event('${slug}:refresh'));
  await fixture.element.updateComplete;
  expect(fixture.element.refreshCount()).toBe(1);
  fixture.cleanup();
  window.dispatchEvent(new Event('${slug}:refresh'));
  expect(fixture.element.refreshCount()).toBe(1);
});
`;
}

function headlessTestSource({ name, slug }: ComponentTemplateOptions): string {
  return `import { afterEach, expect, test } from 'vitest';
import { html } from '@gluonjs/core';
import { cleanupFixtures, renderFixture } from '@gluonjs/test-utils';
import { create${name} } from './${slug}.js';

afterEach(() => cleanupFixtures());

test('create${name} owns focus behavior without visual markup or retained listeners', () => {
  const trigger = document.createElement('button');
  trigger.textContent = 'Open';
  document.body.append(trigger);
  trigger.focus();
  const fixture = renderFixture(() => html\`<section tabindex="-1"><button>First</button><button>Last</button></section>\`);
  const container = fixture.get<HTMLElement>('section');
  const scope = create${name}(container, { activate: true, returnFocus: trigger });
  fixture.own(() => scope.deactivate(), '${name} focus scope');
  expect(scope.active).toBe(true);
  expect(document.activeElement?.textContent).toBe('First');
  container.querySelectorAll('button')[1]?.focus();
  const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
  scope.handleKeydown(tab);
  expect(tab.defaultPrevented).toBe(true);
  expect(document.activeElement?.textContent).toBe('First');
  fixture.cleanup();
  expect(scope.active).toBe(false);
  expect(document.activeElement).toBe(trigger);
  trigger.remove();
});
`;
}

function elementUsageSource({ name, slug, tagName }: ComponentTemplateOptions): string {
  if (!tagName) throw new Error('A generated element requires a tag name.');
  return `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${name} usage</title></head>
  <body>
    <${tagName} label="Continue">Account <span slot="help">Required field</span></${tagName}>
    <script type="module">
      import { ${name}Tag } from './${slug}.js';
      const component = document.querySelector(${name}Tag);
      component.metadata = { source: 'standalone-html' };
      component.addEventListener('activate', (event) => console.info(event.detail));
    </script>
  </body>
</html>
`;
}
