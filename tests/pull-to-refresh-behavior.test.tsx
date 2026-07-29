// @vitest-environment jsdom

import React, { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PullToRefresh } from "@/components/layout/pull-to-refresh";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots: Root[] = [];

function dispatchTouch(
  target: HTMLElement,
  type: "touchstart" | "touchmove" | "touchend",
  x?: number,
  y?: number,
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "touches", {
    value: type === "touchend" ? [] : [{ clientX: x, clientY: y }],
  });
  target.dispatchEvent(event);
}

function renderPullToRefresh(onRefresh = vi.fn(async () => undefined)) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const scrollContainerRef = createRef<HTMLDivElement>();
  mountedRoots.push(root);

  act(() => {
    root.render(
      <div ref={scrollContainerRef}>
        <PullToRefresh
          onRefresh={onRefresh}
          scrollContainerRef={scrollContainerRef}
        >
          <main>照片内容</main>
        </PullToRefresh>
      </div>,
    );
  });

  return {
    container,
    gestureTarget: container.querySelector(".relative") as HTMLDivElement,
    onRefresh,
  };
}

afterEach(() => {
  act(() => {
    mountedRoots.splice(0).forEach((root) => root.unmount());
  });
  document.body.innerHTML = "";
});

describe("PullToRefresh", () => {
  it("refreshes after a downward pull passes the threshold", async () => {
    const { container, gestureTarget, onRefresh } = renderPullToRefresh();

    act(() => {
      dispatchTouch(gestureTarget, "touchstart", 100, 100);
      dispatchTouch(gestureTarget, "touchmove", 100, 300);
    });

    expect(container.textContent).toContain("松开刷新");

    await act(async () => {
      dispatchTouch(gestureTarget, "touchend");
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(container.textContent).not.toContain("松开刷新");
  });

  it("ignores a short pull", async () => {
    const { gestureTarget, onRefresh } = renderPullToRefresh();

    act(() => {
      dispatchTouch(gestureTarget, "touchstart", 100, 100);
      dispatchTouch(gestureTarget, "touchmove", 100, 150);
    });
    await act(async () => {
      dispatchTouch(gestureTarget, "touchend");
    });

    expect(onRefresh).not.toHaveBeenCalled();
  });
});
