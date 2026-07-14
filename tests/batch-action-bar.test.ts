import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BatchActionBar } from "@/components/photos/batch-action-bar";

describe("BatchActionBar", () => {
  it("renders selection summary and batch actions", () => {
    const html = renderToStaticMarkup(
      createElement(BatchActionBar, {
        selectedCount: 3,
        favoriteLabel: "收藏",
        onAddSelected: () => undefined,
        onToggleFavoriteSelected: () => undefined,
        onDeleteSelected: () => undefined,
        onClearSelection: () => undefined,
      }),
    );

    expect(html).toContain("已选择 3 项");
    expect(html).toContain("取消选择");
    expect(html).toContain("添加到相册");
    expect(html).toContain("收藏");
    expect(html).toContain("删除选中 (3)");
    expect(html).toContain("fixed inset-x-4");
  });

  it("renders nothing when there is no selection", () => {
    const html = renderToStaticMarkup(
      createElement(BatchActionBar, {
        selectedCount: 0,
        favoriteLabel: "收藏",
        onAddSelected: () => undefined,
        onToggleFavoriteSelected: () => undefined,
        onDeleteSelected: () => undefined,
        onClearSelection: () => undefined,
      }),
    );

    expect(html).toBe("");
  });
});
