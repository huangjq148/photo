import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MapFilterMenu } from "@/components/photos/map-gallery";

describe("MapFilterMenu", () => {
  it("uses the styled accessible menu trigger instead of a native select", () => {
    const html = renderToStaticMarkup(
      createElement(MapFilterMenu, {
        label: "筛选媒体类型",
        value: "image",
        options: [
          { value: "all", label: "全部媒体" },
          { value: "image", label: "仅图片" },
          { value: "video", label: "仅视频" },
        ],
        onChange: () => undefined,
      }),
    );

    expect(html).toContain('aria-label="筛选媒体类型"');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain("仅图片");
    expect(html).toContain("map-filter-trigger");
    expect(html).not.toContain("<select");
  });
});
