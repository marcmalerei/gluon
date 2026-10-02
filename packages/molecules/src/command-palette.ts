import { defineMolecule, nothing, type TemplateResult, type TemplateValue } from '@gluonjs/core';
import { Input, type InputProps } from '@gluonjs/atoms';
import { q, type QuarkProps } from '@gluonjs/quarks';
import { commandPaletteStyleDependency } from './command-palette-styles.js';

export type CommandPaletteAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'id'>;
export type CommandPaletteInputAttributes = InputProps['attributes'];
export type CommandPaletteListboxAttributes = Omit<QuarkProps<HTMLDivElement>, 'children' | 'id' | 'role'>;

export interface CommandPaletteCommand {
  readonly id: string;
  readonly label: TemplateValue;
  readonly description?: TemplateValue;
  readonly shortcut?: TemplateValue;
  readonly disabled?: boolean;
}

export interface CommandPaletteGroup {
  readonly id: string;
  readonly label: TemplateValue;
  readonly commands: readonly CommandPaletteCommand[];
}

export interface CommandPaletteProps {
  readonly id: string;
  readonly label: string;
  readonly groups: readonly CommandPaletteGroup[];
  readonly query?: string;
  readonly activeId?: string;
  readonly open?: boolean;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly emptyMessage?: TemplateValue;
  readonly onQueryChange?: (value: string, event: InputEvent) => void;
  readonly onActiveChange?: (id: string, event: KeyboardEvent) => void;
  readonly onSelect?: (id: string, event: Event) => void;
  readonly onOpenChange?: (open: boolean, event: Event) => void;
  readonly inputAttributes?: CommandPaletteInputAttributes;
  readonly listboxAttributes?: CommandPaletteListboxAttributes;
  readonly attributes?: CommandPaletteAttributes;
}

function renderCommandPalette({
  id,
  label,
  groups,
  query = '',
  activeId,
  open = false,
  loading = false,
  disabled = false,
  placeholder = 'Search commands',
  emptyMessage = 'No commands found.',
  onQueryChange,
  onActiveChange,
  onSelect,
  onOpenChange,
  inputAttributes = {},
  listboxAttributes = {},
  attributes = {},
}: CommandPaletteProps): TemplateResult {
  assertDomId('CommandPalette.id', id);
  assertNonEmpty('CommandPalette.label', label);
  const inputId = inputAttributes.id ?? `${id}-input`;
  assertDomId('CommandPalette.inputAttributes.id', inputId);
  const dialogLabelId = `${id}-label`;
  const listboxId = `${id}-listbox`;
  const commands = groups.flatMap((group) => group.commands.map((command) => ({ group, command })));
  const seenIds = new Set<string>();
  for (const group of groups) {
    assertDomId(`CommandPalette group ${group.id}`, group.id);
    if (seenIds.has(group.id)) throw new TypeError(`CommandPalette ids must be unique: ${group.id}`);
    seenIds.add(group.id);
    for (const command of group.commands) {
      assertDomId(`CommandPalette command ${command.id}`, command.id);
      if (seenIds.has(command.id)) throw new TypeError(`CommandPalette ids must be unique: ${command.id}`);
      seenIds.add(command.id);
    }
  }
  const enabledCommands = commands.filter(({ command }) => !command.disabled);
  const activeIndex = enabledCommands.findIndex(({ command }) => command.id === activeId);
  const activeCommand = activeIndex >= 0 ? enabledCommands[activeIndex]?.command : undefined;
  const commandId = (command: CommandPaletteCommand): string => `${id}-command-${command.id}`;
  const moveActive = (direction: 1 | -1, event: KeyboardEvent): void => {
    if (enabledCommands.length === 0) return;
    const start = activeIndex < 0 ? (direction === 1 ? -1 : enabledCommands.length) : activeIndex;
    const next = (start + direction + enabledCommands.length) % enabledCommands.length;
    const nextCommand = enabledCommands[next]?.command;
    if (nextCommand) {
      event.preventDefault();
      onOpenChange?.(true, event);
      onActiveChange?.(nextCommand.id, event);
    }
  };
  const { onInput: attributeInput, onKeydown: attributeKeydown, ...nativeInputAttributes } = inputAttributes;
  const renderedGroups = groups.map((group) => {
    const groupLabelId = `${id}-group-${group.id}`;
    return q.div({
      role: 'group',
      aria: { labelledby: groupLabelId },
      class: 'gluon-command-palette-group',
      children: [
        q.h3({ id: groupLabelId, class: 'gluon-command-palette-group-label', children: group.label }),
        group.commands.map((command) => {
          const commandDescriptionId = command.description === undefined ? undefined : `${id}-description-${command.id}`;
          return q.button({
            id: commandId(command),
            type: 'button',
            role: 'option',
            tabIndex: -1,
            disabled: command.disabled,
            aria: {
              selected: command.id === activeId,
              disabled: command.disabled || undefined,
              describedby: commandDescriptionId,
            },
            class: [{ 'gluon-command-palette-command': true, 'is-disabled': command.disabled }],
            onClick: (event: MouseEvent) => {
              if (command.disabled) {
                event.preventDefault();
                return;
              }
              onSelect?.(command.id, event);
              onOpenChange?.(false, event);
            },
            children: [
              q.span({ class: 'gluon-command-palette-command-copy', children: [q.span({ class: 'gluon-command-palette-command-label', children: command.label }), command.description === undefined ? nothing : q.span({ id: commandDescriptionId, class: 'gluon-command-palette-command-description', children: command.description })] }),
              command.shortcut === undefined ? nothing : q.kbd({ class: 'gluon-command-palette-command-shortcut', children: command.shortcut }),
            ],
          });
        }),
      ],
    });
  });
  const hasCommands = commands.length > 0;
  const describedBy = inputAttributes.aria?.describedby;

  return q.div({
    ...attributes,
    id,
    role: 'dialog',
    hidden: !open,
    aria: { ...attributes.aria, labelledby: dialogLabelId, modal: true },
    class: [{ gluon: true, molecule: true, 'gluon-command-palette': true }, attributes.class],
    children: [
      q.h2({ id: dialogLabelId, class: 'gluon-command-palette-label', children: label }),
      q.div({
        class: 'gluon-command-palette-control',
        children: Input({
          value: query,
          placeholder,
          disabled,
          onInput: (event) => {
            callListener(attributeInput, event);
            if (!event.defaultPrevented) {
              onQueryChange?.((event.target as HTMLInputElement).value, event);
              onOpenChange?.(true, event);
            }
          },
          attributes: {
            ...nativeInputAttributes,
            id: inputId,
            role: 'combobox',
            aria: {
              ...nativeInputAttributes.aria,
              labelledby: dialogLabelId,
              controls: listboxId,
              expanded: open,
              autocomplete: 'off',
              activedescendant: open && activeCommand ? commandId(activeCommand) : undefined,
              describedby: describedBy,
              busy: loading || undefined,
            },
            onKeydown: (event: KeyboardEvent) => {
              callListener(attributeKeydown, event);
              if (event.defaultPrevented || disabled) return;
              if (event.key === 'ArrowDown') moveActive(1, event);
              else if (event.key === 'ArrowUp') moveActive(-1, event);
              else if (event.key === 'Home') {
                event.preventDefault();
                const first = enabledCommands[0]?.command;
                if (first) onActiveChange?.(first.id, event);
              } else if (event.key === 'End') {
                event.preventDefault();
                const last = enabledCommands.at(-1)?.command;
                if (last) onActiveChange?.(last.id, event);
              } else if (event.key === 'Escape' && open) {
                event.preventDefault();
                onOpenChange?.(false, event);
              } else if (event.key === 'Enter' && open && activeCommand) {
                event.preventDefault();
                onSelect?.(activeCommand.id, event);
                onOpenChange?.(false, event);
              }
            },
          },
        }),
      }),
      q.div({
        ...listboxAttributes,
        id: listboxId,
        role: 'listbox',
        aria: { ...listboxAttributes.aria, labelledby: dialogLabelId, busy: loading || undefined },
        class: [{ 'gluon-command-palette-listbox': true }, listboxAttributes.class],
        children: loading
          ? q.p({ role: 'status', class: 'gluon-command-palette-status', children: 'Loading commands…' })
          : hasCommands ? renderedGroups : q.p({ class: 'gluon-command-palette-status', children: emptyMessage }),
      }),
    ],
  });
}

function assertNonEmpty(name: string, value: string): void {
  if (!value.trim()) throw new TypeError(`${name} must be a non-empty string.`);
}

function assertDomId(name: string, value: string): void {
  assertNonEmpty(name, value);
  if (/\s/u.test(value)) throw new TypeError(`${name} must not contain whitespace.`);
}

function callListener<EventType extends Event>(
  listener: ((event: EventType) => unknown) | { handleEvent(event: EventType): void } | null | undefined,
  event: EventType,
): void {
  if (typeof listener === 'function') listener(event);
  else listener?.handleEvent(event);
}

export const CommandPalette = defineMolecule(renderCommandPalette, 'CommandPalette', [commandPaletteStyleDependency]);
