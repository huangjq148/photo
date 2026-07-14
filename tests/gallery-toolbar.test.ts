import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GalleryToolbar } from "@/components/photos/gallery-toolbar";

describe("GalleryToolbar", () => {
  it("renders search, filter, sort, group and clear controls together", () => {
    const html = renderToStaticMarkup(
      createElement(GalleryToolbar, {
        query: "旅行",
        filteredCount: 12,
        totalCount: 48,
        activeFilterCount: 2,
        hasActiveSelection: false,
        searchValue: "旅行",
        onSearchChange: () => undefined,
        onClearSearch: () => undefined,
        onToggleFilters: () => undefined,
        onChangeSort: () => undefined,
        onChangeGroup: () => undefined,
        onClearFilters: () => undefined,
      }),
    );

    expect(html).toContain("搜索照片和视频");
    expect(html).toContain("筛选");
    expect(html).toContain("排序");
    expect(html).toContain("分组");
    expect(html).toContain("清空条件");
    expect(html).toContain("12 / 48");
  });
});
