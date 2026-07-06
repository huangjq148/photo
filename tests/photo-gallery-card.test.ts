import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PhotoGalleryCard } from "@/components/photos/photo-gallery-card";

describe("PhotoGalleryCard", () => {
  it("shows the photo first and moves actions behind a hover menu", () => {
    const html = renderToStaticMarkup(
      createElement(PhotoGalleryCard, {
        photo: {
          id: "photo-1",
          originalName: "family.jpg",
          thumbnailUrl: "/thumb.jpg",
          previewUrl: "/preview.jpg",
          mimeType: "image/jpeg",
          width: 1200,
          height: 900,
          takenAt: "2026-01-01T00:00:00.000Z",
          uploadedAt: "2026-01-01T00:00:00.000Z",
        },
        selected: false,
        waterfall: false,
        showTakenAt: false,
        onSelect: () => undefined,
        onFavorite: () => undefined,
        onDelete: () => undefined,
        onShare: () => undefined,
        onSetCover: () => undefined,
      }),
    );

    expect(html).toContain("<img");
    expect(html).toContain("family.jpg");
    expect(html).toContain("更多操作");
    expect(html).toContain("group-hover:opacity-100");
    expect(html).not.toContain("1200 × 900");
  });
});
