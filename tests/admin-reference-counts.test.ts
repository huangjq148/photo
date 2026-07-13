import { describe, expect, it } from "vitest";
import { buildAdminFileReferenceCountMap, buildAdminPhotoReferenceCountMap, resolveAdminFileRelativePaths } from "@/lib/admin/reference-counts";

describe("admin reference counts", () => {
  it("counts direct image references from albums, favorites, and shares", () => {
    const counts = buildAdminPhotoReferenceCountMap({
      coverPhotoIds: ["media-1"],
      albumPhotoIds: ["media-1", "media-1", "media-2"],
      favoritePhotoIds: ["media-2"],
      sharePhotoIds: ["media-1", "media-3"],
    });

    expect(counts.get("media-1")).toBe(4);
    expect(counts.get("media-2")).toBe(2);
    expect(counts.get("media-3")).toBe(1);
  });

  it("maps local media fields to data-relative file paths", () => {
    const files = resolveAdminFileRelativePaths({
      storage_path: "abc123.jpg",
      media_type: "image",
      original_url: "/api/files/originals/abc123.jpg",
      preview_url: "/api/files/previews/abc123.jpg",
      thumbnail_url: "/api/files/thumbnails/abc123.jpg",
    } as never);

    expect(files).toEqual([
      "storage/originals/abc123.jpg",
      "storage/originals/abc123.jpg",
      "storage/previews/abc123.jpg",
      "storage/thumbnails/abc123.jpg",
    ]);
  });

  it("counts file references by normalized relative path", () => {
    const counts = buildAdminFileReferenceCountMap([
      {
        storage_path: "abc123.jpg",
        media_type: "image",
        original_url: "/api/files/originals/abc123.jpg",
        preview_url: "/api/files/previews/abc123.jpg",
        thumbnail_url: "/api/files/thumbnails/abc123.jpg",
      },
      {
        storage_path: "abc123.jpg",
        media_type: "image",
        original_url: "/api/files/originals/abc123.jpg",
        preview_url: "/api/files/previews/abc123.jpg",
        thumbnail_url: "/api/files/thumbnails/abc123.jpg",
      },
    ] as never);

    expect(counts.get("storage/originals/abc123.jpg")).toBe(2);
    expect(counts.get("storage/previews/abc123.jpg")).toBe(2);
    expect(counts.get("storage/thumbnails/abc123.jpg")).toBe(2);
  });
});
