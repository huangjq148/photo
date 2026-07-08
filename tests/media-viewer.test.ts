import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MediaViewer } from "@/components/media/media-viewer";

describe("MediaViewer", () => {
  it("can render an image without a nested image viewer trigger", () => {
    const html = renderToStaticMarkup(
      createElement(MediaViewer, {
        id: "m1",
        mediaType: "image",
        previewUrl: "/preview.jpg",
        posterUrl: null,
        playbackUrl: null,
        originalName: "photo.jpg",
        width: 1200,
        height: 800,
        durationSeconds: null,
        processingStatus: "normal",
        interactiveImagePreview: false,
      }),
    );

    expect(html).toContain("<img");
    expect(html).not.toContain("查看图片：photo.jpg");
  });
});
