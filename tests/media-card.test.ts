import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MediaCard } from "@/components/media/media-card";

describe("MediaCard", () => {
  it("renders video duration and processing state", () => {
    const html = renderToStaticMarkup(
      createElement(MediaCard, {
        media: {
          id: "v1",
          mediaType: "video",
          originalName: "clip.mp4",
          thumbnailUrl: "",
          posterUrl: "/poster.jpg",
          previewUrl: "",
          playbackUrl: null,
          mimeType: "video/mp4",
          width: 1920,
          height: 1080,
          durationSeconds: 65,
          processingStatus: "processing",
          takenAt: null,
          uploadedAt: new Date().toISOString(),
        },
      })
    );

    expect(html).toContain("01:05");
    expect(html).toContain("处理中");
  });
});
