import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MediaUploadForm } from "@/components/media/media-upload-form";

describe("MediaUploadForm", () => {
  it("accepts image and video files", () => {
    const html = renderToStaticMarkup(createElement(MediaUploadForm, { albumId: "album-1" }));
    expect(html).toContain("image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm");
  });
});
