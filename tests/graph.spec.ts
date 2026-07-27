import { beforeEach, describe, expect, it } from 'vitest';
import {
  graphTagName,
  type GluonGraphElement,
  type GraphGroup,
  type GraphLink,
  type GraphNode,
} from '@gluonjs/graph';

const groups: readonly GraphGroup[] = [
  { id: 'research', label: 'Research', color: '#8ba9ff' },
  { id: 'product', label: 'Product', color: '#b9e635' },
];
const nodes: readonly GraphNode[] = [
  { id: 'brief', label: 'Research brief', group: 'research', weight: 3 },
  { id: 'roadmap', label: 'Product roadmap', group: 'product', weight: 2 },
  { id: 'signal', label: 'Customer signal', group: 'research' },
];
const links: readonly GraphLink[] = [
  { source: 'brief', target: 'roadmap' },
  { source: 'brief', target: 'signal' },
];

describe('gluon-graph', () => {
  beforeEach(() => document.body.replaceChildren());

  it('renders a typed graph and keeps its accessible visible-node summary in sync with group filters', async () => {
    const graph = mountGraph();
    await graph.updateComplete;
    const canvas = graph.shadowRoot?.querySelector('canvas');
    expect(canvas?.getAttribute('aria-label')).toContain('3 visible nodes');

    graph.activeGroups = ['product'];
    await graph.updateComplete;
    expect(graph.shadowRoot?.querySelector('canvas')?.getAttribute('aria-label')).toContain('1 visible nodes');
  });

  it('emits an immutable camera snapshot for zoom and reset operations', async () => {
    const graph = mountGraph();
    await graph.updateComplete;
    const changes: Array<{ readonly scale: number }> = [];
    graph.addEventListener('graph-viewport-change', (event) => {
      changes.push((event as CustomEvent<{ readonly scale: number }>).detail);
    });

    graph.zoomIn();
    expect(graph.getViewport().scale).toBeGreaterThan(1);
    graph.recenter();
    expect(graph.getViewport()).toEqual({ x: 0, y: 0, scale: 1 });
    expect(changes.map((change) => change.scale)).toEqual([1.18, 1]);
  });

  it('selects the rendered node under the pointer and emits its typed payload', async () => {
    const graph = mountGraph();
    await graph.updateComplete;
    const canvas = graph.shadowRoot?.querySelector('canvas') as HTMLCanvasElement;
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 600 });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: 420 });
    const internals = graph as unknown as {
      readonly positioned: Map<string, { readonly x: number; readonly y: number }>;
      selectAt(x: number, y: number): void;
    };
    const brief = internals.positioned.get('brief')!;
    const selected: string[] = [];
    graph.addEventListener('graph-node-select', (event) => {
      selected.push((event as CustomEvent<{ readonly node: GraphNode }>).detail.node.id);
    });

    internals.selectAt(300 + brief.x * 420, 210 + brief.y * 420);
    await graph.updateComplete;
    expect(selected).toEqual(['brief']);
    expect(graph.shadowRoot?.textContent).toContain('Research brief selected.');
  });

  it('keeps deterministic positions for unchanged graph data and seed', async () => {
    const first = mountGraph();
    const second = mountGraph();
    await Promise.all([first.updateComplete, second.updateComplete]);
    const firstPositions = (first as unknown as { readonly positioned: Map<string, unknown> }).positioned;
    const secondPositions = (second as unknown as { readonly positioned: Map<string, unknown> }).positioned;
    expect([...firstPositions.entries()]).toEqual([...secondPositions.entries()]);
  });

  it('handles pointer, wheel, and keyboard camera interaction without retaining a disconnected graph', async () => {
    const graph = mountGraph();
    await graph.updateComplete;
    const canvas = configureCanvas(graph);
    const internal = graph as unknown as GraphInternals;
    const viewportChanges: number[] = [];
    graph.addEventListener('graph-viewport-change', (event) => {
      viewportChanges.push((event as CustomEvent<{ readonly scale: number }>).detail.scale);
    });

    internal.onPointerDown(new Event('pointerdown'));
    internal.onPointerDown(new PointerEvent('pointerdown', { clientX: 180, clientY: 160, pointerId: 11 }));
    internal.onPointerMove(new PointerEvent('pointermove', { clientX: 215, clientY: 195, pointerId: 12 }));
    internal.onPointerMove(new PointerEvent('pointermove', { clientX: 215, clientY: 195, pointerId: 11 }));
    internal.onPointerUp(new PointerEvent('pointerup', { clientX: 215, clientY: 195, pointerId: 11 }));
    expect(graph.getViewport().x).not.toBe(0);

    internal.onWheel(new Event('wheel'));
    internal.onWheel(new WheelEvent('wheel', { deltaY: -1 }));
    internal.onWheel(new WheelEvent('wheel', { deltaY: 1 }));
    internal.onKeyDown(new Event('keydown'));
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-', 'Escape', 'a']) {
      internal.onKeyDown(new KeyboardEvent('keydown', { key }));
    }
    expect(graph.getViewport()).toEqual({ x: 0, y: 0, scale: 1 });
    expect(viewportChanges.length).toBeGreaterThan(5);

    graph.remove();
    expect(canvas.isConnected).toBe(false);
    document.body.append(graph);
    await graph.updateComplete;
    expect(graph.shadowRoot?.querySelector('canvas')).toBeInstanceOf(HTMLCanvasElement);
  });

  it('draws selected labels, ignores dangling links, and resets a stale selection when data changes', async () => {
    const graph = mountGraph();
    await graph.updateComplete;
    const internal = graph as unknown as GraphInternals;
    configureCanvas(graph);
    graph.showLabels = true;
    graph.nodeScale = 99;
    graph.linkDensity = -2;
    internal.selectedNodeId = 'brief';
    internal.draw();

    graph.links = [...links, { source: 'brief', target: 'missing' }];
    graph.nodes = [{ id: 'solo', label: 'Solo node' }];
    graph.groups = [];
    graph.activeGroups = ['unknown'];
    graph.searchQuery = 'solo';
    await graph.updateComplete;
    internal.draw();
    expect(graph.shadowRoot?.querySelector('canvas')?.getAttribute('aria-label')).toContain('0 visible nodes');

    graph.activeGroups = [];
    graph.searchQuery = '';
    graph.restartSimulation();
    await graph.updateComplete;
    expect(internal.selectedNodeId).toBeUndefined();
    expect(internal.positioned.get('solo')?.group).toBeUndefined();
    graph.zoomOut();
    expect(graph.getViewport().scale).toBeLessThan(1);
  });

  it('leaves the graph safe when its canvas is temporarily unavailable and toggles an existing selection', async () => {
    const graph = mountGraph();
    await graph.updateComplete;
    const internal = graph as unknown as GraphInternals;
    const canvas = configureCanvas(graph);
    const context = internal.context;
    const originalPoint = internal.pointerPoint;
    const brief = internal.positioned.get('brief')!;

    internal.canvas = undefined;
    internal.onPointerDown(new PointerEvent('pointerdown', { clientX: 10, clientY: 10, pointerId: 1 }));
    internal.onPointerMove(new PointerEvent('pointermove', { clientX: 10, clientY: 10, pointerId: 1 }));
    internal.onPointerUp(new PointerEvent('pointerup', { clientX: 10, clientY: 10, pointerId: 1 }));
    internal.draw();

    internal.canvas = canvas;
    internal.context = undefined;
    internal.draw();
    internal.context = context;
    internal.pointerPoint = () => undefined;
    internal.onPointerDown(new PointerEvent('pointerdown', { clientX: 10, clientY: 10, pointerId: 2 }));
    internal.pointer = { x: 10, y: 10, viewport: graph.getViewport(), pointerId: 3 };
    internal.onPointerMove(new PointerEvent('pointermove', { clientX: 10, clientY: 10, pointerId: 3 }));
    internal.onPointerUp(new PointerEvent('pointerup', { clientX: 10, clientY: 10, pointerId: 3 }));
    internal.pointerPoint = originalPoint;

    internal.selectAt(300 + brief.x * 420, 210 + brief.y * 420);
    internal.selectAt(300 + brief.x * 420, 210 + brief.y * 420);
    await graph.updateComplete;
    expect(graph.shadowRoot?.textContent).toContain('Research brief cleared.');
  });
});

function mountGraph(): GluonGraphElement {
  const graph = document.createElement(graphTagName) as GluonGraphElement;
  Object.assign(graph, { groups, nodes, links, seed: 'graph-test' });
  document.body.append(graph);
  return graph;
}

function configureCanvas(graph: GluonGraphElement): HTMLCanvasElement {
  const canvas = graph.shadowRoot?.querySelector('canvas') as HTMLCanvasElement;
  Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 600 });
  Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: 420 });
  Object.defineProperty(canvas, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ left: 0, top: 0, right: 600, bottom: 420, width: 600, height: 420 }),
  });
  Object.defineProperty(canvas, 'setPointerCapture', { configurable: true, value: () => undefined });
  Object.defineProperty(canvas, 'releasePointerCapture', { configurable: true, value: () => undefined });
  return canvas;
}

interface GraphInternals {
  canvas?: HTMLCanvasElement;
  context?: CanvasRenderingContext2D;
  pointer?: { readonly x: number; readonly y: number; readonly viewport: { readonly x: number; readonly y: number; readonly scale: number }; readonly pointerId: number };
  readonly positioned: Map<string, { readonly x: number; readonly y: number; readonly group?: string }>;
  selectedNodeId?: string;
  onPointerDown(event: Event): void;
  onPointerMove(event: Event): void;
  onPointerUp(event: Event): void;
  onWheel(event: Event): void;
  onKeyDown(event: Event): void;
  pointerPoint(event: PointerEvent): { readonly x: number; readonly y: number } | undefined;
  selectAt(x: number, y: number): void;
  draw(): void;
}
