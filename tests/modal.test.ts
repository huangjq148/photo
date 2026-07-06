import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Modal } from "@/components/ui/modal";

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
});
