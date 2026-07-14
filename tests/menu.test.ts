import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Menu, createMenuController } from "@/components/ui/menu";

describe("menu controller", () => {
  it("opens on Enter, moves with arrows, and closes on Escape while restoring focus", () => {
    const menu = createMenuController(3);

    expect(menu.isOpen).toBe(false);
    expect(menu.activeIndex).toBe(-1);
    expect(menu.focusTarget).toBe("trigger");

    menu.handleTriggerKeyDown("Enter");

    expect(menu.isOpen).toBe(true);
    expect(menu.activeIndex).toBe(0);
    expect(menu.focusTarget).toBe("item");

    menu.handleMenuKeyDown("ArrowDown");
    expect(menu.activeIndex).toBe(1);
    expect(menu.focusTarget).toBe("item");

    menu.handleMenuKeyDown("ArrowUp");
    expect(menu.activeIndex).toBe(0);

    menu.handleMenuKeyDown("Escape");
    expect(menu.isOpen).toBe(false);
    expect(menu.focusTarget).toBe("trigger");
  });
});

describe("Menu", () => {
  it("renders an accessible open menu with touch-sized items", () => {
    const html = renderToStaticMarkup(
      createElement(Menu, {
        label: "更多操作",
        triggerContent: "⋯",
        open: true,
        onOpenChange: () => undefined,
        items: [
          {
            key: "share",
            label: "分享",
            icon: createElement("span", { "aria-hidden": true }, "S"),
            onSelect: () => undefined,
          },
          {
            key: "delete",
            label: "删除",
            icon: createElement("span", { "aria-hidden": true }, "D"),
            tone: "danger",
            onSelect: () => undefined,
          },
        ],
      }),
    );

    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('role="menu"');
    expect(html).toContain('role="menuitem"');
    expect(html).toContain("min-h-11");
    expect(html).toContain("分享");
    expect(html).toContain("删除");
  });
});

