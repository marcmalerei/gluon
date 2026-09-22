<!-- gluon-package-header:start -->
<p align="center">
  <img src="https://raw.githubusercontent.com/marcmalerei/gluon/main/docs/assets/package-headers/graph.png" alt="@gluonjs/graph — Gluon package header" width="100%">
</p>
<!-- gluon-package-header:end -->

# @gluonjs/graph

`@gluonjs/graph` is an optional, canvas-backed network graph for Gluon. It has
no layout dependency: node positions are deterministic from `seed`, node input,
and links. The element owns pan, zoom, drawing, and selection; the host owns
domain labels, filtering controls, and persistence.

<!-- gluon-package-overview:start -->
## @gluonjs/graph at a glance

**Runtime:** browser · **Release:** 1.12.1

[Documentation guide](https://marcmalerei.github.io/gluon/latest/packages/graph/) · [npm](https://www.npmjs.com/package/@gluonjs/graph) · [Source](https://github.com/marcmalerei/gluon/blob/main/packages/graph/README.md)

**Public API:** [`@gluonjs/graph`](https://marcmalerei.github.io/gluon/1.12.1/api/generated/packages/graph/src/)

### Install

```sh
npm install @gluonjs/graph
```

### Quick start

```ts
import '@gluonjs/graph';

const graph = document.querySelector('gluon-graph');
```

### Choose this package when

- Canvas-backed graph visualization with deterministic layouts.
- Pan, zoom, selection, and link rendering owned by the element.
- Optional knowledge-map and dependency-map views.

**Choose another boundary when:**

- Does not own graph data modeling or filtering controls.
- Consumers must provide their own labels and persistence.

### Related documentation

- [Components](https://marcmalerei.github.io/gluon/latest/guides/components/)
- [Application](https://marcmalerei.github.io/gluon/latest/guides/application/)

<!-- gluon-package-overview:end -->

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
canvas, arrow keys pan it, and `+`/`-` zoom it. The canvas is a visualisation
surface; the open **Keyboard node list** is the accessible DOM representation.
Its native buttons follow the same active-group and search filters, expose
`aria-pressed`, and emit the same `graph-node-select` event as pointer selection.

## License

MIT License, Copyright © 2026 Marc Malerei.
