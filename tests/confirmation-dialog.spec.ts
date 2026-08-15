import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import { Button } from "@gluonjs/atoms";
import { render, unmount } from "@gluonjs/core";
import {
  ConfirmationDialog,
  createConfirmationDialogController,
} from "@gluonjs/organisms";

afterEach(() => {
  document
    .querySelectorAll("dialog[open]")
    .forEach((dialog) => (dialog as HTMLDialogElement).close());
  unmount(document.body);
  document.body.replaceChildren();
  document.adoptedStyleSheets = [];
});

describe("ConfirmationDialog", () => {
  it("preserves modal focus, Escape, direct close, and remount lifecycle", async () => {
    const controller = createConfirmationDialogController({
      initialFocus: "[data-confirm-action]",
    });
    const trigger = document.createElement("button");
    trigger.textContent = "Delete";
    const root = document.createElement("div");
    document.body.append(trigger, root);
    trigger.focus();
    render(
      ConfirmationDialog({
        id: "confirm",
        title: "Delete project?",
        description: "This cannot be undone.",
        safeAction: Button({
          label: "Cancel",
          onClick: () => controller.close("cancel"),
        }),
        primaryAction: Button({
          label: "Delete",
          attributes: { data: { confirmAction: true } },
        }),
        controller,
      }),
      root,
    );
    const dialog = document.querySelector("dialog") as HTMLDialogElement;
    expect(dialog.getAttribute("aria-labelledby")).toBe("confirm-title");
    expect(dialog.getAttribute("aria-describedby")).toBe("confirm-description");
    expect(dialog.querySelector('[role="status"]')).toBeNull();

    controller.show(trigger);
    await nextTask();
    expect(dialog.open).toBe(true);
    expect(dialog.matches(":modal")).toBe(true);
    expect(document.activeElement?.textContent).toContain("Delete");
    await userEvent.keyboard("{Escape}");
    await nextTask();
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(trigger);

    controller.show(trigger);
    await nextTask();
    dialog.close("native-close");
    await nextTask();
    expect(document.activeElement).toBe(trigger);

    controller.show(trigger);
    await nextTask();
    render(
      ConfirmationDialog({
        id: "confirm",
        title: "Delete project?",
        primaryAction: Button({ label: "Delete" }),
        controller,
      }),
      root,
    );
    await nextTask();
    expect(controller.open).toBe(true);
    controller.close();
    expect(document.activeElement).toBe(trigger);
    expect((await axe.run(document.body)).violations).toHaveLength(0);
  });

  it("composes cancel/backdrop listeners and blocks dismissal and actions while unavailable", async () => {
    const controller = createConfirmationDialogController();
    const cancel = vi.fn();
    const backdropClick = vi.fn();
    render(
      ConfirmationDialog({
        id: "busy",
        title: "Remove item",
        safeAction: Button({ label: "Keep item" }),
        primaryAction: Button({ label: "Remove" }),
        destructive: true,
        busy: true,
        disabled: true,
        status: "Removing…",
        dismissOnBackdrop: true,
        controller,
        attributes: {
          "@cancel": { handleEvent: cancel },
          onClick: { handleEvent: backdropClick },
          style: { "--gluon-confirmation-dialog-width": "20rem" },
        },
      }),
      document.body,
    );
    const dialog = document.querySelector("dialog") as HTMLDialogElement;
    controller.show(null);
    await nextTask();
    expect(dialog.hasAttribute("data-destructive")).toBe(true);
    expect(dialog.hasAttribute("data-busy")).toBe(true);
    expect(dialog.hasAttribute("data-disabled")).toBe(true);
    expect(
      dialog
        .querySelector(".gluon-confirmation-dialog-actions")
        ?.getAttribute("aria-disabled"),
    ).toBe("true");
    expect(
      (
        dialog.querySelector(
          ".gluon-confirmation-dialog-actions",
        ) as HTMLElement
      ).inert,
    ).toBe(true);
    expect(dialog.querySelector('[role="status"]')?.textContent).toContain(
      "Removing",
    );
    await userEvent.keyboard("{Escape}");
    expect(cancel).toHaveBeenCalledOnce();
    expect(dialog.open).toBe(true);
    dialog.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(backdropClick).toHaveBeenCalledOnce();
    expect(dialog.open).toBe(true);
    controller.close();

    render(
      ConfirmationDialog({
        id: "dismissible",
        title: "Leave page?",
        primaryAction: Button({ label: "Leave" }),
        dismissOnBackdrop: true,
        controller,
      }),
      document.body,
    );
    controller.show(null);
    await nextTask();
    const dismissible = document.querySelector("dialog") as HTMLDialogElement;
    dismissible.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(dismissible.open).toBe(false);
    expect(dismissible.returnValue).toBe("backdrop");
  });

  it("upgrades controlled open markup to a modal and validates relationship IDs", async () => {
    render(
      ConfirmationDialog({
        id: "controlled",
        title: "Controlled dialog",
        primaryAction: Button({ label: "Continue" }),
        open: true,
      }),
      document.body,
    );
    const dialog = document.querySelector("dialog") as HTMLDialogElement;
    await nextTask();
    expect(dialog.open).toBe(true);
    expect(dialog.matches(":modal")).toBe(true);
    render(
      ConfirmationDialog({
        id: "controlled",
        title: "Controlled dialog",
        primaryAction: Button({ label: "Continue" }),
        open: false,
      }),
      document.body,
    );
    await nextTask();
    expect(dialog.open).toBe(false);
    expect(() =>
      ConfirmationDialog({
        id: " ",
        title: "Invalid",
        primaryAction: "Continue",
      }),
    ).toThrow(/non-empty/);
    expect(() =>
      ConfirmationDialog({
        id: "invalid id",
        title: "Invalid",
        primaryAction: "Continue",
      }),
    ).toThrow(/whitespace/);
  });

  it("covers alternate ref, initial-focus, listener, no-op, and native backdrop paths", async () => {
    const initialFocus = document.createElement("button");
    initialFocus.textContent = "Initial action";
    const standalone = document.createElement("dialog");
    standalone.append(initialFocus);
    document.body.append(standalone);
    const controller = createConfirmationDialogController({ initialFocus });
    const controllerRef = controller.ref;
    if (typeof controllerRef !== "function")
      throw new TypeError("ConfirmationDialog controller ref must be callable.");

    expect(controller.open).toBe(false);
    controller.show();
    controller.close();
    controllerRef(standalone);
    controllerRef(standalone);
    controller.show();
    await nextTask();
    expect(document.activeElement).toBe(initialFocus);
    controller.show();
    controller.close("complete");
    controller.close();
    controllerRef(undefined);
    await nextTask();
    expect(controller.open).toBe(false);

    const dialogRef: { value: HTMLDialogElement | undefined } = {
      value: undefined,
    };
    const cancel = vi.fn();
    render(
      ConfirmationDialog({
        id: "native-backdrop",
        title: "Leave?",
        leading: "Warning",
        primaryAction: Button({ label: "Leave" }),
        open: true,
        dismissOnBackdrop: true,
        attributes: { ref: dialogRef, "@cancel": cancel },
      }),
      document.body,
    );
    await nextTask();
    const dialog = dialogRef.value!;
    expect(dialog.matches(":modal")).toBe(true);
    dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    expect(cancel).toHaveBeenCalledOnce();
    dialog.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(dialog.open).toBe(false);
    expect(dialog.returnValue).toBe("backdrop");
  });

  it("retains an open controller across a replaced dialog ref", async () => {
    const controller = createConfirmationDialogController();
    const controllerRef = controller.ref;
    if (typeof controllerRef !== "function")
      throw new TypeError("ConfirmationDialog controller ref must be callable.");
    const first = document.createElement("dialog");
    const second = document.createElement("dialog");
    document.body.append(first, second);
    controllerRef(first);
    controller.show(null);
    expect(first.open).toBe(true);

    controllerRef(second);
    await nextTask();
    expect(second.matches(":modal")).toBe(true);
    controller.close();
    first.close();
    controllerRef(undefined);
    await nextTask();
  });
});

function nextTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
