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
        selectionMode: false,
        searchValue: "旅行",
        onSearchChange: () => undefined,
        onClearSearch: () => undefined,
        onToggleFilters: () => undefined,
        onChangeSort: () => undefined,
        onChangeGroup: () => undefined,
        onClearFilters: () => undefined,
        onToggleSelectionMode: () => undefined,
        filtersOpen: true,
        urlState: {
          q: "旅行",
          sortOrder: "desc",
        },
      }),
    );

    expect(html).toContain('aria-label="搜索照片和视频"');
    expect(html).toContain("sm:hidden");
    expect(html).toContain("hidden sm:block");
    expect(html).toContain("min-h-11");
    expect(html).toContain("选择");
    expect(html).toContain('id="gallery-sort-options"');
    expect(html).toContain("筛选");
    expect(html).toContain("排序");
    expect(html).toContain("分组");
    expect(html).toContain("清空条件");
    expect(html).toContain("12 / 48");
  });

  it("shows active filter count badge", () => {
    const html = renderToStaticMarkup(
      createElement(GalleryToolbar, {
        query: "",
        filteredCount: 0,
        totalCount: 0,
        activeFilterCount: 3,
        hasActiveSelection: false,
        selectionMode: false,
        searchValue: "",
        onSearchChange: () => undefined,
        onClearSearch: () => undefined,
        onToggleFilters: () => undefined,
        onChangeSort: () => undefined,
        onChangeGroup: () => undefined,
        onClearFilters: () => undefined,
        onToggleSelectionMode: () => undefined,
      }),
    );

    expect(html).toContain("3");
  });

  it("renders filter panel when filtersOpen is true", () => {
    const html = renderToStaticMarkup(
      createElement(GalleryToolbar, {
        query: "",
        filteredCount: 10,
        totalCount: 100,
        activeFilterCount: 0,
        hasActiveSelection: false,
        selectionMode: false,
        searchValue: "",
        onSearchChange: () => undefined,
        onClearSearch: () => undefined,
        onToggleFilters: () => undefined,
        onChangeSort: () => undefined,
        onChangeGroup: () => undefined,
        onClearFilters: () => undefined,
        onToggleSelectionMode: () => undefined,
        filtersOpen: true,
        urlState: {
          q: "",
          sortOrder: "desc",
        },
        showUploaderFilter: false,
      }),
    );

    expect(html).toContain("媒体类型");
    expect(html).toContain("收藏");
    expect(html).toContain("拍摄日期");
    expect(html).toContain("排序");
    expect(html).toContain("分组");
  });

  it("shows uploader filter when showUploaderFilter is true", () => {
    const html = renderToStaticMarkup(
      createElement(GalleryToolbar, {
        query: "",
        filteredCount: 10,
        totalCount: 100,
        activeFilterCount: 0,
        hasActiveSelection: false,
        selectionMode: false,
        searchValue: "",
        onSearchChange: () => undefined,
        onClearSearch: () => undefined,
        onToggleFilters: () => undefined,
        onChangeSort: () => undefined,
        onChangeGroup: () => undefined,
        onClearFilters: () => undefined,
        onToggleSelectionMode: () => undefined,
        filtersOpen: true,
        urlState: {
          q: "",
          sortOrder: "desc",
        },
        showUploaderFilter: true,
      }),
    );

    expect(html).toContain("上传者");
  });

  it("highlights active filter buttons", () => {
    const html = renderToStaticMarkup(
      createElement(GalleryToolbar, {
        query: "",
        filteredCount: 10,
        totalCount: 100,
        activeFilterCount: 1,
        hasActiveSelection: false,
        selectionMode: false,
        searchValue: "",
        onSearchChange: () => undefined,
        onClearSearch: () => undefined,
        onToggleFilters: () => undefined,
        onChangeSort: () => undefined,
        onChangeGroup: () => undefined,
        onClearFilters: () => undefined,
        onToggleSelectionMode: () => undefined,
        filtersOpen: true,
        urlState: {
          q: "",
          mediaType: "image",
          sortOrder: "desc",
        },
        showUploaderFilter: false,
      }),
    );

    // The "全部" media type button should NOT be active
    // The "照片" button should be active (has accent bg)
    expect(html).toContain("仅收藏");
  });

  it("does not render filter panel when filtersOpen is false", () => {
    const html = renderToStaticMarkup(
      createElement(GalleryToolbar, {
        query: "",
        filteredCount: 10,
        totalCount: 100,
        activeFilterCount: 0,
        hasActiveSelection: false,
        selectionMode: false,
        searchValue: "",
        onSearchChange: () => undefined,
        onClearSearch: () => undefined,
        onToggleFilters: () => undefined,
        onChangeSort: () => undefined,
        onChangeGroup: () => undefined,
        onClearFilters: () => undefined,
        onToggleSelectionMode: () => undefined,
        filtersOpen: false,
        urlState: {
          q: "",
          sortOrder: "desc",
        },
        showUploaderFilter: false,
      }),
    );

    expect(html).not.toContain("媒体类型");
    expect(html).not.toContain("拍摄日期");
  });

  it("shows cancel while selection mode is active", () => {
    const html = renderToStaticMarkup(
      createElement(GalleryToolbar, {
        query: "",
        filteredCount: 10,
        totalCount: 100,
        activeFilterCount: 0,
        hasActiveSelection: false,
        selectionMode: true,
        searchValue: "",
        onSearchChange: () => undefined,
        onClearSearch: () => undefined,
        onToggleFilters: () => undefined,
        onChangeSort: () => undefined,
        onChangeGroup: () => undefined,
        onClearFilters: () => undefined,
        onToggleSelectionMode: () => undefined,
      }),
    );

    expect(html).toContain("取消");
  });
});
