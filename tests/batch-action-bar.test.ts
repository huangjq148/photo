import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BatchActionBar } from "@/components/photos/batch-action-bar";

describe("BatchActionBar", () => {
  it("renders selection summary and destructive actions", () => {
    const html = renderToStaticMarkup(
      createElement(BatchActionBar, {
        selectedCount: 3,
        onClearSelection: () => undefined,
        onDeleteSelected: () => undefined,
      }),
    );

    expect(html).toContain("已选择 3 项");
    expect(html).toContain("取消选择");
    expect(html).toContain("删除选中 (3)");
  });

  it("renders nothing when there is no selection", () => {
    const html = renderToStaticMarkup(
      createElement(BatchActionBar, {
        selectedCount: 0,
        onClearSelection: () => undefined,
        onDeleteSelected: () => undefined,
      }),
    );

    expect(html).toBe("");
  });
});
