import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MemoryImageViewer } from "@/components/memory/memory-image-viewer";
import { buildMediaViewerNavigationItems } from "@/components/photos/image-viewer-navigation";
import type { MemoryPhotoItem } from "@/lib/memory/dashboard";

const photo: MemoryPhotoItem = {
  id: "memory-1",
  albumId: "album-1",
  albumName: "家庭相册",
  displayName: "夏日回忆",
  originalName: "summer.jpg",
  thumbnailUrl: "/thumb/summer.jpg",
  previewUrl: "/preview/summer.jpg",
  originalUrl: "/original/summer.jpg",
  mimeType: "image/jpeg",
  mediaType: "image",
  takenAt: "2025-07-11T10:00:00.000Z",
  uploadedAt: "2025-07-11T10:00:00.000Z",
  effectiveAt: "2025-07-11T10:00:00.000Z",
  isFavorited: false,
};

describe("MemoryImageViewer", () => {
  it("opens the shared image viewer instead of rendering an original-file link", () => {
    const html = renderToStaticMarkup(
      createElement(MemoryImageViewer, {
        photo,
        navigationItems: buildMediaViewerNavigationItems([photo]),
        className: "aspect-[4/3]",
        imgClassName: "object-cover",
      }),
    );

    expect(html).toContain("<button");
    expect(html).toContain('aria-label="查看图片：夏日回忆"');
    expect(html).not.toContain("<a ");
    expect(html).not.toContain('href="/original/summer.jpg"');
  });
});
