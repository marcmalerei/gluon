import {
  AspectRatio,
  Avatar,
  Badge,
  Button,
  Checkbox,
  DateInput,
  FileInput,
  Heading,
  Image,
  Radio,
  Icon,
  Input,
  Label,
  Link,
  Meter,
  NumberInput,
  Progress,
  Slider,
  Skeleton,
  ScrollArea,
  Select,
  Spinner,
  StatusBadge,
  Separator,
  Switch,
  Text,
  ToggleButton,
  Textarea,
  TimeInput,
  accessibilityStyles,
  focusRingAttributes,
  visuallyHiddenAttributes,
  defineButtonPreset,
  defineIcon,
  installUi,
} from '@gluonjs/atoms';
import {
  adoptStyles,
  createApp,
  css,
  svg,
} from '@gluonjs/core';
import {
  Accordion,
  Breadcrumbs,
  Card,
  ButtonGroup,
  ChoiceGroup,
  ControlField,
  ContextMenu,
  DialogSurface,
  Popover,
  Sheet,
  Disclosure,
  ResponsiveDisclosure,
  DropdownMenu,
  EmptyState,
  FormField,
  InlineNotice,
  NavigationStrip,
  Pagination,
  ResponsiveActionBar,
  NavigationMenu,
  OneTimePasswordField,
  PasswordToggleField,
  SearchField,
  SearchResults,
  Tooltip as MoleculeTooltip,
  Stepper,
  FilterBar,
  DataList,
  ListboxField,
  ComboboxField,
  CommandPalette,
  TreeView,
  SortControl,
  DatePicker,
  DateRangePicker,
  FileUpload,
  TimePicker,
  MultiSelectField,
  Calendar,
  Menubar,
  SegmentedControl,
  TableRegion,
  Tabs,
  Toolbar,
  ToastViewport,
  createDialogSurfaceController,
  createToastController,
  defineMolecule,
} from '@gluonjs/molecules';
import { AdminShell, AppShell, ApprovalFlow, AsyncState, ConfirmationDialog, DashboardShell, MarketingHeader, MegaMenu, NavigationRail, OnboardingFlow, PageLayout, ProductCard, ProductGallery, ProductGrid, ResizablePanels, SidebarLayout, SiteFooter, SiteHeader, SplitPane, Wizard, WorkflowTimeline, defineOrganism } from '@gluonjs/organisms';
import {
  Dialog,
  Field,
  Listbox,
  Overlay,
  Popover as QuarkPopover,
  Tooltip,
  HoverCard,
  createFocusScope,
  q,
} from '@gluonjs/quarks';
import { ref } from '@gluonjs/reactivity';
import examplePortrait from '../../docs/assets/examples/foundation-avatar.svg?url&no-inline';

const theme = ref<'light' | 'dark'>('light');
const finish = ref('black');
const searchQuery = ref('cable');
const dialogOpen = ref(false);
const purchaseRef: { value?: HTMLButtonElement } = {};
const analyticsEvents: string[] = [];
const dialogFocusOptions = { initialFocus: '[data-dialog-initial-focus]' } satisfies Parameters<typeof createFocusScope>[1];
const dialogController = createDialogSurfaceController(dialogFocusOptions);
const toastController = createToastController();
// DialogSurface composes these same public headless primitives; applications can still use them directly.
const headlessDialogPrimitives = { Dialog, Overlay, createFocusScope };
void headlessDialogPrimitives;
const menuAndToolbarPrimitives = { ContextMenu, DropdownMenu, Menubar, Toolbar };
void menuAndToolbarPrimitives;
const dataMolecules = { MoleculeTooltip, Stepper, FilterBar, DataList, ListboxField, ComboboxField, CommandPalette, TreeView, SortControl, Popover, Sheet, MultiSelectField, Calendar };
void dataMolecules;
const applicationOrganisms = { AdminShell, ApprovalFlow, AsyncState, DashboardShell, MarketingHeader, MegaMenu, NavigationRail, OnboardingFlow, ProductCard, ProductGallery, ProductGrid, ResizablePanels, SidebarLayout, SiteFooter, SiteHeader, SplitPane, Wizard };
void applicationOrganisms;
const customBagIcon = defineIcon({
  name: 'example-bag',
  viewBox: '0 0 24 24',
  body: svg`<path d="M6 8h12l1 13H5L6 8zm3 0a3 3 0 0 1 6 0" stroke="currentColor" stroke-width="2" fill="none"></path>`,
});
const PurchaseButton = defineButtonPreset({
  displayName: 'ExamplePurchaseButton',
  class: 'example-purchase',
  attributes: { data: { analyticsAction: 'purchase' } },
});
const DangerButton = defineButtonPreset({
  displayName: 'ExampleDangerButton',
  class: 'example-danger',
});
const PurchaseAction = defineMolecule((props: { total: string }) => PurchaseButton({
  children: [Icon({ icon: customBagIcon, label: 'Bag' }), ` Buy for ${props.total}`],
  attributes: {
    ref: purchaseRef,
    data: { productAction: 'buy' },
    onClick: () => analyticsEvents.push('purchase'),
  },
}), 'ExamplePurchaseAction');
const CheckoutActions = defineOrganism((props: { total: string }) => q.footer({
  class: 'example-actions',
  children: [PurchaseAction(props), DangerButton({ label: 'Cancel order' })],
}), 'ExampleCheckoutActions');
const exampleStyles = css`
  @layer gluon {
    body { margin: 0; background: var(--gluon-color-canvas); }
    .example-actions { display: flex; flex-wrap: wrap; gap: 12px; }
    .example-purchase { --gluon-button-background: #171717; --gluon-button-color: #fff; }
    .example-danger { --gluon-button-background: #a52222; --gluon-button-color: #fff; }
    [role="listbox"] { display: grid; gap: 4px; margin-block: 20px; padding: 4px; border: 1px solid var(--gluon-color-rule); }
    [role="option"] { min-block-size: 44px; padding: 12px; }
    [role="option"][aria-selected="true"] { background: var(--gluon-color-action-soft); color: var(--gluon-color-action-soft-text); }
    [role="listbox"]:focus-visible { outline: 3px solid var(--gluon-color-focus); }
    .gluon-field { display: grid; gap: 0.375rem; margin-block: 16px; }
    .gluon-field .gluon-input { inline-size: 100%; }
    .example-overlay { position: fixed; inset: 0; z-index: 10; display: grid; place-items: center; background: rgb(0 0 0 / 45%); }
    .example-dialog { max-inline-size: 360px; border: 1px solid var(--gluon-color-rule); background: var(--gluon-color-surface); color: var(--gluon-color-text); }
    [popover] { max-inline-size: 360px; padding: 24px; border: 1px solid var(--gluon-color-rule); background: var(--gluon-color-surface); color: var(--gluon-color-text); }
  }
`;

function closeDialog(): void {
  dialogOpen.value = false;
  dialogController.deactivate();
}

function openDialog(trigger: HTMLElement): void {
  dialogOpen.value = true;
  dialogController.activate(trigger);
}

const uiOwner = installUi(document, { theme: 'light' });
adoptStyles(document, exampleStyles);
adoptStyles(document, accessibilityStyles);

createApp(() => AppShell({
  header: q.div({
    children: ButtonGroup({
      label: 'Example actions',
      attributes: { class: 'example-actions' },
      children: [
      PageLayout({
        id: 'component-reference',
        title: 'Component reference',
        breadcrumbs: q.nav({ 'aria-label': 'Breadcrumb', children: 'Docs / Components' }),
        actions: Button({ label: 'Copy import', variant: 'secondary' }),
        aside: q.p({ children: 'CSS variables and tenant tokens remain caller-owned.' }),
        children: [
          Heading({ level: 2, children: 'Foundation atoms' }),
          Text({ tone: 'muted', children: 'Native semantics with token-backed presentation.' }),
        ],
      }),
      Heading({ level: 2, children: 'Foundation atoms' }),
      Text({ tone: 'muted', children: 'Native semantics with token-backed presentation.' }),
      Link({ href: '#profile', children: 'Read the profile' }),
      Image({ src: '/assets/catalog-preview.webp', alt: 'Catalog preview', width: 96, height: 64 }),
      Badge({ tone: 'success', children: 'Ready' }),
      Spinner({ label: 'Loading preview' }),
      Skeleton({ width: '6rem', height: '1rem' }),
      Meter({ value: 3, max: 4, children: 'Three of four' }),
      NumberInput({ name: 'quantity', value: '1' }),
      DateInput({ name: 'delivery-date', value: '2026-10-02' }),
      TimeInput({ name: 'delivery-time', value: '09:00' }),
      FileInput({ name: 'product-photos', accept: 'image/*', multiple: true }),
      q.a({ ...visuallyHiddenAttributes<HTMLAnchorElement>({ href: '#profile' }), children: 'Skip to profile' }),
      q.button({ ...focusRingAttributes<HTMLButtonElement>({ type: 'button' }), children: 'Keyboard focus' }),
      q.strong({ children: [Icon({ name: 'spark' }), Label({ children: ' GLUON UI' })] }),
      Button({
        label: `Use ${theme.value === 'light' ? 'dark' : 'light'} theme`,
        variant: 'ghost',
        onClick: () => {
          theme.value = theme.value === 'light' ? 'dark' : 'light';
          uiOwner.setTheme(theme.value);
        },
      }),
      Button({
        label: 'Open dialog',
        variant: 'secondary',
        onClick: (event) => openDialog(event.currentTarget as HTMLElement),
      }),
      Button({
        label: 'Show saved notification',
        variant: 'secondary',
        onClick: () => toastController.add({
          id: 'profile-saved-toast',
          title: 'Profile saved',
          children: 'Your public details are up to date.',
          tone: 'success',
        }),
      }),
      q.button({ type: 'button', popovertarget: 'ui-help', children: 'Open help popover' }),
      ],
    }),
  }),
  navigation: q.a({ href: '#profile', children: 'Profile' }),
  children: [
    ProductGrid({
      items: [
        { id: 'orbit-lamp', title: 'Orbit lamp', description: 'Adjustable light for focused work.' },
        { id: 'stack-tray', title: 'Stack tray', description: 'A modular tray for daily tools.' },
      ],
      columns: 2,
      renderCard: (product) => ProductCard({
        product,
        href: `#${product.id}`,
        price: product.id === 'orbit-lamp' ? '€128' : '€64',
        availability: 'In stock',
        actions: q.button({ type: 'button', children: 'Add to bag' }),
      }),
    }),
    AsyncState({
      id: 'ui-system-async-state',
      status: 'partial',
      heading: 'Profile data',
      partialContent: q.p({ children: 'Profile data is available while recommendations refresh.' }),
      actions: q.button({ type: 'button', children: 'Retry recommendations' }),
    }),
    ResizablePanels({
      id: 'ui-system-resizable-panels',
      panels: [
        { id: 'workspace', label: 'Workspace', size: 68, content: q.p({ children: 'Caller-owned dashboard workspace.' }) },
        { id: 'inspector', label: 'Inspector', size: 32, content: q.p({ children: 'Tenant-owned inspector content.' }) },
      ],
    }),
    DashboardShell({
      id: 'ui-system-dashboard-shell',
      header: q.strong({ children: 'Operations dashboard' }),
      sidebar: q.div({ children: [q.a({ href: '#overview', children: 'Overview' }), q.a({ href: '#reports', children: 'Reports' })] }),
      main: q.p({ children: 'Caller-owned dashboard widgets and filters.' }),
      utility: q.p({ children: 'Tenant-owned activity and inspector tools.' }),
      footer: q.small({ children: 'Workspace status: ready' }),
    }),
    SidebarLayout({
      id: 'ui-system-sidebar-layout',
      header: q.strong({ children: 'Workspace header' }),
      sidebar: q.div({ children: [q.a({ href: '#overview', children: 'Overview' }), q.a({ href: '#reports', children: 'Reports' })] }),
      main: q.p({ children: 'Caller-owned page content.' }),
      footer: q.small({ children: 'Tenant workspace' }),
      sidebarLabel: 'Workspace navigation',
    }),
    Wizard({
      id: 'ui-system-wizard',
      title: 'Configure product',
      steps: [
        { id: 'details', label: 'Details', content: q.p({ children: 'Caller-owned product details.' }) },
        { id: 'finish', label: 'Finish', description: 'Choose a tenant finish.', content: q.p({ children: 'Caller-owned finish selection.' }) },
        { id: 'review', label: 'Review', content: q.p({ children: 'Caller-owned review summary.' }) },
      ],
      currentStep: 1,
    }),
    OnboardingFlow({
      id: 'ui-system-onboarding-flow',
      title: 'Set up workspace',
      steps: [{ id: 'profile', label: 'Profile', content: q.p({ children: 'Caller-owned profile setup.' }) }, { id: 'workspace', label: 'Workspace', content: q.p({ children: 'Caller-owned workspace setup.' }) }],
      currentStep: 1,
    }),
    ApprovalFlow({
      id: 'ui-system-approval-flow',
      title: 'Release review',
      stages: [
        { id: 'request', label: 'Request', status: 'approved', content: q.p({ children: 'Caller-owned request details.' }) },
        { id: 'security', label: 'Security', status: 'in-review', role: 'Security', content: q.p({ children: 'Caller-owned security review.' }), evidence: q.small({ children: 'Report 42' }), actions: q.button({ type: 'button', children: 'Approve' }) },
      ],
      currentStage: 1,
    }),
    MarketingHeader({
      id: 'ui-system-marketing-header',
      announcement: q.strong({ children: 'Free shipping this week' }),
      brand: q.a({ href: '#profile', children: 'GLUON GOODS' }),
      navigation: q.div({ children: [q.a({ href: '#profile', children: 'Shop' }), q.a({ href: '#orders', children: 'Journal' })] }),
      actions: q.button({ type: 'button', children: 'Search' }),
      mobileNavigation: q.a({ href: '#profile', children: 'Shop' }),
    }),
    NavigationRail({
      id: 'ui-system-navigation-rail',
      label: 'Workspace navigation',
      groups: [{ id: 'workspace', label: 'Workspace', items: [{ id: 'overview', label: 'Overview', href: '#profile', active: true, icon: '⌂' }, { id: 'orders', label: 'Orders', href: '#orders', badge: '4', icon: '□' }] }],
      header: q.strong({ children: 'GLUON GOODS' }),
      footer: q.small({ children: 'Tenant workspace' }),
    }),
    WorkflowTimeline({
      id: 'ui-system-workflow',
      state: 'complete',
      steps: [{ id: 'profile', label: 'Profile reviewed', status: 'completed', evidence: 'Example record' }],
    }),
    NavigationStrip({
      label: 'Account sections',
      children: [
        q.a({ href: '#profile', 'aria-current': 'page', children: 'Profile' }),
        q.a({ href: '#orders', children: 'Orders' }),
        q.a({ href: '#security', children: 'Security' }),
      ],
    }),
    Breadcrumbs({
      label: 'Catalog breadcrumb',
      items: [
        { label: 'Catalog', href: '#profile' },
        { label: 'Lighting', href: '#orders' },
        { label: 'Orbit lamp', current: true },
      ],
    }),
    Pagination({
      currentPage: 2,
      totalPages: 8,
      getPageHref: (page) => `#page-${page}`,
      siblingCount: 1,
    }),
    ResponsiveActionBar({
      summary: 'Profile changes ready',
      status: 'All fields are valid.',
      primaryAction: Button({ label: 'Save profile' }),
    }),
    NavigationMenu({
      id: 'ui-primary-navigation',
      label: 'Primary navigation',
      open: ['ui-shop-navigation'],
      items: [{
        id: 'ui-shop-navigation',
        label: 'Shop',
        accessibleLabel: 'Open Shop navigation',
        href: '#profile',
        children: [{ id: 'ui-orders-navigation', label: 'Orders', href: '#orders' }],
      }],
    }),
    Card({
      attributes: { id: 'profile' },
      title: 'Profile',
      subtitle: 'Stable atoms, molecules, and headless choices',
      actions: Button({ label: 'Save profile' }),
      children: [
        SearchField({
          id: 'ui-example-search',
          label: 'Search products',
          query: searchQuery.value,
          submitLabel: 'Find',
          onQueryChange: (query) => { searchQuery.value = query; },
        }),
        SearchResults({
          id: 'ui-example-results',
          heading: 'Search results',
          groups: [{ id: 'example-products', heading: 'Products', count: 1, children: q.li({ children: q.a({ href: '#cobalt', children: 'Cobalt cable' }) }) }],
        }),
        OneTimePasswordField({
          id: 'ui-example-otp',
          label: 'Example one-time code',
          value: '123456',
          name: 'example-code',
        }),
        PasswordToggleField({
          id: 'ui-example-password',
          label: 'Password',
          value: 'example-password',
          showLabel: 'Show password',
          hideLabel: 'Hide password',
        }),
        Select({
          value: finish.value,
          attributes: { 'aria-label': 'Native finish selector' },
          onChange: (event) => {
            finish.value = (event.currentTarget as HTMLSelectElement).value;
          },
          children: [
            q.option({ value: 'black', children: 'Black' }),
            q.option({ value: 'cobalt', children: 'Cobalt' }),
          ],
        }),
        Textarea({
          value: 'Leave parcels with reception.',
          name: 'delivery-notes',
          rows: 3,
          fullWidth: true,
          attributes: { 'aria-label': 'Delivery notes' },
        }),
        q.label({
          children: [Checkbox({ name: 'updates', checked: true }), ' Product updates'],
        }),
        q.div({
          role: 'group',
          aria: { label: 'Preferred material' },
          children: [
            q.label({ children: [Radio({ name: 'material', value: 'steel', checked: true }), ' Steel'] }),
            q.label({ children: [Radio({ name: 'material', value: 'aluminium' }), ' Aluminium'] }),
          ],
        }),
        q.label({ children: [Switch({ name: 'network' }), ' Allow network access'] }),
        ToggleButton({ pressed: true, label: 'Grid view', variant: 'ghost' }),
        Progress({ value: 72, attributes: { 'aria-label': 'Profile completion' } }),
        Slider({ defaultValue: 40, min: 0, max: 100, step: 5, valueText: '40 percent', attributes: { 'aria-label': 'Notification volume' } }),
        StatusBadge({ tone: 'success', children: 'Profile active' }),
        AspectRatio({
          ratio: 4 / 3,
          attributes: { style: { maxInlineSize: '12rem' } },
          children: q.img({ src: examplePortrait, alt: 'Ada Lovelace profile portrait' }),
        }),
        Avatar({
          src: examplePortrait,
          alt: 'Ada Lovelace',
          status: 'loaded',
          attributes: { loading: 'lazy' },
        }),
        Separator({ decorative: true }),
        ScrollArea({
          label: 'Profile activity',
          attributes: {
            style: {
              '--gluon-scroll-area-max-block-size': '6rem',
              border: '1px solid var(--gluon-color-rule)',
              padding: '0.75rem',
            },
          },
          children: q.div({
            children: [
              q.p({ children: 'Profile created.' }),
              q.p({ children: 'Delivery preference updated.' }),
              q.p({ children: 'Security key registered.' }),
              q.p({ children: 'Profile reviewed.' }),
            ],
          }),
        }),
        ControlField({
          id: 'profile-note',
          label: 'Profile note',
          helper: 'Visible to the account owner.',
          control: (relationships) => Textarea({
            value: 'Prefers email updates.',
            attributes: { id: relationships.controlId, aria: relationships.aria },
          }),
        }),
        ChoiceGroup({
          id: 'profile-visibility',
          legend: 'Profile visibility',
          orientation: 'horizontal',
          children: [
            q.label({ children: [Radio({ name: 'visibility', checked: true }), ' Team'] }),
            q.label({ children: [Radio({ name: 'visibility' }), ' Private'] }),
          ],
        }),
        SegmentedControl({
          label: 'Profile layout',
          value: 'details',
          options: [
            { value: 'details', label: 'Details' },
            { value: 'summary', label: 'Summary' },
          ],
        }),
        Tabs({
          label: 'Profile information',
          value: 'overview',
          items: [
            { id: 'profile-overview', value: 'overview', label: 'Overview', panel: 'Profile overview' },
            { id: 'profile-history', value: 'history', label: 'History', panel: 'Profile history' },
          ],
        }),
        Disclosure({
          id: 'profile-delivery-details',
          summary: 'Delivery details',
          children: 'Tracked delivery in 2–3 working days.',
        }),
        ResponsiveDisclosure({
          id: 'responsive-catalog-filters',
          summary: 'Catalog filters',
          compactBreakpoint: '(max-width: 48rem)',
          compactInitialOpen: false,
          children: 'Availability and finish filters.',
        }),
        Accordion({
          label: 'Account help',
          value: 'delivery',
          items: [
            { id: 'profile-delivery', value: 'delivery', summary: 'Delivery', children: 'Tracked delivery in 2–3 working days.' },
            { id: 'profile-returns', value: 'returns', summary: 'Returns', children: 'Unused objects can be returned within 30 days.' },
          ],
        }),
        InlineNotice({
          tone: 'success',
          title: 'Profile saved',
          children: 'Your public details are up to date.',
        }),
        EmptyState({
          presentation: 'compact',
          heading: 'No archived projects',
          children: 'Completed projects will appear here.',
          action: Button({ label: 'Create project' }),
        }),
        TableRegion({
          id: 'recent-orders',
          label: 'Recent orders',
          summary: 'One recent order.',
          scrollHint: 'Scroll horizontally to review every column.',
          children: q.table({ children: q.tbody({ children: q.tr({ children: [q.th({ scope: 'row', children: 'A-101' }), q.td({ children: 'Ready' })] }) }) }),
        }),
        FormField({ label: 'Name', value: 'Ada Lovelace', helper: 'Shown on receipts' }),
      DatePicker({ id: 'delivery-date-picker', label: 'Delivery date', value: '2026-10-06', min: '2026-10-03', helper: 'Choose a weekday for dispatch.' }),
      DateRangePicker({ id: 'delivery-window', label: 'Delivery window', startValue: '2026-10-06', endValue: '2026-10-08', helper: 'Choose the dispatch window.' }),
      FileUpload({ id: 'product-photo-upload', label: 'Product photos', accept: 'image/*', multiple: true, helper: 'JPEG or PNG, up to five files.' }),
      TimePicker({ id: 'delivery-time', label: 'Delivery time', value: '09:00', min: '08:00', max: '18:00', step: '900', helper: 'Available from 08:00 to 18:00.' }),
      Field({
        label: 'Reference',
        helper: 'Optional order reference',
        children: Input({ name: 'reference' }),
      }),
      Listbox({
        id: 'finish',
        label: 'Preferred finish',
        value: finish.value,
        onChange: (value) => { finish.value = value; },
        options: [
          { value: 'black', label: 'Black' },
          { value: 'cobalt', label: 'Cobalt' },
          { value: 'natural', label: 'Natural' },
        ],
      }),
      q.p({ children: `Selected finish: ${finish.value}` }),
      CheckoutActions({ total: '$128.00' }),
      QuarkPopover({ id: 'ui-help', children: 'Native popover: Escape closes this surface.' }),
      Tooltip({ id: 'ui-tooltip', trigger: (attributes) => q.button({ ...attributes, children: 'Hover or focus' }), content: 'A concise description.' }),
      HoverCard({ id: 'ui-hover-card', label: 'More context', trigger: (attributes) => q.button({ ...attributes, children: 'More context' }), content: q.p({ children: 'A focusable explanation.' }) }),
        dialogOpen.value
          ? DialogSurface({
              id: 'profile-preferences',
              labelledBy: 'profile-preferences-title',
              title: 'Profile preferences',
              description: 'Update the preferences owned by this profile.',
              controller: dialogController,
              onDismiss: closeDialog,
              overlayAttributes: { class: 'example-overlay' },
              attributes: { class: 'example-dialog' },
              closeAction: Button({
                label: 'Close dialog',
                attributes: { data: { dialogInitialFocus: true } },
                onClick: closeDialog,
              }),
              children: 'Profile preferences remain application-owned.',
            })
          : null,
      ],
    }),
    ToastViewport({ controller: toastController, label: 'Profile notifications' }),
  ],
  footer: 'Keyboard: Tab, Shift+Tab, Arrow keys, Home, End',
})).mount(document.querySelector('#ui-system')!);
