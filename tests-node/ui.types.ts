import { svg, type TemplateResult } from '@gluonjs/core';
import {
  AspectRatio,
  Avatar,
  Button,
  Icon,
  Input,
  Label,
  Slider,
  ScrollArea,
  Separator,
  atomManifest,
  createUiStyleSelection,
  defineButtonPreset,
  defineIcon,
  defineUiAtom,
  getThemeStyles,
  installUi,
  type AspectRatioAttributes,
  type AspectRatioProps,
  type AvatarAttributes,
  type AvatarProps,
  type AvatarStatus,
  type ButtonProps,
  type SliderProps,
  type ScrollAreaAttributes,
  type ScrollAreaOrientation,
  type ScrollAreaProps,
  type SeparatorAttributes,
  type SeparatorOrientation,
  type SeparatorProps,
  type UiOwner,
} from '@gluonjs/atoms';
import {
  Accordion,
  Card,
  EmptyState,
  FormField,
  InlineNotice,
  NavigationStrip,
  ResponsiveDisclosure,
  TableRegion,
  moleculeManifest,
  type CardProps,
  type NavigationStripProps,
  type ResponsiveDisclosureAttributes,
  type ResponsiveDisclosureProps,
} from '@gluonjs/molecules';
import { AppShell, WorkflowTimeline, organismManifest, type WorkflowTimelineOverallState, type WorkflowTimelineStatus } from '@gluonjs/organisms';
import {
  Dialog,
  Field,
  Listbox,
  Overlay,
  Popover,
  createFocusScope,
  createComponentLibraryLoader,
  q,
  quarkManifest,
  unsafeQuarkProps,
  type FocusScope,
  type QuarkProps,
  type ComponentLibraryManifest,
  validateComponentLibraryManifest,
} from '@gluonjs/quarks';

const buttonProps: ButtonProps = { label: 'Save', variant: 'primary' };
const controlledSliderProps: SliderProps = { value: 0.4, min: 0, max: 1, step: 0.1 };
const uncontrolledSliderProps: SliderProps = { defaultValue: 0.4, min: 0, max: 1, step: 0.1 };
// @ts-expect-error controlled and uncontrolled Slider values are mutually exclusive
const ambiguousSliderProps: SliderProps = { value: 0.4, defaultValue: 0.5 };
void ambiguousSliderProps;
const cardProps: CardProps = { title: 'Profile', actions: Button(buttonProps) };
const navigationStripProps: NavigationStripProps = {
  label: 'Account sections',
  children: q.a({ href: '#profile', 'aria-current': 'page', children: 'Profile' }),
  attributes: { data: { owner: 'account' } },
};
const responsiveDisclosureAttributes: ResponsiveDisclosureAttributes = {
  class: 'catalog-filters',
};
const responsiveDisclosureProps: ResponsiveDisclosureProps = {
  id: 'catalog-filters',
  summary: 'Filters',
  compactBreakpoint: '(max-width: 48rem)',
  compactInitialOpen: false,
  compactResetToken: 1,
  attributes: responsiveDisclosureAttributes,
  children: 'Filter controls',
};
ResponsiveDisclosure(responsiveDisclosureProps);
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
const workflowStatus: WorkflowTimelineStatus = 'current';
const workflowState: WorkflowTimelineOverallState = 'active';
const workflow: TemplateResult = WorkflowTimeline({
  id: 'typed-workflow',
  state: workflowState,
  steps: [{ id: 'review', label: 'Review', status: workflowStatus }],
  messages: { status: (status) => status.toUpperCase() },
});
void workflow;

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
const componentLibraryLoader = createComponentLibraryLoader(componentLibraryManifest, { load: async () => null });
const componentLibraryStyleSnapshot: Readonly<{ schemaVersion: 1; library: string; styles: readonly string[] }> = componentLibraryLoader.styleSnapshot();
componentLibraryLoader.validateStyleSnapshot(componentLibraryStyleSnapshot);
const buttonRef: { value?: HTMLButtonElement } = {};
const svgRef: { value?: SVGSVGElement } = {};
const imageRef: { value?: HTMLImageElement } = {};
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
const TextLink = defineUiAtom<{
  readonly href?: string;
  readonly children?: string;
}, 'a' | 'span'>({
  displayName: 'TextLink',
  tag: ({ href }) => href ? 'a' : 'span',
  nativeProps: ({ href, children }, tag) => ({
    children,
    ...(tag === 'a' ? { href } : {}),
  }),
});

PurchaseButton({ label: 'Buy', type: 'submit', attributes: { ref: buttonRef } });
TextLink({ href: '/shop', children: 'Shop', aria: { current: 'page' } });
const aspectRatioAttributes = { class: 'app-media' } satisfies AspectRatioAttributes;
const aspectRatioProps = { ratio: 16 / 9, attributes: aspectRatioAttributes, children: 'Media' } satisfies AspectRatioProps;
const avatarStatus: AvatarStatus = 'loaded';
const avatarAttributes = { loading: 'lazy', ref: imageRef } satisfies AvatarAttributes;
const avatarProps = { src: '/ada.webp', alt: 'Ada Lovelace', status: avatarStatus, attributes: avatarAttributes } satisfies AvatarProps;
const scrollOrientation: ScrollAreaOrientation = 'both';
const scrollAreaAttributes = { tabIndex: -1, class: 'app-scroll' } satisfies ScrollAreaAttributes;
const scrollAreaProps = { label: 'Order history', orientation: scrollOrientation, attributes: scrollAreaAttributes, children: 'Orders' } satisfies ScrollAreaProps;
const separatorOrientation: SeparatorOrientation = 'vertical';
const separatorAttributes = { class: 'app-separator' } satisfies SeparatorAttributes;
const separatorProps = { orientation: separatorOrientation, attributes: separatorAttributes } satisfies SeparatorProps;
AspectRatio(aspectRatioProps);
Avatar(avatarProps);
ScrollArea(scrollAreaProps);
Separator(separatorProps);
Icon({ icon: customIcon, label: 'Bag', attributes: { ref: svgRef, data: { owner: 'app' } } });
Input({ attributes: { autocomplete: 'email', ref: { value: undefined } } });
Label({ children: 'Email', attributes: { data: { owner: 'app' } } });
Slider({ ...controlledSliderProps, onInput: (event) => { void event.currentTarget; } });
Slider(uncontrolledSliderProps);
q.textarea({ rows: 4, '.value': 'Notes', aria: { label: 'Notes' } });
Overlay({ children: 'Overlay', attributes: { ref: { value: undefined }, data: { owner: 'app' } } });
Dialog({ label: 'Dialog', children: 'Body', attributes: { class: 'app-dialog' } });
Popover({ id: 'help', children: 'Help', attributes: { ref: { value: undefined } } });
Listbox({ id: 'finish', label: 'Finish', options: [], attributes: { data: { owner: 'app' } } });
Field({ label: 'Email', children: q.input(), attributes: { class: 'app-field' } });
FormField({ label: 'Email', attributes: { autocomplete: 'email' }, fieldAttributes: { data: { owner: 'app' } } });
AppShell({ children: Card({ title: 'Card' }), attributes: { data: { owner: 'app' } } });
NavigationStrip(navigationStripProps);
InlineNotice({
  tone: 'warning',
  announcement: 'assertive',
  title: 'Inventory changed',
  children: 'Review the updated quantity.',
  action: Button({ label: 'Review' }),
  attributes: { data: { owner: 'checkout' } },
});
EmptyState({
  presentation: 'compact',
  heading: 'No objects',
  headingLevel: 3,
  children: 'Clear filters to continue.',
  action: Button({ label: 'Clear filters' }),
  attributes: { data: { owner: 'catalog' } },
});
TableRegion({
  id: 'orders-table',
  labelledBy: 'orders-title',
  summary: 'Two orders.',
  scrollHint: 'Scroll horizontally to review every column.',
  children: q.table({ children: q.tbody({ children: q.tr({ children: q.td({ children: 'A-101' }) }) }) }),
  attributes: { data: { owner: 'orders' }, ref: { value: undefined } },
});
TableRegion({ id: 'archived-orders', label: 'Archived orders', empty: true, emptyContent: 'No archived orders.' });
Accordion({
  label: 'Delivery details',
  value: 'tracking',
  items: [{ id: 'tracking', value: 'tracking', summary: 'Tracking', children: 'Sent after dispatch.' }],
  onChange: (value) => { const selected: string | undefined = value; void selected; },
});
Accordion({
  labelledBy: 'delivery-title',
  mode: 'multiple',
  value: ['tracking'],
  items: [{ id: 'tracking-multiple', value: 'tracking', summary: 'Tracking', children: 'Sent after dispatch.' }],
  onChange: (value) => { const selected: readonly string[] = value; void selected; },
});
unsafeQuarkProps<HTMLButtonElement>({ 'vendor-future-key': true });

void tree;
void scope;
void theme;
void selection;
void manifests;
void buttonStyleId;
void navigationStripProps;
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
// @ts-expect-error AspectRatio div attributes reject image-only props
AspectRatio({ attributes: { alt: 'Wrong element' } });
// @ts-expect-error Avatar attributes cannot replace its accessible image alt
Avatar({ src: '/ada.webp', alt: 'Ada', attributes: { alt: 'Replacement' } });
// @ts-expect-error Avatar lifecycle states remain closed
Avatar({ src: '/ada.webp', alt: 'Ada', status: 'idle' });
// @ts-expect-error ScrollArea requires an accessible name
ScrollArea({ children: 'Unnamed' });
// @ts-expect-error ScrollArea orientation remains closed
ScrollArea({ label: 'History', orientation: 'inline' });
// @ts-expect-error ScrollArea preserves its named native region semantics
ScrollArea({ label: 'History', attributes: { role: 'presentation' } });
// @ts-expect-error Separator role remains component-owned
Separator({ attributes: { role: 'menu' } });
// @ts-expect-error Separator orientation remains closed
Separator({ orientation: 'diagonal' });
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
// @ts-expect-error NavigationStrip requires an accessible landmark name
NavigationStrip({ children: q.a({ href: '#profile', children: 'Profile' }) });
// @ts-expect-error NavigationStrip nav attributes reject anchor-only props
NavigationStrip({ label: 'Sections', attributes: { href: '/other' } });
// @ts-expect-error InlineNotice tones remain closed
InlineNotice({ tone: 'critical', children: 'Invalid tone' });
// @ts-expect-error InlineNotice owns the outer role and live-region mapping
InlineNotice({ children: 'Feedback', attributes: { role: 'alert' } });
// @ts-expect-error InlineNotice live and atomic semantics stay on its bounded announcement region
InlineNotice({ children: 'Feedback', attributes: { aria: { live: 'assertive' } } });
// @ts-expect-error EmptyState presentation remains closed
EmptyState({ presentation: 'drawer', heading: 'Empty' });
// @ts-expect-error EmptyState intentionally cannot become a repeated live region
EmptyState({ heading: 'Empty', attributes: { aria: { live: 'polite' } } });
// @ts-expect-error TableRegion requires an accessible region name
TableRegion({ id: 'orders', children: q.table() });
// @ts-expect-error TableRegion empty and populated content are mutually exclusive
TableRegion({ id: 'orders', label: 'Orders', empty: true, emptyContent: 'None', children: q.table() });
// @ts-expect-error TableRegion owns the outer region role
TableRegion({ id: 'orders', label: 'Orders', children: q.table(), attributes: { role: 'grid' } });
// @ts-expect-error Accordion requires an accessible group name
Accordion({ value: 'one', items: [] });
// @ts-expect-error multiple Accordion values are arrays
Accordion({ label: 'Sections', mode: 'multiple', value: 'one', items: [] });
// @ts-expect-error multiple Accordion does not accept the single-mode collapse policy
Accordion({ label: 'Sections', mode: 'multiple', value: [], collapsible: false, items: [] });
// @ts-expect-error unavailable Accordion items require a visible reason
Accordion({ label: 'Sections', items: [{ id: 'later', value: 'later', summary: 'Later', children: 'Later', unavailable: true }] });
// @ts-expect-error ResponsiveDisclosure requires a compact media query
ResponsiveDisclosure({ id: 'filters', summary: 'Filters', children: 'Controls' });
// @ts-expect-error ResponsiveDisclosure initial state is boolean
ResponsiveDisclosure({ id: 'filters', summary: 'Filters', compactBreakpoint: '(max-width: 48rem)', compactInitialOpen: 'open', children: 'Controls' });
// @ts-expect-error ResponsiveDisclosure reset tokens are string or number
ResponsiveDisclosure({ id: 'filters', summary: 'Filters', compactBreakpoint: '(max-width: 48rem)', compactResetToken: {}, children: 'Controls' });
// @ts-expect-error AppShell div attributes reject anchor-only props
AppShell({ children: 'Content', attributes: { href: '/other' } });
// @ts-expect-error WorkflowTimeline requires a stable instance id
WorkflowTimeline({ steps: [] });
// @ts-expect-error WorkflowTimeline owns its root id separately from native attributes
WorkflowTimeline({ id: 'workflow', steps: [], attributes: { id: 'other' } });
// @ts-expect-error WorkflowTimeline status values remain closed
WorkflowTimeline({ id: 'workflow', steps: [{ id: 'one', label: 'One', status: 'running' }] });
