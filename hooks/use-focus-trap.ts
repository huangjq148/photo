"use client";

import type { KeyboardEvent as ReactKeyboardEvent } from "react";

export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

type FocusableLike = {
  focus: () => void;
};

export function getFocusableElements(container: ParentNode | null) {
  if (!container || !("querySelectorAll" in container)) {
    return [];
  }

  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute("disabled") && element.tabIndex >= 0,
  );
}

export function getNextFocusIndex(currentIndex: number, shiftKey: boolean, count: number) {
  if (count <= 0) {
    return -1;
  }

  if (shiftKey) {
    return currentIndex <= 0 ? count - 1 : currentIndex - 1;
  }

  return currentIndex >= count - 1 ? 0 : currentIndex + 1;
}

export function createModalFocusController(count: number) {
  let activeIndex = count > 0 ? 0 : -1;
  let open = false;

  return {
    open() {
      open = true;
      activeIndex = count > 0 ? 0 : -1;
    },
    close() {
      open = false;
      activeIndex = count > 0 ? 0 : -1;
    },
    handleKeyDown(key: string, shiftKey = false) {
      if (!open) {
        return activeIndex;
      }

      if (key === "Tab") {
        activeIndex = getNextFocusIndex(activeIndex, shiftKey, count);
      }

      if (key === "Escape") {
        open = false;
      }

      return activeIndex;
    },
    get activeIndex() {
      return activeIndex;
    },
    get isOpen() {
      return open;
    },
  };
}

export function focusElement(element: FocusableLike | null | undefined) {
  element?.focus();
}

export function handleModalKeyDown(
  event: Pick<ReactKeyboardEvent<HTMLElement>, "key" | "shiftKey" | "preventDefault" | "stopPropagation">,
  focusables: HTMLElement[],
  currentIndex: number,
  onClose: () => void,
  container?: HTMLElement | null,
) {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    onClose();
    return currentIndex;
  }

  if (event.key !== "Tab") {
    return currentIndex;
  }

  event.preventDefault();
  event.stopPropagation();

  if (focusables.length === 0) {
    container?.focus();
    return -1;
  }

  const nextIndex = getNextFocusIndex(currentIndex, event.shiftKey, focusables.length);
  focusElement(focusables[nextIndex] ?? container);
  return nextIndex;
}
