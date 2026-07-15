import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GallerySkeleton } from "@/components/photos/photo-gallery";

describe("GallerySkeleton", () => {
  it("uses a compact mobile toolbar placeholder and preserves the desktop shape", () => {
    const html = renderToStaticMarkup(createElement(GallerySkeleton, { photoSize: "medium" }));

    expect(html).toContain("sm:hidden");
    expect(html).toContain("h-11");
    expect(html).toContain("hidden sm:block");
  });
});
