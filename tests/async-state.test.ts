import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AsyncState } from "@/components/ui/async-state";
import { Skeleton } from "@/components/ui/skeleton";

describe("AsyncState", () => {
  it("shows skeletons for an initial load", () => {
    const html = renderToStaticMarkup(
      createElement(
        AsyncState,
        {
          loading: true,
          hasContent: false,
          skeleton: createElement("div", null, createElement(Skeleton, { className: "h-8 w-full" })),
          children: createElement("div", null, "内容"),
        },
      ),
    );

    expect(html).toContain("animate-pulse");
    expect(html).not.toContain("内容");
  });

  it("keeps current content visible during refreshes", () => {
    const html = renderToStaticMarkup(
      createElement(
        AsyncState,
        {
          loading: true,
          hasContent: true,
          skeleton: createElement("div", null, "骨架"),
          children: createElement("div", null, "照片网格"),
        },
      ),
    );

    expect(html).toContain("照片网格");
    expect(html).toContain("正在刷新");
  });

  it("renders a load-more retry notice without removing content", () => {
    const retry = vi.fn();
    const html = renderToStaticMarkup(
      createElement(
        AsyncState,
        {
          loading: false,
          hasContent: true,
          loadMoreError: "加载更多失败",
          onRetryLoadMore: retry,
          skeleton: createElement("div", null, "骨架"),
          children: createElement("div", null, "照片网格"),
        },
      ),
    );

    expect(html).toContain("照片网格");
    expect(html).toContain("加载更多失败");
    expect(html).toContain("重试加载更多");
  });
});
