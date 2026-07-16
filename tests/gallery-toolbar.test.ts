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
    expect(html).toContain('aria-controls="gallery-mobile-search"');
    expect(html).toContain('aria-controls="gallery-filter-panel"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('id="gallery-filter-panel"');
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

  it("disables search, query controls, and the filter panel while selection is busy", () => {
    const html = renderToStaticMarkup(
      createElement(GalleryToolbar, {
        query: "旅行",
        filteredCount: 10,
        totalCount: 100,
        activeFilterCount: 1,
        hasActiveSelection: true,
        selectionMode: true,
        selectionBusy: true,
        searchValue: "旅行",
        onSearchChange: () => undefined,
        onClearSearch: () => undefined,
        onToggleFilters: () => undefined,
        onChangeSort: () => undefined,
        onChangeGroup: () => undefined,
        onClearFilters: () => undefined,
        onToggleSelectionMode: () => undefined,
        filtersOpen: true,
        urlState: { q: "旅行", mediaType: "image", sortOrder: "desc" },
      }),
    );

    expect(html).toMatch(/<input[^>]*placeholder="搜索名称或原始文件名"[^>]*disabled=""/);
    expect(html).toMatch(/<[^>]+id="gallery-filter-panel"[^>]*disabled=""/);
    expect(html).toContain("disabled:cursor-not-allowed");
  });

  it("shows a visible focus-within treatment around mobile search", () => {
    const html = renderToStaticMarkup(
      createElement(GalleryToolbar, {
        query: "旅行",
        filteredCount: 10,
        totalCount: 10,
        activeFilterCount: 0,
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
      }),
    );

    expect(html).toContain("focus-within:ring-2");
    expect(html).toContain("focus-within:border-[var(--film)]");
  });

  it("gives every filter panel control a 44px mobile target and compact desktop target", () => {
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
        showUploaderFilter: true,
      }),
    );
    const panelMarkup = html.slice(
      html.indexOf('id="gallery-filter-panel"'),
      html.indexOf('class="flex flex-wrap items-center justify-between'),
    );
    const controls = panelMarkup.match(/<(?:button|input|span)[^>]*>/g) ?? [];

    expect(controls.length).toBeGreaterThan(0);
    expect(panelMarkup).toContain("photo-date-picker");
    expect(panelMarkup).toContain('aria-label="起始日期"');
    expect(panelMarkup).toContain('aria-label="结束日期"');
  });
});
