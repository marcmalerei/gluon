<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/package-headers/graph.png" alt="@gluonjs/graph — Gluon package header" width="100%">
</p>
<!-- gluon-package-header:end -->

`@gluonjs/graph` is an optional, canvas-backed network graph for Gluon. It has
no layout dependency: node positions are deterministic from `seed`, node input,
and links. The element owns pan, zoom, drawing, and selection; the host owns
domain labels, filtering controls, and persistence.

## Render a knowledge map

```ts
import '@gluonjs/graph';
import type { GraphGroup, GraphLink, GraphNode } from '@gluonjs/graph';

const graph = document.querySelector('gluon-graph');
if (!graph) throw new Error('Missing graph');

const groups: GraphGroup[] = [
  { id: 'research', label: 'Research', color: '#8ba9ff' },
  { id: 'product', label: 'Product', color: '#b9e635' },
];
const nodes: GraphNode[] = [
  { id: 'brief', label: 'Research brief', group: 'research', weight: 3 },
  { id: 'roadmap', label: 'Product roadmap', group: 'product', weight: 4 },
];
const links: GraphLink[] = [{ source: 'brief', target: 'roadmap' }];

Object.assign(graph, { groups, nodes, links, showLabels: true });
graph.addEventListener('graph-node-select', (event) => console.info(event.detail.node.id));
```

The initial release is suited to a few hundred rendered nodes. It deliberately
does not index files, persist layouts, edit graphs, or emulate another product.
Use the documented `activeGroups`, `searchQuery`, `nodeScale`, `linkDensity`,
and `showLabels` properties to wire native host controls. `Escape` recentres the
canvas, arrow keys pan it, and `+`/`-` zoom it.

## License

MIT License, Copyright © 2026 Marc Malerei.
