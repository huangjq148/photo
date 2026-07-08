import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MediaGrid } from "@/components/media/media-grid";

describe("MediaGrid", () => {
  it("renders passive thumbnails because the grid owns the preview modal", () => {
    const html = renderToStaticMarkup(
      createElement(MediaGrid, {
        groups: [
          {
            label: "今天",
            items: [
              {
                id: "m1",
                mediaType: "image",
                originalName: "photo.jpg",
                thumbnailUrl: "/thumb.jpg",
                posterUrl: null,
                previewUrl: "/preview.jpg",
                playbackUrl: null,
                mimeType: "image/jpeg",
                width: 1200,
                height: 800,
                durationSeconds: null,
                processingStatus: "normal",
                takenAt: null,
                uploadedAt: "2026-01-01T00:00:00.000Z",
              },
            ],
          },
        ],
      }),
    );

    expect(html).toContain("<img");
    expect(html).not.toContain("查看图片：photo.jpg");
  });
});
