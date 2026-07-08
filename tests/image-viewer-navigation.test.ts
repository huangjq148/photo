import { describe, expect, it } from "vitest";
import { buildImageViewerNavigationItems } from "@/components/photos/image-viewer-navigation";

describe("buildImageViewerNavigationItems", () => {
  it("keeps image items only and uses originals for GIF previews", () => {
    const items = buildImageViewerNavigationItems([
      {
        id: "image-1",
        thumbnailUrl: "/thumb/image.jpg",
        previewUrl: "/preview/image.jpg",
        originalUrl: "/original/image.jpg",
        originalName: "image.jpg",
        mimeType: "image/jpeg",
        mediaType: "image",
      },
      {
        id: "video-1",
        thumbnailUrl: "/thumb/video.jpg",
        previewUrl: "/preview/video.jpg",
        originalUrl: "/original/video.mp4",
        originalName: "video.mp4",
        mimeType: "video/mp4",
        mediaType: "video",
      },
      {
        id: "gif-1",
        thumbnailUrl: "/thumb/loop.gif",
        previewUrl: "/preview/loop.jpg",
        originalUrl: "/original/loop.gif",
        originalName: "loop.gif",
        mimeType: "image/gif",
        mediaType: "image",
      },
    ]);

    expect(items).toEqual([
      {
        id: "image-1",
        src: "/thumb/image.jpg",
        previewSrc: "/preview/image.jpg",
        alt: "image.jpg",
        title: "image.jpg",
      },
      {
        id: "gif-1",
        src: "/thumb/loop.gif",
        previewSrc: "/original/loop.gif",
        alt: "loop.gif",
        title: "loop.gif",
      },
    ]);
  });
});
