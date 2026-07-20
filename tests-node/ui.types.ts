import { svg, type TemplateResult } from '@gluonjs/core';
import {
  Button,
  Icon,
  Input,
  Label,
  atomManifest,
  createUiStyleSelection,
  defineButtonPreset,
  defineIcon,
  getThemeStyles,
  installUi,
  type UiOwner,
  type ButtonProps,
} from '@gluonjs/atoms';
import { Card, FormField, moleculeManifest, type CardProps } from '@gluonjs/molecules';
import { AppShell, organismManifest } from '@gluonjs/organisms';
import {
  Dialog,
  Field,
  Listbox,
  Overlay,
  Popover,
  createFocusScope,
  q,
  quarkManifest,
  unsafeQuarkProps,
  type FocusScope,
  type QuarkProps,
  type ComponentLibraryManifest,
  validateComponentLibraryManifest,
} from '@gluonjs/quarks';

const buttonProps: ButtonProps = { label: 'Save', variant: 'primary' };
const cardProps: CardProps = { title: 'Profile', actions: Button(buttonProps) };
const tree: TemplateResult = AppShell({
  children: Card({
    ...cardProps,
    children: [
      q.p({ children: 'Ready' }),
      Dialog({ label: 'Preferences', children: 'Dialog' }),
      Listbox({
        id: 'finish',
        label: 'Finish',
        options: [{ value: 'black', label: 'Black' }],
      }),
    ],
  }),
});

declare const container: HTMLElement;
const scope: FocusScope = createFocusScope(container);
const theme: CSSStyleSheet = getThemeStyles('dark');
const selection = createUiStyleSelection('dark');
const owner: UiOwner = installUi(document, { theme: selection.theme });
const buttonStyleId: string = Button.styles[0]!.id;
owner.setTheme('light');
owner.styleOwner.retain(theme);
owner.dispose();
const manifests = [quarkManifest, atomManifest, moleculeManifest, organismManifest] as const;
const componentLibraryManifest = {
  schemaVersion: 1,
  name: '@acme/shop-components',
  entries: [{ id: 'purchase-action', module: '@acme/shop-components/purchase-action', exportName: 'PurchaseAction', layer: 'molecule', styles: ['acme-purchase-action'], dependencies: [], accessibility: 'Renders a named purchase action.', storyId: 'purchase-action--default' }],
} as const satisfies ComponentLibraryManifest;
const componentLibraryValidation: boolean = validateComponentLibraryManifest(componentLibraryManifest).valid;
const buttonRef: { value?: HTMLButtonElement } = {};
const svgRef: { value?: SVGSVGElement } = {};
const nativeButton = {
  class: 'app-purchase',
  style: { '--app-accent': '#101010' },
  data: { analyticsAction: 'purchase' },
  aria: { describedby: 'purchase-help' },
  ref: buttonRef,
  '.value': 'purchase',
  '?autofocus': true,
  '@click': (event: Event) => event.preventDefault(),
  onClick: (event: MouseEvent) => event.preventDefault(),
} satisfies QuarkProps<HTMLButtonElement>;
const PurchaseButton = defineButtonPreset({
  displayName: 'PurchaseButton',
  class: 'app-purchase',
  attributes: nativeButton,
});
const customIcon = defineIcon({
  name: 'app-bag',
  viewBox: '0 0 24 24',
  body: svg`<path d="M6 8h12"></path>`,
});

PurchaseButton({ label: 'Buy', type: 'submit', attributes: { ref: buttonRef } });
Icon({ icon: customIcon, label: 'Bag', attributes: { ref: svgRef, data: { owner: 'app' } } });
Input({ attributes: { autocomplete: 'email', ref: { value: undefined } } });
Label({ children: 'Email', attributes: { data: { owner: 'app' } } });
q.textarea({ rows: 4, '.value': 'Notes', aria: { label: 'Notes' } });
Overlay({ children: 'Overlay', attributes: { ref: { value: undefined }, data: { owner: 'app' } } });
Dialog({ label: 'Dialog', children: 'Body', attributes: { class: 'app-dialog' } });
Popover({ id: 'help', children: 'Help', attributes: { ref: { value: undefined } } });
Listbox({ id: 'finish', label: 'Finish', options: [], attributes: { data: { owner: 'app' } } });
Field({ label: 'Email', children: q.input(), attributes: { class: 'app-field' } });
FormField({ label: 'Email', attributes: { autocomplete: 'email' }, fieldAttributes: { data: { owner: 'app' } } });
AppShell({ children: Card({ title: 'Card' }), attributes: { data: { owner: 'app' } } });
unsafeQuarkProps<HTMLButtonElement>({ 'vendor-future-key': true });

void tree;
void scope;
void theme;
void selection;
void manifests;
void buttonStyleId;
void componentLibraryValidation;

// @ts-expect-error component style metadata is immutable
Button.styles.push(Button.styles[0]!);

// @ts-expect-error stable themes reject unknown names
getThemeStyles('contrast');
// @ts-expect-error stable dialogs require an accessible name
Dialog({ children: 'Unnamed' });
// @ts-expect-error retained misspelled native attributes are rejected
q.button({ arialabel: 'Purchase' });
// @ts-expect-error incompatible element props are rejected
q.button({ rows: 4 });
// @ts-expect-error boolean bindings accept only boolean values
q.button({ '?disabled': 'yes' });
// @ts-expect-error event bindings reject non-listeners
q.button({ onClick: 'purchase' });
// @ts-expect-error refs retain the actual target element type
q.button({ ref: { value: document.createElement('input') } });
// @ts-expect-error ARIA names are checked in retained literals
q.button({ aria: { labell: 'Purchase' } });
// @ts-expect-error Button variants remain closed
Button({ label: 'Delete', variant: 'danger' });
// @ts-expect-error protected Button type is an explicit top-level prop
Button({ label: 'Submit', attributes: { type: 'submit' } });
// @ts-expect-error Icon built-in names remain closed
Icon({ name: 'app-bag' });
// @ts-expect-error Icon role cannot silently replace accessibility semantics
Icon({ name: 'spark', attributes: { role: 'presentation' } });
// @ts-expect-error Input attributes reject textarea-only props
Input({ attributes: { rows: 4 } });
// @ts-expect-error Label span attributes reject anchor-only props
Label({ children: 'Email', attributes: { href: '/other' } });
// @ts-expect-error Overlay attributes cannot replace children
Overlay({ children: 'Body', attributes: { children: 'Replacement' } });
// @ts-expect-error Dialog role stays component-owned
Dialog({ label: 'Dialog', children: 'Body', attributes: { role: 'alert' } });
// @ts-expect-error Popover id stays explicit
Popover({ id: 'help', children: 'Help', attributes: { id: 'other' } });
// @ts-expect-error Listbox role stays component-owned
Listbox({ id: 'finish', label: 'Finish', options: [], attributes: { role: 'menu' } });
// @ts-expect-error Field children stay component-owned
Field({ label: 'Email', children: q.input(), attributes: { children: 'Replacement' } });
// @ts-expect-error Card article attributes reject anchor-only props
Card({ title: 'Card', attributes: { href: '/other' } });
// @ts-expect-error FormField outer label rejects anchor-only props
FormField({ label: 'Email', fieldAttributes: { href: '/other' } });
// @ts-expect-error FormField Input attributes reject textarea-only props
FormField({ label: 'Email', attributes: { rows: 4 } });
// @ts-expect-error AppShell div attributes reject anchor-only props
AppShell({ children: 'Content', attributes: { href: '/other' } });
