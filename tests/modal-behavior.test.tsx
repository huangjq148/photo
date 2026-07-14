// @vitest-environment jsdom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Modal } from "@/components/ui/modal";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderIntoDocument(element: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(element);
  });

  return {
    container,
    root,
    cleanup() {
      act(() => {
      root.unmount();
      });
      container.remove();
    },
  };
}

function pressKey(target: Element | Window, key: string, options: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  target.dispatchEvent(event);
  return event;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("Modal keyboard behavior", () => {
  it("focuses the modal body first and keeps Tab navigation inside the dialog", () => {
    const onClose = vi.fn();
    const { container, cleanup } = renderIntoDocument(
      <div>
        <button type="button">page trigger</button>
        <Modal open title="Dialog" onClose={onClose}>
          <button type="button">primary action</button>
        </Modal>
      </div>,
    );

    const body = container.querySelector("[data-modal-body]") as HTMLElement;
    const closeButton = container.querySelector('button[aria-label="关闭弹框"]') as HTMLButtonElement;
    const actionButton = container.querySelector("[data-modal-body] button") as HTMLButtonElement;

    expect(document.activeElement).toBe(body);

    pressKey(body, "Tab");
    expect(document.activeElement).toBe(closeButton);

    pressKey(closeButton, "Tab");
    expect(document.activeElement).toBe(actionButton);

    pressKey(actionButton, "Tab");
    expect(document.activeElement).toBe(closeButton);

    cleanup();
  });

  it("restores focus to the trigger when the modal closes", () => {
    function Harness() {
      const [open, setOpen] = useState(true);

      return (
        <div>
          <button type="button">open trigger</button>
          <Modal open={open} title="Dialog" onClose={() => setOpen(false)}>
            <button type="button">inside</button>
          </Modal>
        </div>
      );
    }

    const { container, cleanup } = renderIntoDocument(<Harness />);
    const trigger = container.querySelector("button") as HTMLButtonElement;
    const closeButton = container.querySelector('button[aria-label="关闭弹框"]') as HTMLButtonElement;

    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    act(() => {
      closeButton.click();
    });

    expect(document.activeElement).toBe(trigger);

    cleanup();
  });

  it("closes only the topmost modal on Escape", () => {
    const firstClose = vi.fn();
    const secondClose = vi.fn();

    const { container, cleanup } = renderIntoDocument(
      <div>
        <Modal open title="First" onClose={firstClose}>
          <button type="button">first body</button>
        </Modal>
        <Modal open title="Second" onClose={secondClose}>
          <button type="button">second body</button>
        </Modal>
      </div>,
    );

    const topmostBody = container.querySelectorAll("[data-modal-body]")[1] as HTMLElement;

    pressKey(topmostBody, "Escape");

    expect(firstClose).not.toHaveBeenCalled();
    expect(secondClose).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it("closes when the backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container, cleanup } = renderIntoDocument(
      <Modal open title="Dialog" onClose={onClose}>
        <button type="button">inside</button>
      </Modal>,
    );

    const backdrop = container.firstElementChild as HTMLElement;
    backdrop.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));

    expect(onClose).toHaveBeenCalledTimes(1);

    cleanup();
  });
});
