import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MessageViewport } from "@/components/ui/message";

describe("MessageViewport", () => {
  it("renders antd-like success and error messages", () => {
    const html = renderToStaticMarkup(
      createElement(MessageViewport, {
        messages: [
          { id: "1", type: "success", content: "添加成功" },
          { id: "2", type: "error", content: "添加失败" },
        ],
      }),
    );

    expect(html).toContain("添加成功");
    expect(html).toContain("添加失败");
    expect(html).toContain("fixed right-5 top-5");
  });
});
