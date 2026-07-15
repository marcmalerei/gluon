import {
  GluonElement,
  defineElement,
  html as gluonHtml,
  repeat as gluonRepeat,
} from '@gluonjs/core';
import { LitElement, html as litHtml } from 'lit';
import { repeat as litRepeat } from 'lit/directives/repeat.js';
import {
  defineCustomElement as defineVueCustomElement,
  h as vueH,
  nextTick as vueNextTick,
  ref as vueRef,
} from 'vue';

export const COMPONENT_COUNT = 50;
export const ITEMS_PER_COMPONENT = 20;
export const componentFrameworks = ['gluon', 'lit', 'vue'] as const;
export const componentScenarios = ['lifecycle', 'property', 'state', 'list'] as const;

export type ComponentFramework = typeof componentFrameworks[number];
export type ComponentScenario = typeof componentScenarios[number];

interface ComponentItem {
  readonly id: number;
  readonly label: string;
}

interface BenchmarkElement extends HTMLElement {
  scenario: ComponentScenario;
  label: string;
  items: readonly ComponentItem[];
  readonly updateComplete?: Promise<void>;
}

export interface ComponentHarnessSnapshot {
  readonly componentCount: number;
  readonly rowCount: number;
  readonly firstLabel: string | null;
  readonly firstCount: string | null;
  readonly firstItemId: string | null;
  readonly firstItemLabel: string | null;
  readonly lastLabel: string | null;
  readonly lastCount: string | null;
  readonly lastItemId: string | null;
  readonly lastItemLabel: string | null;
}

export interface ComponentHarness {
  run(): Promise<void>;
  snapshot(): ComponentHarnessSnapshot;
  dispose(): Promise<void>;
}

const forwardItems = createItems('A');
const reversedItems = [...forwardItems].reverse();

class GluonBenchmarkCard extends GluonElement {
  static override readonly properties = {
    scenario: { type: String, default: 'lifecycle' },
    label: { type: String, default: 'Component 0 A' },
    items: {
      attribute: false,
      default: () => forwardItems,
    },
  } as const;

  declare scenario: ComponentScenario;
  declare label: string;
  declare items: readonly ComponentItem[];
  private count = 0;

  protected override render() {
    if (this.scenario === 'property') {
      return gluonHtml`<article><h2 data-role="label">${this.label}</h2></article>`;
    }
    if (this.scenario === 'state') {
      return gluonHtml`<article>${this.renderButton()}</article>`;
    }
    if (this.scenario === 'list') {
      return gluonHtml`<article>${this.renderList()}</article>`;
    }
    return gluonHtml`
      <article>
        <h2 data-role="label">${this.label}</h2>
        ${this.renderButton()}
        ${this.renderList()}
      </article>
    `;
  }

  private renderButton() {
    return gluonHtml`
      <button type="button" data-role="count" @click=${() => {
        this.count += 1;
        void this.requestUpdate();
      }}>Count: ${this.count}</button>
    `;
  }

  private renderList() {
    return gluonHtml`<ul>${gluonRepeat(
      this.items,
      (item) => item.id,
      (item) => gluonHtml`<li data-id=${item.id}>${item.label}</li>`,
    )}</ul>`;
  }
}

defineElement('gluon-benchmark-card', GluonBenchmarkCard);

class GluonPropertyBenchmarkCard extends GluonElement {
  static override readonly properties = {
    label: { type: String, default: 'Component 0 A' },
  } as const;

  declare label: string;

  protected override render() {
    return gluonHtml`<article><h2 data-role="label">${this.label}</h2></article>`;
  }
}

defineElement('gluon-property-benchmark-card', GluonPropertyBenchmarkCard);

class GluonStateBenchmarkCard extends GluonElement {
  static override readonly properties = {
    count: { attribute: false, default: 0 },
  } as const;

  declare count: number;
  private readonly handleClick = () => {
    this.count += 1;
  };

  protected override render() {
    return gluonHtml`<article><button type="button" data-role="count" @click=${this.handleClick}>Count: ${this.count}</button></article>`;
  }
}

defineElement('gluon-state-benchmark-card', GluonStateBenchmarkCard);

class LitBenchmarkCard extends LitElement {
  static override readonly properties = {
    scenario: { type: String },
    label: { type: String },
    items: { attribute: false },
    count: { state: true },
  };

  declare scenario: ComponentScenario;
  declare label: string;
  declare items: readonly ComponentItem[];
  protected declare count: number;

  constructor() {
    super();
    this.scenario = 'lifecycle';
    this.label = 'Component 0 A';
    this.items = forwardItems;
    this.count = 0;
  }

  protected override render() {
    if (this.scenario === 'property') {
      return litHtml`<article><h2 data-role="label">${this.label}</h2></article>`;
    }
    if (this.scenario === 'state') {
      return litHtml`<article>${this.renderButton()}</article>`;
    }
    if (this.scenario === 'list') {
      return litHtml`<article>${this.renderList()}</article>`;
    }
    return litHtml`
      <article>
        <h2 data-role="label">${this.label}</h2>
        ${this.renderButton()}
        ${this.renderList()}
      </article>
    `;
  }

  private renderButton() {
    return litHtml`
      <button type="button" data-role="count" @click=${() => { this.count += 1; }}>
        Count: ${this.count}
      </button>
    `;
  }

  private renderList() {
    return litHtml`<ul>${litRepeat(
      this.items,
      (item) => item.id,
      (item) => litHtml`<li data-id=${item.id}>${item.label}</li>`,
    )}</ul>`;
  }
}

customElements.define('lit-benchmark-card', LitBenchmarkCard);

class LitPropertyBenchmarkCard extends LitElement {
  static override readonly properties = {
    label: { type: String },
  };

  declare label: string;

  constructor() {
    super();
    this.label = 'Component 0 A';
  }

  protected override render() {
    return litHtml`<article><h2 data-role="label">${this.label}</h2></article>`;
  }
}

customElements.define('lit-property-benchmark-card', LitPropertyBenchmarkCard);

class LitStateBenchmarkCard extends LitElement {
  static override readonly properties = {
    count: { state: true },
  };

  protected declare count: number;

  constructor() {
    super();
    this.count = 0;
  }

  protected override render() {
    return litHtml`<article><button type="button" data-role="count" @click=${() => { this.count += 1; }}>Count: ${this.count}</button></article>`;
  }
}

customElements.define('lit-state-benchmark-card', LitStateBenchmarkCard);

const VueBenchmarkCard = defineVueCustomElement({
  props: {
    scenario: { type: String, default: 'lifecycle' },
    label: { type: String, default: 'Component 0 A' },
    items: { type: Array, default: () => forwardItems },
  },
  setup(props) {
    const count = vueRef(0);
    const button = () => vueH('button', {
      type: 'button',
      'data-role': 'count',
      onClick: () => { count.value += 1; },
    }, `Count: ${count.value}`);
    const list = () => vueH('ul', null, (props.items as ComponentItem[]).map((item) => vueH(
      'li',
      { key: item.id, 'data-id': String(item.id) },
      item.label,
    )));
    return () => {
      if (props.scenario === 'property') {
        return vueH('article', null, [vueH('h2', { 'data-role': 'label' }, props.label)]);
      }
      if (props.scenario === 'state') return vueH('article', null, [button()]);
      if (props.scenario === 'list') return vueH('article', null, [list()]);
      return vueH('article', null, [
        vueH('h2', { 'data-role': 'label' }, props.label),
        button(),
        list(),
      ]);
    };
  },
});

customElements.define('vue-benchmark-card', VueBenchmarkCard);

const VuePropertyBenchmarkCard = defineVueCustomElement({
  props: {
    label: { type: String, default: 'Component 0 A' },
  },
  setup(props) {
    return () => vueH('article', null, [
      vueH('h2', { 'data-role': 'label' }, props.label),
    ]);
  },
});

customElements.define('vue-property-benchmark-card', VuePropertyBenchmarkCard);

const VueStateBenchmarkCard = defineVueCustomElement({
  setup() {
    const count = vueRef(0);
    return () => vueH('article', null, [
      vueH('button', {
        type: 'button',
        'data-role': 'count',
        onClick: () => { count.value += 1; },
      }, `Count: ${count.value}`),
    ]);
  },
});

customElements.define('vue-state-benchmark-card', VueStateBenchmarkCard);

export async function createComponentHarness(
  framework: ComponentFramework,
  scenario: ComponentScenario,
): Promise<ComponentHarness> {
  if (scenario === 'lifecycle') return createLifecycleHarness(framework);

  const mounted = await mountComponents(framework, scenario);
  let alternate = false;
  return {
    async run() {
      alternate = !alternate;
      if (scenario === 'property') {
        for (let index = 0; index < mounted.elements.length; index += 1) {
          mounted.elements[index]!.label = `Component ${index} ${alternate ? 'B' : 'A'}`;
        }
      } else if (scenario === 'state') {
        for (const element of mounted.elements) {
          element.shadowRoot?.querySelector<HTMLButtonElement>('[data-role="count"]')?.click();
        }
      } else {
        const items = alternate ? reversedItems : forwardItems;
        for (const element of mounted.elements) element.items = items;
      }
      await settleUpdates(framework, mounted.elements);
    },
    snapshot: () => readSnapshot(mounted.elements),
    async dispose() {
      mounted.root.remove();
      await settleDisconnect();
    },
  };
}

async function createLifecycleHarness(framework: ComponentFramework): Promise<ComponentHarness> {
  const baseline = await mountComponents(framework, 'lifecycle');
  const snapshot = readSnapshot(baseline.elements);
  baseline.root.remove();
  await settleDisconnect();

  return {
    async run() {
      const mounted = await mountComponents(framework, 'lifecycle');
      mounted.root.remove();
      await settleDisconnect();
    },
    snapshot: () => snapshot,
    dispose: async () => undefined,
  };
}

async function mountComponents(
  framework: ComponentFramework,
  scenario: ComponentScenario,
): Promise<{
  readonly root: HTMLDivElement;
  readonly elements: readonly BenchmarkElement[];
}> {
  const root = document.createElement('div');
  root.className = 'component-benchmark-sandbox';
  root.setAttribute('aria-hidden', 'true');
  const fragment = document.createDocumentFragment();
  const elements: BenchmarkElement[] = [];
  for (let index = 0; index < COMPONENT_COUNT; index += 1) {
    const tagName = scenario === 'property' || scenario === 'state'
      ? `${framework}-${scenario}-benchmark-card`
      : `${framework}-benchmark-card`;
    const element = document.createElement(tagName) as BenchmarkElement;
    element.scenario = scenario;
    element.label = `Component ${index} A`;
    element.items = forwardItems;
    elements.push(element);
    fragment.append(element);
  }
  root.append(fragment);
  document.body.append(root);
  await settleUpdates(framework, elements);
  return { root, elements };
}

async function settleUpdates(
  framework: ComponentFramework,
  elements: readonly BenchmarkElement[],
): Promise<void> {
  if (framework === 'vue') {
    await vueNextTick();
    return;
  }
  await Promise.all(elements.map((element) => element.updateComplete));
  // Gluon's per-element completion resolves inside the shared scheduler flush.
  // Let that flush close before a measured operation can enqueue the same jobs again.
  await Promise.resolve();
}

async function settleDisconnect(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function readSnapshot(elements: readonly BenchmarkElement[]): ComponentHarnessSnapshot {
  const first = readElement(elements[0]);
  const last = readElement(elements[elements.length - 1]);
  return {
    componentCount: elements.length,
    rowCount: elements.reduce(
      (total, element) => total + (element.shadowRoot?.querySelectorAll('li').length ?? 0),
      0,
    ),
    firstLabel: first.label,
    firstCount: first.count,
    firstItemId: first.itemId,
    firstItemLabel: first.itemLabel,
    lastLabel: last.label,
    lastCount: last.count,
    lastItemId: last.itemId,
    lastItemLabel: last.itemLabel,
  };
}

function readElement(element: BenchmarkElement | undefined): {
  readonly label: string | null;
  readonly count: string | null;
  readonly itemId: string | null;
  readonly itemLabel: string | null;
} {
  const shadowRoot = element?.shadowRoot;
  const item = shadowRoot?.querySelector<HTMLElement>('li');
  return {
    label: shadowRoot?.querySelector('[data-role="label"]')?.textContent?.trim() ?? null,
    count: shadowRoot?.querySelector('[data-role="count"]')?.textContent?.trim() ?? null,
    itemId: item?.dataset.id ?? null,
    itemLabel: item?.textContent?.trim() ?? null,
  };
}

function createItems(suffix: string): ComponentItem[] {
  return Array.from({ length: ITEMS_PER_COMPONENT }, (_, id) => ({
    id,
    label: `Item ${id} ${suffix}`,
  }));
}
