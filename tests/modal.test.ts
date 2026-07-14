import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Modal } from "@/components/ui/modal";
import { createModalFocusController, getNextFocusIndex } from "@/hooks/use-focus-trap";

describe("Modal", () => {
  it("renders accessible dialog content when open", () => {
    const html = renderToStaticMarkup(
      createElement(
        Modal,
        {
          open: true,
          title: "创建新相册",
          description: "填写名称和描述",
          onClose: () => undefined,
          footer: createElement("button", null, "创建"),
        },
        createElement("input", { "aria-label": "相册名称" }),
      ),
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("创建新相册");
    expect(html).toContain("填写名称和描述");
    expect(html).toContain("相册名称");
    expect(html).toContain("创建");
    expect(html).toContain("关闭弹框");
    expect(html).toContain('tabindex="-1"');
  });

  it("renders nothing when closed", () => {
    const html = renderToStaticMarkup(
      createElement(
        Modal,
        {
          open: false,
          title: "隐藏弹框",
          onClose: () => undefined,
        },
        "隐藏内容",
      ),
    );

    expect(html).toBe("");
  });

  it("loops focus with tab and closes on escape in the shared controller", () => {
    const controller = createModalFocusController(3);

    controller.open();
    expect(controller.activeIndex).toBe(0);

    expect(getNextFocusIndex(0, false, 3)).toBe(1);
    expect(getNextFocusIndex(0, true, 3)).toBe(2);

    controller.handleKeyDown("Tab");
    expect(controller.activeIndex).toBe(1);

    controller.handleKeyDown("Escape");
    expect(controller.isOpen).toBe(false);
  });
});
