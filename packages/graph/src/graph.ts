import {
  GluonElement,
  defineElement,
  html,
  type EventDeclarations,
  type PropertyDeclarations,
} from '@gluonjs/core';

/** Public tag name registered by the graph package. */
export const graphTagName = 'gluon-graph';

/** A graph node rendered by {@link GluonGraphElement}. */
export interface GraphNode {
  readonly id: string;
  readonly label: string;
  readonly group?: string;
  readonly weight?: number;
}

/** A link between two {@link GraphNode} identifiers. */
export interface GraphLink {
  readonly source: string;
  readonly target: string;
  readonly weight?: number;
}

/** A color-coded node community. */
export interface GraphGroup {
  readonly id: string;
  readonly label: string;
  readonly color: string;
}

/** The current camera position in graph-world pixels. */
export interface GraphViewport {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

/** Details emitted when a node is focused with pointer or keyboard interaction. */
export interface GraphNodeSelection {
  readonly node: GraphNode;
  readonly selected: boolean;
}

/** Typed DOM events emitted by {@link GluonGraphElement}. */
export interface GluonGraphEvents {
  readonly 'graph-node-select': GraphNodeSelection;
  readonly 'graph-viewport-change': GraphViewport;
}

interface PositionedNode extends GraphNode {
  readonly x: number;
  readonly y: number;
}

interface PointerState {
  readonly x: number;
  readonly y: number;
  readonly viewport: GraphViewport;
  readonly pointerId: number;
}

const graphStyles = new CSSStyleSheet();
graphStyles.replaceSync(`
  :host { display: block; min-inline-size: 0; min-block-size: 0; color: #dce8f7; }
  .surface { position: relative; inline-size: 100%; block-size: 100%; min-block-size: 320px; overflow: hidden; background: #090d12; }
  canvas { display: block; inline-size: 100%; block-size: 100%; min-block-size: 320px; touch-action: none; outline: none; cursor: grab; }
  canvas:active { cursor: grabbing; }
  canvas:focus-visible { outline: 2px solid #b9e635; outline-offset: -4px; }
  .node-list { position: absolute; inset-block-end: 12px; inset-inline-start: 12px; max-inline-size: min(28rem, calc(100% - 24px)); color: #dce8f7; background: rgb(9 13 18 / 92%); border: 1px solid #3d5068; border-radius: 8px; }
  .node-list summary { min-block-size: 44px; padding: 11px 14px; cursor: pointer; font-weight: 600; }
  .node-list summary:focus-visible, .node-list button:focus-visible { outline: 2px solid #b9e635; outline-offset: 2px; }
  .node-list ul { display: grid; gap: 4px; max-block-size: 14rem; overflow: auto; margin: 0; padding: 0 8px 8px; list-style: none; }
  .node-list button { display: grid; gap: 2px; inline-size: 100%; min-block-size: 44px; padding: 8px 10px; color: inherit; text-align: start; background: transparent; border: 0; border-radius: 4px; cursor: pointer; }
  .node-list button:hover, .node-list button[aria-pressed="true"] { background: #263547; }
  .node-list .node-group { color: #a9b8cb; font-size: 0.8rem; }
  .summary { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
  @media (prefers-reduced-motion: reduce) { canvas { cursor: default; } }
`);

/**
 * A dependency-free, canvas-backed network graph Custom Element. The element owns
 * camera interaction, deterministic layout, selection, and drawing; a host can own
 * product-specific filters and controls through the public properties.
 */
export class GluonGraphElement extends GluonElement<GluonGraphEvents> {
  static override readonly properties = {
    nodes: { attribute: false, default: () => [] },
    links: { attribute: false, default: () => [] },
    groups: { attribute: false, default: () => [] },
    activeGroups: { attribute: false, default: () => [] },
    searchQuery: { type: String, attribute: 'search-query', default: '' },
    nodeScale: { type: Number, attribute: 'node-scale', default: 1 },
    linkDensity: { type: Number, attribute: 'link-density', default: 1 },
    showLabels: { type: Boolean, attribute: 'show-labels', default: false },
    seed: { type: String, default: 'gluon-graph' },
  } satisfies PropertyDeclarations<Pick<
    GluonGraphElement,
    'nodes' | 'links' | 'groups' | 'activeGroups' | 'searchQuery' | 'nodeScale' | 'linkDensity' | 'showLabels' | 'seed'
  >>;

  static override readonly events = {
    'graph-node-select': {},
    'graph-viewport-change': {},
  } satisfies EventDeclarations<GluonGraphEvents>;

  static override readonly styles = graphStyles;

  declare nodes: readonly GraphNode[];
  declare links: readonly GraphLink[];
  declare groups: readonly GraphGroup[];
  declare activeGroups: readonly string[];
  declare searchQuery: string;
  declare nodeScale: number;
  declare linkDensity: number;
  declare showLabels: boolean;
  declare seed: string;

  private canvas?: HTMLCanvasElement;
  private context?: CanvasRenderingContext2D;
  private resizeObserver?: ResizeObserver;
  private positioned = new Map<string, PositionedNode>();
  private layoutSignature = '';
  private pointer?: PointerState;
  private selectedNodeId?: string;
  private status = 'Graph ready.';
  private viewport: GraphViewport = { x: 0, y: 0, scale: 1 };

  constructor() {
    super();
    this.onConnected(() => {
      this.resizeObserver = new ResizeObserver(() => this.scheduleDraw());
      this.resizeObserver.observe(this);
      this.scheduleDraw();
    });
    this.onDisconnected(() => {
      this.resizeObserver?.disconnect();
      this.resizeObserver = undefined;
      this.pointer = undefined;
    });
  }

  /** Restores the deterministic centered camera and clears the selection. */
  recenter(): void {
    this.viewport = { x: 0, y: 0, scale: 1 };
    this.selectedNodeId = undefined;
    this.status = 'Graph recentered.';
    this.publishViewport();
    void this.requestUpdate();
  }

  /** Recreates positions from a new deterministic seed and redraws the graph. */
  restartSimulation(): void {
    this.seed = `${this.seed}:restart`;
    this.layoutSignature = '';
    this.status = 'Graph layout rebalanced.';
    void this.requestUpdate();
  }

  /** Increases the camera scale around the graph centre. */
  zoomIn(): void { this.setScale(this.viewport.scale * 1.18); }

  /** Decreases the camera scale around the graph centre. */
  zoomOut(): void { this.setScale(this.viewport.scale / 1.18); }

  /** Returns an immutable snapshot of the current camera position. */
  getViewport(): GraphViewport { return { ...this.viewport }; }

  protected override update(): void {
    super.update();
    this.canvas = this.renderRoot.querySelector('canvas') ?? undefined;
    this.context = this.canvas?.getContext('2d') ?? undefined;
    this.ensureLayout();
    this.scheduleDraw();
  }

  protected override render() {
    this.ensureLayout();
    const visible = this.visibleNodes().length;
    return html`
      <section class="surface" aria-label="Interactive graph">
        <canvas
          aria-label=${`${visible} visible nodes. Use arrow keys to pan, plus or minus to zoom, and Escape to recenter.`}
          tabindex="0"
          @pointerdown=${this.onPointerDown}
          @pointermove=${this.onPointerMove}
          @pointerup=${this.onPointerUp}
          @pointercancel=${this.onPointerUp}
          @wheel=${this.onWheel}
          @keydown=${this.onKeyDown}
        ></canvas>
        <details class="node-list">
          <summary>Keyboard node list (${visible})</summary>
          <ul aria-label="Visible graph nodes">
            ${this.visibleNodes().length > 0
              ? this.visibleNodes().map((node) => html`
                <li>
                  <button
                    type="button"
                    aria-pressed=${this.selectedNodeId === node.id}
                    aria-label=${`${node.label}${node.group ? `, ${this.groupLabel(node.group)}` : ''}`}
                    @click=${() => this.selectNode(node.id)}
                  >
                    <span>${node.label}</span>
                    ${node.group ? html`<span class="node-group">${this.groupLabel(node.group)}</span>` : ''}
                  </button>
                </li>
              `)
              : html`<li>No visible nodes.</li>`}
          </ul>
        </details>
        <p class="summary" aria-live="polite">${this.status}</p>
      </section>
    `;
  }

  private readonly onPointerDown = (event: Event): void => {
    if (!(event instanceof PointerEvent)) return;
    const point = this.pointerPoint(event);
    if (!point || !this.canvas) return;
    this.canvas.setPointerCapture(event.pointerId);
    this.pointer = { ...point, viewport: this.viewport, pointerId: event.pointerId };
  };

  private readonly onPointerMove = (event: Event): void => {
    if (!(event instanceof PointerEvent)) return;
    if (!this.pointer || event.pointerId !== this.pointer.pointerId) return;
    const point = this.pointerPoint(event);
    if (!point) return;
    this.viewport = {
      ...this.viewport,
      x: this.pointer.viewport.x + (point.x - this.pointer.x) / this.viewport.scale,
      y: this.pointer.viewport.y + (point.y - this.pointer.y) / this.viewport.scale,
    };
    this.scheduleDraw();
  };

  private readonly onPointerUp = (event: Event): void => {
    if (!(event instanceof PointerEvent)) return;
    const pointer = this.pointer;
    if (!pointer || event.pointerId !== pointer.pointerId) return;
    const point = this.pointerPoint(event);
    this.pointer = undefined;
    this.canvas?.releasePointerCapture(event.pointerId);
    if (!point) return;
    const travelled = Math.hypot(point.x - pointer.x, point.y - pointer.y);
    if (travelled < 5) this.selectAt(point.x, point.y);
    this.publishViewport();
  };

  private readonly onWheel = (event: Event): void => {
    if (!(event instanceof WheelEvent)) return;
    event.preventDefault();
    this.setScale(this.viewport.scale * (event.deltaY > 0 ? 0.9 : 1.1));
  };

  private readonly onKeyDown = (event: Event): void => {
    if (!(event instanceof KeyboardEvent)) return;
    const step = 36 / this.viewport.scale;
    if (event.key === 'Escape') { event.preventDefault(); this.recenter(); return; }
    if (event.key === '+' || event.key === '=') { event.preventDefault(); this.zoomIn(); return; }
    if (event.key === '-') { event.preventDefault(); this.zoomOut(); return; }
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const x = event.key === 'ArrowLeft' ? this.viewport.x + step : event.key === 'ArrowRight' ? this.viewport.x - step : this.viewport.x;
    const y = event.key === 'ArrowUp' ? this.viewport.y + step : event.key === 'ArrowDown' ? this.viewport.y - step : this.viewport.y;
    this.viewport = { ...this.viewport, x, y };
    this.status = 'Graph panned.';
    this.publishViewport();
    this.scheduleDraw();
  };

  private readonly selectNode = (nodeId: string): void => {
    const node = this.positioned.get(nodeId);
    if (!node || !this.visibleNodes().some((visible) => visible.id === nodeId)) return;
    const selected = this.selectedNodeId !== nodeId;
    this.selectedNodeId = selected ? nodeId : undefined;
    this.status = selected ? `${node.label} selected.` : `${node.label} cleared.`;
    this.emit('graph-node-select', { node, selected });
    void this.requestUpdate();
  };

  private setScale(scale: number): void {
    this.viewport = { ...this.viewport, scale: clamp(scale, 0.55, 2.8) };
    this.status = `Zoom ${Math.round(this.viewport.scale * 100)} percent.`;
    this.publishViewport();
    this.scheduleDraw();
  }

  private publishViewport(): void {
    this.emit('graph-viewport-change', this.viewport);
  }

  private pointerPoint(event: PointerEvent): { readonly x: number; readonly y: number } | undefined {
    const rect = this.canvas?.getBoundingClientRect();
    if (!rect) return undefined;
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private ensureLayout(): void {
    const signature = JSON.stringify({
      seed: this.seed,
      nodes: this.nodes.map((node) => [node.id, node.group, node.weight]),
      links: this.links.map((link) => [link.source, link.target]),
    });
    if (signature === this.layoutSignature) return;
    this.layoutSignature = signature;
    this.positioned = createDeterministicLayout(this.nodes, this.links, this.seed);
    if (this.selectedNodeId && !this.positioned.has(this.selectedNodeId)) this.selectedNodeId = undefined;
  }

  private visibleNodes(): PositionedNode[] {
    const activeGroups = new Set(this.activeGroups);
    const query = this.searchQuery.trim().toLocaleLowerCase();
    return [...this.positioned.values()].filter((node) => {
      const groupMatches = activeGroups.size === 0 || (node.group !== undefined && activeGroups.has(node.group));
      const queryMatches = query.length === 0 || node.label.toLocaleLowerCase().includes(query);
      return groupMatches && queryMatches;
    });
  }

  private scheduleDraw(): void {
    requestAnimationFrame(() => this.draw());
  }

  private draw(): void {
    const canvas = this.canvas;
    const context = this.context;
    if (!canvas || !context) return;
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    const pixelRatio = Math.min(globalThis.devicePixelRatio || 1, 2);
    const nextWidth = Math.round(width * pixelRatio);
    const nextHeight = Math.round(height * pixelRatio);
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    }
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#090d12';
    context.fillRect(0, 0, width, height);

    const nodes = this.visibleNodes();
    const visible = new Map(nodes.map((node) => [node.id, node]));
    const colors = new Map(this.groups.map((group) => [group.id, group.color]));
    const unit = Math.min(width, height);
    const project = (node: PositionedNode) => ({
      x: width / 2 + (node.x * unit + this.viewport.x) * this.viewport.scale,
      y: height / 2 + (node.y * unit + this.viewport.y) * this.viewport.scale,
    });
    const density = clamp(this.linkDensity, 0.08, 1);

    context.lineWidth = 0.65;
    for (const link of this.links) {
      const source = visible.get(link.source);
      const target = visible.get(link.target);
      if (!source || !target || stableFraction(`${link.source}:${link.target}`) > density) continue;
      const from = project(source);
      const to = project(target);
      context.strokeStyle = colorWithAlpha(colors.get(source.group ?? '') ?? '#7182a0', 0.22);
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
    }

    for (const node of nodes) {
      const point = project(node);
      const radius = nodeRadius(node, this.nodeScale);
      const color = colors.get(node.group ?? '') ?? '#8ba9ff';
      context.fillStyle = color;
      context.beginPath();
      context.arc(point.x, point.y, radius, 0, Math.PI * 2);
      context.fill();
      if (node.id === this.selectedNodeId) {
        context.strokeStyle = '#f5f8fb';
        context.lineWidth = 1.5;
        context.beginPath();
        context.arc(point.x, point.y, radius + 4, 0, Math.PI * 2);
        context.stroke();
      }
      if (this.showLabels && (node.weight ?? 1) >= 2) {
        context.fillStyle = '#dce8f7';
        context.font = '500 12px ui-sans-serif, system-ui, sans-serif';
        context.fillText(node.label, point.x + radius + 5, point.y + 4);
      }
    }
  }

  private selectAt(x: number, y: number): void {
    const canvas = this.canvas;
    if (!canvas) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const unit = Math.min(width, height);
    let closest: { readonly node: PositionedNode; readonly distance: number } | undefined;
    for (const node of this.visibleNodes()) {
      const screenX = width / 2 + (node.x * unit + this.viewport.x) * this.viewport.scale;
      const screenY = height / 2 + (node.y * unit + this.viewport.y) * this.viewport.scale;
      const distance = Math.hypot(screenX - x, screenY - y);
      if (distance <= nodeRadius(node, this.nodeScale) + 8 && (!closest || distance < closest.distance)) closest = { node, distance };
    }
    if (!closest) return;
    const selected = this.selectedNodeId !== closest.node.id;
    this.selectedNodeId = selected ? closest.node.id : undefined;
    this.status = selected ? `${closest.node.label} selected.` : `${closest.node.label} cleared.`;
    this.emit('graph-node-select', { node: closest.node, selected });
    void this.requestUpdate();
  }

  private groupLabel(groupId: string): string {
    return this.groups.find((group) => group.id === groupId)?.label ?? groupId;
  }
}

function createDeterministicLayout(
  nodes: readonly GraphNode[],
  links: readonly GraphLink[],
  seed: string,
): Map<string, PositionedNode> {
  const groups = [...new Set(nodes.map((node) => node.group ?? 'ungrouped'))];
  const groupIndex = new Map(groups.map((group, index) => [group, index]));
  const positions = new Map<string, PositionedNode>();
  for (const node of nodes) {
    const random = seededRandom(`${seed}:${node.id}`);
    const index = groupIndex.get(node.group ?? 'ungrouped') ?? 0;
    const angle = (index / Math.max(1, groups.length)) * Math.PI * 2 - Math.PI / 2;
    const clusterRadius = groups.length === 1 ? 0 : 0.27;
    const jitterAngle = random() * Math.PI * 2;
    const jitterRadius = 0.035 + Math.sqrt(random()) * 0.18;
    positions.set(node.id, {
      ...node,
      x: Math.cos(angle) * clusterRadius + Math.cos(jitterAngle) * jitterRadius,
      y: Math.sin(angle) * clusterRadius + Math.sin(jitterAngle) * jitterRadius,
    });
  }
  for (let iteration = 0; iteration < 32; iteration += 1) {
    const amount = 0.008 * (1 - iteration / 36);
    for (const link of links) {
      const source = positions.get(link.source);
      const target = positions.get(link.target);
      if (!source || !target) continue;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.hypot(dx, dy) || 0.001;
      const desired = source.group === target.group ? 0.1 : 0.22;
      const pull = (distance - desired) * amount;
      positions.set(source.id, { ...source, x: source.x + (dx / distance) * pull, y: source.y + (dy / distance) * pull });
      positions.set(target.id, { ...target, x: target.x - (dx / distance) * pull, y: target.y - (dy / distance) * pull });
    }
  }
  return positions;
}

function nodeRadius(node: GraphNode, scale: number): number {
  return clamp((2.2 + Math.sqrt(node.weight ?? 1) * 1.7) * clamp(scale, 0.55, 2.4), 2, 18);
}

function seededRandom(seed: string): () => number {
  let value = hash(seed) || 1;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ result >>> 15, result | 1);
    result ^= result + Math.imul(result ^ result >>> 7, result | 61);
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
}

function stableFraction(value: string): number { return hash(value) / 4294967295; }

function hash(value: string): number {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function colorWithAlpha(color: string, alpha: number): string {
  if (!color.startsWith('#') || color.length !== 7) return color;
  return `${color}${Math.round(clamp(alpha, 0, 1) * 255).toString(16).padStart(2, '0')}`;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, Number.isFinite(value) ? value : minimum));
}

defineElement(graphTagName, GluonGraphElement);
