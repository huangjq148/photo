import { describe, expect, it } from "vitest";
import { detectMediaType, validateMediaFile } from "@/lib/media/validation";

describe("media validation", () => {
  it("detects images and videos", () => {
    expect(detectMediaType("image/png")).toBe("image");
    expect(detectMediaType("video/mp4")).toBe("video");
  });

  it("rejects unsupported media", () => {
    expect(() => detectMediaType("application/pdf")).toThrow("不支持的媒体格式");
  });

  it("applies separate image and video limits", () => {
    validateMediaFile({ type: "image/png", size: 20 * 1024 * 1024 }, { maxImageMb: 20, maxVideoMb: 512 });
    validateMediaFile({ type: "video/mp4", size: 512 * 1024 * 1024 }, { maxImageMb: 20, maxVideoMb: 512 });

    expect(() =>
      validateMediaFile({ type: "video/mp4", size: 513 * 1024 * 1024 }, { maxImageMb: 20, maxVideoMb: 512 })
    ).toThrow("视频大小超过512MB限制");
  });
});
