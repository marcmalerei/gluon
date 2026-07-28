import '@gluonjs/graph';
import type {
  GluonGraphElement,
  GraphGroup,
  GraphLink,
  GraphNode,
} from '@gluonjs/graph';
import './graph.css';

const groups: readonly GraphGroup[] = [
  { id: 'research', label: 'Research', color: '#8ba9ff' },
  { id: 'product', label: 'Product', color: '#b9e635' },
  { id: 'operations', label: 'Operations', color: '#ff6b62' },
  { id: 'synthesis', label: 'Synthesis', color: '#d6a8e8' },
];

const graph = requiredElement<GluonGraphElement>('#knowledge-graph');
const search = requiredElement<HTMLInputElement>('#graph-search');
const groupList = requiredElement<HTMLDivElement>('#group-list');
const nodeScale = requiredElement<HTMLInputElement>('#node-size');
const nodeScaleValue = requiredElement<HTMLOutputElement>('#node-size-value');
const linkDensity = requiredElement<HTMLInputElement>('#link-density');
const linkDensityValue = requiredElement<HTMLOutputElement>('#link-density-value');
const showLabels = requiredElement<HTMLInputElement>('#show-labels');
const selection = requiredElement<HTMLParagraphElement>('#graph-selection');

const { nodes, links } = createKnowledgeMap(groups);
const activeGroups = new Set(groups.map((group) => group.id));
Object.assign(graph, { nodes, links, groups, activeGroups: [...activeGroups], seed: 'gluon-knowledge-map' });

for (const group of groups) {
  const count = nodes.filter((node) => node.group === group.id).length;
  const control = document.createElement('label');
  control.className = 'group-row';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = true;
  input.addEventListener('change', () => {
    if (input.checked) activeGroups.add(group.id);
    else activeGroups.delete(group.id);
    graph.activeGroups = [...activeGroups];
  });
  const dot = document.createElement('span');
  dot.className = 'group-dot';
  dot.style.background = group.color;
  const name = document.createElement('span');
  name.textContent = group.label;
  const total = document.createElement('output');
  total.textContent = String(count);
  control.append(input, dot, name, total);
  groupList.append(control);
}

search.addEventListener('input', () => { graph.searchQuery = search.value; });
nodeScale.addEventListener('input', () => {
  graph.nodeScale = Number(nodeScale.value);
  nodeScaleValue.value = `${Math.round(graph.nodeScale * 100)}%`;
});
linkDensity.addEventListener('input', () => {
  graph.linkDensity = Number(linkDensity.value);
  linkDensityValue.value = `${Math.round(graph.linkDensity * 100)}%`;
});
showLabels.addEventListener('change', () => { graph.showLabels = showLabels.checked; });
requiredElement<HTMLButtonElement>('#recenter').addEventListener('click', () => graph.recenter());
requiredElement<HTMLButtonElement>('#rebalance').addEventListener('click', () => graph.restartSimulation());
graph.addEventListener('graph-node-select', (event) => {
  const selectionEvent = event as CustomEvent<{ readonly node: GraphNode; readonly selected: boolean }>;
  const { node, selected } = selectionEvent.detail;
  selection.textContent = selected
    ? `${node.label} selected · ${node.group ?? 'Unassigned'} · weight ${node.weight ?? 1}`
    : 'Select a node to inspect its connections.';
});

function createKnowledgeMap(knownGroups: readonly GraphGroup[]): { readonly nodes: readonly GraphNode[]; readonly links: readonly GraphLink[] } {
  const topics = {
    research: ['Interview', 'Source note', 'Field study', 'Reading list', 'Hypothesis', 'Signal', 'Customer story', 'Landscape'],
    product: ['Roadmap', 'Prototype', 'Release note', 'Feedback loop', 'Design system', 'Feature brief', 'Decision record', 'Experiment'],
    operations: ['Runbook', 'Handoff', 'Incident review', 'Delivery plan', 'Metrics note', 'Practice', 'Checklist', 'Service map'],
    synthesis: ['Theme', 'Model', 'Connection', 'Question', 'Pattern', 'Principle', 'Glossary', 'Overview'],
  } as const;
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  for (const [groupIndex, group] of knownGroups.entries()) {
    const names = topics[group.id as keyof typeof topics];
    const hubId = `${group.id}-hub`;
    nodes.push({ id: hubId, label: `${group.label} hub`, group: group.id, weight: 6 });
    for (let index = 0; index < 34; index += 1) {
      const topic = names[index % names.length];
      const id = `${group.id}-${index}`;
      nodes.push({ id, label: `${topic} ${String(index + 1).padStart(2, '0')}`, group: group.id, weight: index % 11 === 0 ? 3 : index % 5 === 0 ? 2 : 1 });
      links.push({ source: hubId, target: id });
      if (index > 0) links.push({ source: id, target: `${group.id}-${index - 1}` });
      if (index > 3 && index % 3 === 0) links.push({ source: id, target: `${group.id}-${index - 4}` });
      if (index % 7 === 0) {
        const otherGroup = knownGroups[(groupIndex + 1) % knownGroups.length]!;
        links.push({ source: id, target: `${otherGroup.id}-hub`, weight: 2 });
      }
    }
  }
  links.push(
    { source: 'research-hub', target: 'product-hub', weight: 3 },
    { source: 'product-hub', target: 'operations-hub', weight: 3 },
    { source: 'operations-hub', target: 'synthesis-hub', weight: 3 },
    { source: 'synthesis-hub', target: 'research-hub', weight: 3 },
  );
  return { nodes, links };
}

function requiredElement<ElementType extends Element>(selector: string): ElementType {
  const element = document.querySelector<ElementType>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
}
