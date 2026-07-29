import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PhotoGallerySizeControl } from "@/components/photos/photo-gallery-size-control";

describe("PhotoGallerySizeControl", () => {
  it("offers small medium and large image sizes", () => {
    const html = renderToStaticMarkup(
      createElement(PhotoGallerySizeControl, {
        value: "medium",
        onChange: () => undefined,
      }),
    );

    expect(html).toContain("小");
    expect(html).toContain("中");
    expect(html).toContain("大");
    expect(html).toContain("图片尺寸");
  });

  it("keeps compact size buttons touch friendly on mobile", () => {
    const html = renderToStaticMarkup(
      createElement(PhotoGallerySizeControl, {
        value: "medium",
        compact: true,
        onChange: () => undefined,
      }),
    );

    expect(html).toContain("h-9");
    expect(html).toContain("min-w-10");
    expect(html).toContain("before:-inset-y-1");
  });
});
