import { beforeEach, describe, expect, it } from 'vitest';
import {
  createApp,
  html,
  hydrate,
  render,
  trustedHTML,
  unsafeHTML,
  type TrustedTypePolicy,
  type TrustedTypesConfig,
} from '../src/index.js';

describe('Trusted Types runtime contract', () => {
  beforeEach(() => document.body.replaceChildren());

  it('requires explicit application ownership for trustedHTML even without CSP enforcement', () => {
    const root = document.createElement('div');
    const view = (value: ReturnType<typeof trustedHTML> | string) => html`<section>${value}</section>`;
    render(view('compile the template'), root);
    expect(() => render(view(trustedHTML('<b>blocked</b>')), root))
      .toThrow('GLUON_TRUSTED_TYPES_POLICY_REQUIRED');
  });

  it('supports app.run ownership for direct rendering and both raw-markup boundaries', () => {
    const policyName = 'gluon-vitest-direct-render';
    const trustedTypes = createNativeConfig(policyName);
    const app = createApp(html`<p>owner</p>`);
    app.config.trustedTypes = trustedTypes;
    const root = document.createElement('div');
    app.run(() => render(html`
      <section>${trustedHTML('<b>trusted</b>')}${unsafeHTML('<i>unsafe compatible</i>')}</section>
    `, root));
    expect(root.querySelector('b')?.textContent).toBe('trusted');
    expect(root.querySelector('i')?.textContent).toBe('unsafe compatible');
  });

  it('rejects every malformed configuration shape before claiming the application root', () => {
    const invalidNames: unknown[] = [undefined, '', 'a'.repeat(129), 'bad name'];
    for (const policyName of invalidNames) {
      const app = createApp(html`<p>invalid</p>`);
      app.config.trustedTypes = { policyName, policy: { createHTML: (value: string) => value } } as never;
      expect(() => app.mount(document.createElement('div'))).toThrow('GLUON_TRUSTED_TYPES_POLICY_NAME_INVALID');
    }

    for (const policy of [undefined, {}, { createHTML: 1 }]) {
      const app = createApp(html`<p>missing</p>`);
      app.config.trustedTypes = { policyName: 'missing', policy } as never;
      expect(() => app.mount(document.createElement('div'))).toThrow('GLUON_TRUSTED_TYPES_POLICY_MISSING');
    }

    const mismatch = createApp(html`<p>mismatch</p>`);
    mismatch.config.trustedTypes = {
      policyName: 'expected', policy: { name: 'actual', createHTML: (value) => value },
    };
    expect(() => mismatch.mount(document.createElement('div'))).toThrow('GLUON_TRUSTED_TYPES_POLICY_NAME_MISMATCH');
  });

  it('rejects throwing and non-TrustedHTML policies with actionable diagnostics', () => {
    const root = document.createElement('div');
    root.append(document.createElement('p'));
    expect(() => hydrate(html`<p>value</p>`, root, {
      expectedMarkup: '<p></p>',
      trustedTypes: { policyName: 'throws', policy: { createHTML: () => { throw new Error('no'); } } },
    })).toThrow('GLUON_TRUSTED_TYPES_POLICY_FAILED');
    expect(() => hydrate(html`<p>value</p>`, root, {
      expectedMarkup: '<p></p>',
      trustedTypes: { policyName: 'invalid-result', policy: { createHTML: () => ({}) } },
    })).toThrow('GLUON_TRUSTED_TYPES_POLICY_INCOMPATIBLE');
  });

  it('hydrates static markup with an explicit native policy', () => {
    const root = document.createElement('div');
    root.append(document.createElement('p'));
    const result = hydrate(html`<p></p>`, root, {
      expectedMarkup: '<p></p>',
      trustedTypes: createNativeConfig('gluon-vitest-hydration'),
    });
    expect(result).toMatchObject({ retained: true, recovered: false });
  });

  it('wraps browser parser rejections with policy-required and policy-incompatible diagnostics', () => {
    const templateDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    if (!templateDescriptor?.get) throw new Error('Browser does not expose the innerHTML descriptor used by this test.');
    Object.defineProperty(HTMLTemplateElement.prototype, 'innerHTML', {
      configurable: true,
      get: templateDescriptor.get,
      set: () => { throw new TypeError('enforced'); },
    });
    try {
      expect(() => render(html`<article>unowned sink</article>`, document.createElement('div')))
        .toThrow('GLUON_TRUSTED_TYPES_POLICY_REQUIRED');
      const configured = createApp(html`<p>configured</p>`);
      configured.config.trustedTypes = createNativeConfig('gluon-vitest-template-rejection');
      const errors: unknown[] = [];
      configured.config.errorHandler = ({ error }) => { errors.push(error); };
      configured.run(() => render(html`<article>configured sink</article>`, document.createElement('div')));
      expect(String(errors[0])).toContain('GLUON_TRUSTED_TYPES_POLICY_INCOMPATIBLE');
    } finally {
      delete (HTMLTemplateElement.prototype as unknown as Record<string, unknown>).innerHTML;
    }

    const firstView = (value: ReturnType<typeof unsafeHTML> | string) => html`<div data-first>${value}</div>`;
    render(firstView('compiled'), document.createElement('div'));
    const originalFragment = Range.prototype.createContextualFragment;
    Range.prototype.createContextualFragment = () => { throw new TypeError('enforced'); };
    try {
      expect(() => render(firstView(unsafeHTML('<b>blocked</b>')), document.createElement('div')))
        .toThrow('GLUON_TRUSTED_TYPES_POLICY_REQUIRED');

      const configured = createApp(html`<p>configured</p>`);
      configured.config.trustedTypes = createNativeConfig('gluon-vitest-fragment-rejection');
      const errors: unknown[] = [];
      configured.config.errorHandler = ({ error }) => { errors.push(error); };
      const configuredRoot = document.createElement('div');
      const configuredView = (value: ReturnType<typeof unsafeHTML> | string) => html`<div data-second>${value}</div>`;
      configured.run(() => render(configuredView('compiled'), configuredRoot));
      configured.run(() => render(configuredView(unsafeHTML('<b>blocked</b>')), configuredRoot));
      expect(String(errors[0])).toContain('GLUON_TRUSTED_TYPES_POLICY_INCOMPATIBLE');
    } finally {
      Range.prototype.createContextualFragment = originalFragment;
    }
  });

  it('wraps rejected srcdoc property and attribute sinks', () => {
    const configured = createApp(html`<p>configured</p>`);
    configured.config.trustedTypes = createNativeConfig('gluon-vitest-srcdoc-rejection');
    const errors: unknown[] = [];
    configured.config.errorHandler = ({ error }) => { errors.push(error); };
    const descriptor = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'srcdoc');
    if (!descriptor?.get) throw new Error('Browser does not expose the srcdoc descriptor used by this test.');
    Object.defineProperty(HTMLIFrameElement.prototype, 'srcdoc', {
      configurable: true,
      get: descriptor.get,
      set: () => { throw new TypeError('enforced'); },
    });
    try {
      configured.run(() => render(
        html`<iframe .srcdoc=${trustedHTML('<p>blocked</p>')}></iframe>`, document.createElement('div'),
      ));
      expect(String(errors.shift())).toContain('GLUON_TRUSTED_TYPES_POLICY_INCOMPATIBLE');
    } finally {
      Object.defineProperty(HTMLIFrameElement.prototype, 'srcdoc', descriptor);
    }

    const originalSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name, value) {
      if (name.toLowerCase() === 'srcdoc') throw new TypeError('enforced');
      return originalSetAttribute.call(this, name, value);
    };
    try {
      configured.run(() => render(
        html`<iframe srcdoc=${trustedHTML('<p>blocked</p>')}></iframe>`, document.createElement('div'),
      ));
      expect(String(errors.shift())).toContain('GLUON_TRUSTED_TYPES_POLICY_INCOMPATIBLE');
    } finally {
      Element.prototype.setAttribute = originalSetAttribute;
    }
  });
});

function createNativeConfig(policyName: string): TrustedTypesConfig {
  const factory = (globalThis as typeof globalThis & {
    readonly trustedTypes?: { createPolicy(name: string, rules: { createHTML(value: string): string }): TrustedTypePolicy };
  }).trustedTypes;
  return {
    policyName,
    policy: factory?.createPolicy(policyName, { createHTML: (value) => value })
      ?? { name: policyName, createHTML: (value) => value },
  };
}
