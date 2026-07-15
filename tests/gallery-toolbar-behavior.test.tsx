// @vitest-environment jsdom

import React, { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GalleryToolbar } from "@/components/photos/gallery-toolbar";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots: Root[] = [];
let animationFrameCallbacks: FrameRequestCallback[] = [];

function ToolbarHarness({ onToggleSelectionMode = vi.fn() } = {}) {
  const [searchValue, setSearchValue] = useState("");

  return (
    <GalleryToolbar
      query={searchValue}
      searchValue={searchValue}
      filteredCount={10}
      totalCount={10}
      activeFilterCount={0}
      hasActiveSelection={false}
      selectionMode={false}
      onSearchChange={setSearchValue}
      onClearSearch={() => setSearchValue("")}
      onToggleFilters={() => undefined}
      onChangeSort={() => undefined}
      onChangeGroup={() => undefined}
      onClearFilters={() => undefined}
      onToggleSelectionMode={onToggleSelectionMode}
    />
  );
}

function renderToolbar(onToggleSelectionMode = vi.fn()) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.push(root);

  act(() => {
    root.render(<ToolbarHarness onToggleSelectionMode={onToggleSelectionMode} />);
  });

  return { container, onToggleSelectionMode };
}

function openMobileSearch(container: HTMLElement) {
  const trigger = container.querySelector(
    'button[aria-label="搜索照片和视频"]',
  ) as HTMLButtonElement;

  act(() => {
    trigger.click();
  });
  act(() => {
    animationFrameCallbacks.splice(0).forEach((callback) => callback(0));
  });

  return container.querySelector(
    '[data-testid="gallery-mobile-search"] input',
  ) as HTMLInputElement;
}

function enterSearch(input: HTMLInputElement, value: string) {
  act(() => {
    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    animationFrameCallbacks.push(callback);
    return 1;
  });
});

afterEach(() => {
  act(() => {
    mountedRoots.splice(0).forEach((root) => root.unmount());
  });
  document.body.innerHTML = "";
  animationFrameCallbacks = [];
  vi.unstubAllGlobals();
});

describe("GalleryToolbar mobile behavior", () => {
  it("expands and focuses mobile search from the search button", () => {
    const { container } = renderToolbar();
    const input = openMobileSearch(container);

    expect(input).not.toBeNull();
    expect(document.activeElement).toBe(input);
  });

  it("blurs but keeps nonempty mobile search open on Escape", () => {
    const { container } = renderToolbar();
    const input = openMobileSearch(container);
    enterSearch(input, "旅行");

    act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(document.activeElement).not.toBe(input);
    expect(container.querySelector('[data-testid="gallery-mobile-search"]')).not.toBeNull();
  });

  it("collapses empty mobile search on blur", () => {
    const { container } = renderToolbar();
    const input = openMobileSearch(container);

    act(() => {
      input.blur();
    });

    expect(container.querySelector('[data-testid="gallery-mobile-search"]')).toBeNull();
  });

  it("collapses empty mobile search on Escape without requiring blur", () => {
    const { container } = renderToolbar();
    const input = openMobileSearch(container);

    act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(container.querySelector('[data-testid="gallery-mobile-search"]')).toBeNull();
  });

  it("invokes selection mode toggle once", () => {
    const onToggleSelectionMode = vi.fn();
    const { container } = renderToolbar(onToggleSelectionMode);
    const selectButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "选择",
    ) as HTMLButtonElement;

    act(() => {
      selectButton.click();
    });

    expect(onToggleSelectionMode).toHaveBeenCalledTimes(1);
  });
});
