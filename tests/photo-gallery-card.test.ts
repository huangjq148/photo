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
          originalUrl: "/api/files/originals/test.jpg",
          mimeType: "image/jpeg",
          mediaType: "image",
          duration: null,
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

  it("uses the shared media preview trigger for videos", () => {
    const html = renderToStaticMarkup(
      createElement(PhotoGalleryCard, {
        photo: {
          id: "video-1",
          originalName: "clip.mp4",
          thumbnailUrl: "/thumb-video.jpg",
          previewUrl: "/preview-video.jpg",
          originalUrl: "/api/files/originals/clip.mp4",
          mimeType: "video/mp4",
          mediaType: "video",
          duration: 12,
          width: 1920,
          height: 1080,
          takenAt: null,
          uploadedAt: "2026-01-01T00:00:00.000Z",
        },
        selected: false,
        waterfall: false,
        showTakenAt: false,
        navigableItems: [
          {
            id: "video-1",
            mediaType: "video",
            src: "/thumb-video.jpg",
            videoSrc: "/api/files/originals/clip.mp4",
            alt: "clip.mp4",
            title: "clip.mp4",
          },
        ],
        onSelect: () => undefined,
        onFavorite: () => undefined,
        onDelete: () => undefined,
        onShare: () => undefined,
        onSetCover: () => undefined,
      }),
    );

    expect(html).toContain("点击播放视频");
    expect(html).toContain("/thumb-video.jpg");
    expect(html).not.toContain("<video");
  });
});
