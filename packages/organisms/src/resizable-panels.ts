import { defineOrganism, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { resizablePanelsStyleDependency } from './resizable-panels-styles.js';

type ResizablePanelsAria = NonNullable<QuarkProps<HTMLDivElement>['aria']>;
export type ResizablePanelsAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'id' | 'aria'> & { readonly aria?: ResizablePanelsAria };
export type ResizablePanelsRegionAttributes = Omit<QuarkProps<HTMLElement>, 'children' | 'id' | 'aria'> & { readonly aria?: NonNullable<QuarkProps<HTMLElement>['aria']> };
export type ResizablePanelsOrientation = 'horizontal' | 'vertical';
export type ResizablePanelsChangeEvent = KeyboardEvent | MouseEvent;

export interface ResizablePanelsPanel {
  readonly id: string;
  readonly label: string;
  readonly content: TemplateValue;
  readonly size: number;
  readonly minSize?: number;
  readonly maxSize?: number;
  readonly collapsed?: boolean;
  readonly collapseLabel?: string;
  readonly expandLabel?: string;
}

export interface ResizablePanelsProps {
  readonly id: string;
  readonly panels: readonly ResizablePanelsPanel[];
  readonly orientation?: ResizablePanelsOrientation;
  readonly separatorLabel?: string;
  readonly step?: number;
  readonly onSizeChange?: (panelId: string, size: number, event: ResizablePanelsChangeEvent) => void;
  readonly onCollapsedChange?: (panelId: string, collapsed: boolean, event: ResizablePanelsChangeEvent) => void;
  readonly attributes?: ResizablePanelsAttributes;
  readonly panelAttributes?: Readonly<Record<string, ResizablePanelsRegionAttributes>>;
}

function renderResizablePanels({
  id,
  panels,
  orientation = 'horizontal',
  separatorLabel = 'Resize panels',
  step = 5,
  onSizeChange,
  onCollapsedChange,
  attributes = {},
  panelAttributes = {},
}: ResizablePanelsProps): TemplateResult {
  assertDomId('ResizablePanels.id', id);
  assertNonEmpty('ResizablePanels.separatorLabel', separatorLabel);
  if (orientation !== 'horizontal' && orientation !== 'vertical') throw new TypeError('ResizablePanels.orientation must be horizontal or vertical.');
  if (!Number.isFinite(step) || step <= 0 || step > 50) throw new RangeError('ResizablePanels.step must be greater than 0 and at most 50.');
  if (panels.length < 2) throw new RangeError('ResizablePanels.panels must contain at least two panels.');

  const seen = new Set<string>();
  const validated = panels.map((panel, index) => validatePanel(panel, index, seen));
  const template = validated.flatMap((panel, index) => {
    const track = `minmax(0, ${panel.collapsed ? 0 : panel.size}fr)`;
    if (index === validated.length - 1) return [track];
    return [track, 'auto'];
  }).join(' ');
  const { aria: rootAria, ...rootNativeAttributes } = attributes;
  const children: TemplateValue[] = [];

  validated.forEach((panel, index) => {
    const regionId = `${id}-${panel.id}`;
    const panelAttribute = panelAttributes[panel.id] ?? {};
    const { aria: panelAria, ...panelNativeAttributes } = panelAttribute;
    const collapsed = panel.collapsed === true;
    const collapseLabel = panel.collapseLabel ?? `Collapse ${panel.label}`;
    const expandLabel = panel.expandLabel ?? `Expand ${panel.label}`;
    assertNonEmpty(`ResizablePanels.panels[${index}].collapseLabel`, collapseLabel);
    assertNonEmpty(`ResizablePanels.panels[${index}].expandLabel`, expandLabel);
    children.push(q.section({
      ...panelNativeAttributes,
      id: regionId,
      class: [{ gluon: true, organism: true, 'gluon-resizable-panels-panel': true, 'is-collapsed': collapsed }, panelAttribute.class],
      data: { ...panelAttribute.data, panelId: panel.id },
      part: 'panel',
      aria: { ...panelAria, label: panelAria?.label ?? panel.label },
      children: [
        q.header({ class: 'gluon-resizable-panels-panel-header', part: 'panel-header', children: [
          q.span({ class: 'gluon-resizable-panels-panel-label', part: 'panel-label', children: panel.label }),
          q.button({
            id: `${regionId}-toggle`,
            type: 'button',
            class: 'gluon-resizable-panels-toggle',
            part: 'toggle',
            aria: { controls: `${regionId}-content`, expanded: collapsed ? 'false' : 'true', label: collapsed ? expandLabel : collapseLabel },
            onClick: (event: MouseEvent) => onCollapsedChange?.(panel.id, !collapsed, event),
            children: collapsed ? 'Expand' : 'Collapse',
          }),
        ] }),
        q.div({ id: `${regionId}-content`, class: 'gluon-resizable-panels-panel-content', part: 'panel-content', hidden: collapsed, children: panel.content }),
      ],
    }));
    if (index < validated.length - 1) {
      const next = validated[index + 1];
      if (!next) throw new Error('ResizablePanels requires a following panel for every separator.');
      children.push(q.div({
        id: `${id}-separator-${index + 1}`,
        role: 'separator',
        tabIndex: 0,
        class: 'gluon-resizable-panels-separator',
        part: 'separator',
        aria: {
          label: `${separatorLabel}: ${panel.label} and ${next.label}`,
          orientation,
          controls: `${regionId} ${id}-${next.id}`,
          valuemin: panel.minSize ?? 0,
          valuemax: panel.maxSize ?? 100,
          valuenow: panel.size,
          valuetext: `${panel.size}% ${panel.label}`,
        },
        onKeydown: (event: KeyboardEvent) => {
          const direction = orientation === 'horizontal'
            ? (event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0)
            : (event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0);
          if (!direction) return;
          event.preventDefault();
          const nextSize = clamp(panel.size + (direction * step), panel.minSize ?? 0, panel.maxSize ?? 100);
          onSizeChange?.(panel.id, nextSize, event);
        },
        children: [q.span({ class: 'gluon-resizable-panels-separator-grip', aria: { hidden: 'true' }, children: nothing })],
      }));
    }
  });

  return q.div({
    ...rootNativeAttributes,
    id,
    class: [{ gluon: true, organism: true, 'gluon-resizable-panels': true, [`is-${orientation}`]: true }, attributes.class],
    data: { ...attributes.data, resizablePanelsRoot: id, orientation },
    part: 'root',
    style: { '--gluon-resizable-panels-template': template },
    aria: rootAria,
    children,
  });
}

function validatePanel(panel: ResizablePanelsPanel, index: number, seen: Set<string>): ResizablePanelsPanel {
  assertDomId(`ResizablePanels.panels[${index}].id`, panel.id);
  assertNonEmpty(`ResizablePanels.panels[${index}].label`, panel.label);
  if (seen.has(panel.id)) throw new TypeError(`ResizablePanels panel IDs must be unique: ${panel.id}`);
  seen.add(panel.id);
  if (!Number.isFinite(panel.size) || panel.size < 0 || panel.size > 100) throw new RangeError(`ResizablePanels.panels[${index}].size must be between 0 and 100.`);
  if (panel.minSize !== undefined && (!Number.isFinite(panel.minSize) || panel.minSize < 0 || panel.minSize > 100)) throw new RangeError(`ResizablePanels.panels[${index}].minSize must be between 0 and 100.`);
  if (panel.maxSize !== undefined && (!Number.isFinite(panel.maxSize) || panel.maxSize < 0 || panel.maxSize > 100)) throw new RangeError(`ResizablePanels.panels[${index}].maxSize must be between 0 and 100.`);
  if (panel.minSize !== undefined && panel.maxSize !== undefined && panel.minSize > panel.maxSize) throw new RangeError(`ResizablePanels.panels[${index}].minSize must not exceed maxSize.`);
  if (panel.minSize !== undefined && panel.size < panel.minSize) throw new RangeError(`ResizablePanels.panels[${index}].size must not be below minSize.`);
  if (panel.maxSize !== undefined && panel.size > panel.maxSize) throw new RangeError(`ResizablePanels.panels[${index}].size must not exceed maxSize.`);
  return panel;
}

function clamp(value: number, min: number, max: number): number { return Math.min(Math.max(value, min), max); }
function assertNonEmpty(name: string, value: string): void { if (!value.trim()) throw new TypeError(`${name} must be a non-empty string.`); }
function assertDomId(name: string, value: string): void { assertNonEmpty(name, value); if (/\s/u.test(value)) throw new TypeError(`${name} must not contain whitespace.`); }

export const ResizablePanels = defineOrganism(renderResizablePanels, 'ResizablePanels', [resizablePanelsStyleDependency]);
