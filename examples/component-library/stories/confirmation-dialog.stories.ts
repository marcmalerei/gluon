import type { Meta, StoryObj } from "@gluonjs/gluon-components-vite";
import { Button } from "@gluonjs/atoms";
import { html } from "@gluonjs/core";
import {
  ConfirmationDialog,
  createConfirmationDialogController,
} from "@gluonjs/organisms";

interface ConfirmationDialogStoryArgs {
  readonly title: string;
  readonly description: string;
  readonly open: boolean;
  readonly busy: boolean;
  readonly disabled: boolean;
  readonly destructive: boolean;
  readonly dismissOnBackdrop: boolean;
  readonly customTheme: boolean;
}

const meta = {
  title: "Component library/ConfirmationDialog",
  render: (args) => {
    const controller = createConfirmationDialogController({
      initialFocus: "[data-confirm-primary]",
    });
    const unavailable = args.busy || args.disabled;
    return html`<section
      style="max-inline-size: 32rem; padding: 1rem; font: 16px/1.5 system-ui, sans-serif;"
    >
      ${Button({
        label: "Open confirmation",
        variant: "secondary",
        onClick: (event) => controller.show(event.currentTarget as HTMLElement),
      })}
      ${ConfirmationDialog({
        id: "storybook-confirmation",
        title: args.title,
        description: args.description,
        safeAction: Button({
          label: "Cancel",
          disabled: unavailable,
          variant: "secondary",
          onClick: () => controller.close("cancel"),
        }),
        primaryAction: Button({
          label: args.destructive ? "Delete" : "Confirm",
          disabled: unavailable,
          attributes: { data: { confirmPrimary: true } },
          onClick: () => controller.close("confirm"),
        }),
        open: args.open,
        destructive: args.destructive,
        busy: args.busy,
        disabled: args.disabled,
        dismissOnBackdrop: args.dismissOnBackdrop,
        status: args.busy ? "Working…" : undefined,
        controller,
        attributes: args.customTheme
          ? {
              style: {
                "--gluon-confirmation-dialog-surface": "#fff8df",
                "--gluon-confirmation-dialog-color": "#211a00",
                "--gluon-confirmation-dialog-radius": "1.25rem",
                "--gluon-confirmation-dialog-action-gap": "1rem",
              },
            }
          : undefined,
      })}
    </section>`;
  },
  args: {
    title: "Confirm this action?",
    description:
      "The caller owns the mutation and decides what each action does without changing product state.",
    open: false,
    busy: false,
    disabled: false,
    destructive: false,
    dismissOnBackdrop: false,
    customTheme: false,
  },
  argTypes: {
    title: { control: "text" },
    description: { control: "text" },
    open: { control: "boolean" },
    busy: { control: "boolean" },
    disabled: { control: "boolean" },
    destructive: { control: "boolean" },
    dismissOnBackdrop: { control: "boolean" },
    customTheme: { control: "boolean" },
  },
} satisfies Meta<ConfirmationDialogStoryArgs>;

export default meta;
type Story = StoryObj<ConfirmationDialogStoryArgs>;
export const Closed: Story = {};
export const Open: Story = { args: { open: true } };
export const Busy: Story = { args: { open: true, busy: true } };
export const Disabled: Story = {
  args: { open: true, disabled: true },
};
export const Destructive: Story = {
  args: { open: true, destructive: true },
};
export const LongCopy: Story = {
  args: {
    open: true,
    title: "Delete the complete customer project and all associated exports?",
    description:
      "This deliberately long explanation verifies readable reflow without moving caller-owned decisions, mutation, routing, or product copy into the organism.",
    destructive: true,
  },
};
export const Mobile: Story = {
  args: {
    open: true,
    title: "Remove this saved address?",
    description:
      "The action layout remains operable at 320 pixels and 200 percent text zoom.",
    destructive: true,
  },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
export const ForcedColors: Story = {
  args: { open: true, destructive: true },
};
export const CustomPropertyTheme: Story = {
  args: { open: true, customTheme: true },
};
