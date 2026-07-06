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
});
