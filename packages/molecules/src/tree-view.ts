import { defineMolecule, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { treeViewStyleDependency } from './tree-view-styles.js';

export type TreeViewAttributes = Omit<QuarkProps<HTMLUListElement>, 'children' | 'id' | 'role' | 'aria'> & {
  readonly aria?: Omit<NonNullable<QuarkProps<HTMLUListElement>['aria']>, 'label' | 'multiselectable'>;
};

export interface TreeViewNode {
  readonly id: string;
  readonly label: TemplateValue;
  readonly children?: readonly TreeViewNode[];
  readonly disabled?: boolean;
}

export interface TreeViewProps {
  readonly id: string;
  readonly label: string;
  readonly nodes: readonly TreeViewNode[];
  readonly expanded?: readonly string[];
  readonly selected?: string;
  readonly onExpandedChange?: (id: string, expanded: boolean, event: KeyboardEvent | MouseEvent) => void;
  readonly onSelect?: (id: string, event: KeyboardEvent | MouseEvent) => void;
  readonly attributes?: TreeViewAttributes;
}

function renderTreeView({
  id,
  label,
  nodes,
  expanded = [],
  selected,
  onExpandedChange,
  onSelect,
  attributes = {},
}: TreeViewProps): TemplateResult {
  assertDomId('TreeView.id', id);
  assertNonEmpty('TreeView.label', label);
  const expandedSet = new Set(expanded);
  const nodeIds = new Set<string>();
  validateNodes(nodes, nodeIds);
  const firstEnabledPath = findFirstEnabledPath(nodes);
  const renderNodes = (items: readonly TreeViewNode[], parentPath?: string): TemplateValue[] => items.map((node, index) => {
    const path = parentPath === undefined ? String(index) : `${parentPath}-${index}`;
    const hasChildren = (node.children?.length ?? 0) > 0;
    const nodeDomId = `${id}-node-${path}`;
    const isExpanded = hasChildren && expandedSet.has(node.id);
    const isTabStop = node.id === selected || (selected === undefined && path === firstEnabledPath);
    return q.li({
      role: 'treeitem',
      id: nodeDomId,
      tabIndex: node.disabled ? -1 : isTabStop ? 0 : -1,
      aria: { expanded: hasChildren ? isExpanded : undefined, selected: node.id === selected || undefined, disabled: node.disabled || undefined },
      data: { treePath: path, treeNode: node.id, treeParent: parentPath },
      class: [{ 'gluon-tree-view-node': true, 'is-disabled': node.disabled, 'is-selected': node.id === selected }],
      onClick: (event: MouseEvent) => {
        if ((event.target as Element).closest('.gluon-tree-view-toggle')) return;
        if (node.disabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onSelect?.(node.id, event);
      },
      onKeydown: (event: KeyboardEvent) => handleKeydown(event, node, path),
      children: [
        q.button({
          type: 'button',
          tabIndex: -1,
          class: 'gluon-tree-view-toggle',
          aria: { label: isExpanded ? `Collapse ${node.id}` : `Expand ${node.id}`, expanded: hasChildren ? isExpanded : undefined },
          disabled: !hasChildren || node.disabled,
          onClick: (event: MouseEvent) => {
            event.stopPropagation();
            if (hasChildren && !node.disabled) onExpandedChange?.(node.id, !isExpanded, event);
          },
          children: hasChildren ? (isExpanded ? '▾' : '▸') : '·',
        }),
        q.span({ class: 'gluon-tree-view-label', children: node.label }),
        hasChildren && isExpanded ? q.ul({ role: 'group', children: renderNodes(node.children ?? [], path) }) : undefined,
      ],
    });
  });
  function handleKeydown(event: KeyboardEvent, node: TreeViewNode, path: string): void {
    if (node.disabled) return;
    const current = event.currentTarget as HTMLElement;
    const tree = current.closest<HTMLElement>('[data-tree-view]');
    if (!tree) return;
    const enabled = [...tree.querySelectorAll<HTMLElement>('[role="treeitem"]')].filter((item) => item.getAttribute('aria-disabled') !== 'true');
    const index = enabled.indexOf(current);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
      const targetIndex = event.key === 'ArrowDown' ? index + 1 : event.key === 'ArrowUp' ? index - 1 : event.key === 'Home' ? 0 : enabled.length - 1;
      const target = enabled[targetIndex];
      if (target) {
        event.preventDefault();
        target.focus();
      }
      return;
    }
    const hasChildren = (node.children?.length ?? 0) > 0;
    const isExpanded = expandedSet.has(node.id);
    if (event.key === 'ArrowRight' && hasChildren) {
      event.preventDefault();
      if (!isExpanded) onExpandedChange?.(node.id, true, event);
      else tree.querySelector<HTMLElement>(`[data-tree-path="${path}-0"]`)?.focus();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (hasChildren && isExpanded) onExpandedChange?.(node.id, false, event);
      else if (path.includes('-')) tree.querySelector<HTMLElement>(`[data-tree-path="${path.slice(0, path.lastIndexOf('-'))}"]`)?.focus();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect?.(node.id, event);
    }
  }
  const { aria, ...nativeAttributes } = attributes;
  return q.ul({
    ...nativeAttributes,
    id,
    role: 'tree',
    data: { ...attributes.data, treeView: true },
    aria: { ...aria, label },
    class: [{ gluon: true, molecule: true, 'gluon-tree-view': true }, attributes.class],
    children: renderNodes(nodes),
  });
}

function validateNodes(nodes: readonly TreeViewNode[], ids: Set<string>): void {
  for (const node of nodes) {
    assertNonEmpty('TreeViewNode.id', node.id);
    if (/\s/u.test(node.id)) throw new TypeError('TreeViewNode.id must not contain whitespace.');
    if (ids.has(node.id)) throw new TypeError(`TreeViewNode.id must be unique: ${node.id}.`);
    ids.add(node.id);
    validateNodes(node.children ?? [], ids);
  }
}

function findFirstEnabledPath(nodes: readonly TreeViewNode[], parentPath?: string): string | undefined {
  for (const [index, node] of nodes.entries()) {
    const path = parentPath === undefined ? String(index) : `${parentPath}-${index}`;
    if (!node.disabled) return path;
    const descendant = findFirstEnabledPath(node.children ?? [], path);
    if (descendant) return descendant;
  }
  return undefined;
}

function assertNonEmpty(name: string, value: string): void {
  if (!value.trim()) throw new TypeError(`${name} must be a non-empty string.`);
}

function assertDomId(name: string, value: string): void {
  assertNonEmpty(name, value);
  if (/\s/u.test(value)) throw new TypeError(`${name} must not contain whitespace.`);
}

export const TreeView = defineMolecule(renderTreeView, 'TreeView', [treeViewStyleDependency]);
