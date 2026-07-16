// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Menu } from "@/components/ui/menu";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots: Root[] = [];
let animationFrameCallbacks: FrameRequestCallback[] = [];

function renderMenu() {
  const container = document.createElement("div");
  container.style.overflow = "hidden";
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.push(root);

  act(() => {
    root.render(
      <Menu
        label="更多操作"
        triggerContent="⋯"
        open
        onOpenChange={() => undefined}
        items={[
          {
            key: "share",
            label: "分享",
            onSelect: () => undefined,
          },
        ]}
      />,
    );
  });

  return { container };
}

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    animationFrameCallbacks.push(callback);
    return 1;
  });

  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.getAttribute("aria-label") === "更多操作") {
      return {
        x: 400,
        y: 100,
        top: 100,
        left: 400,
        bottom: 144,
        right: 444,
        width: 44,
        height: 44,
        toJSON: () => undefined,
      } as DOMRect;
    }

    if (this.getAttribute("role") === "menu") {
      return {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        bottom: 0,
        right: 180,
        width: 180,
        height: 120,
        toJSON: () => undefined,
      } as DOMRect;
    }

    return {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      width: 0,
      height: 0,
      toJSON: () => undefined,
    } as DOMRect;
  });
});

afterEach(() => {
  act(() => {
    mountedRoots.splice(0).forEach((root) => root.unmount());
  });
  document.body.innerHTML = "";
  animationFrameCallbacks = [];
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Menu portal behavior", () => {
  it("renders the open menu in document.body instead of the clipped container", () => {
    const { container } = renderMenu();

    act(() => {
      animationFrameCallbacks.splice(0).forEach((callback) => callback(0));
    });

    const portalMenu = document.body.querySelector('[role="menu"]') as HTMLElement;

    expect(portalMenu).not.toBeNull();
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(portalMenu.textContent).toContain("分享");
    expect(portalMenu.style.position).toBe("fixed");
    expect(portalMenu.style.top).not.toBe("");
    expect(portalMenu.style.left).not.toBe("");
  });
});
