import { describe, expect, it } from "vitest";
import { groupDuplicateMediaItems, type DuplicateMediaItem } from "@/lib/media/duplicates";

describe("duplicate media helpers", () => {
  it("groups items by checksum and suggests the earliest item as keeper", () => {
    const items: DuplicateMediaItem[] = [
      {
        id: "33333333-3333-4333-8333-333333333333",
        albumId: "album-a",
        albumName: "A",
        displayName: null,
        originalName: "c.jpg",
        thumbnailUrl: "/c-thumb",
        previewUrl: "/c-preview",
        originalUrl: "/c-original",
        mimeType: "image/jpeg",
        mediaType: "image",
        duration: null,
        width: 100,
        height: 100,
        sizeBytes: "300",
        checksum: "checksum-a",
        takenAt: "2026-07-12T10:00:00.000Z",
        uploadedAt: "2026-07-12T10:00:00.000Z",
        isFavorited: false,
        canDelete: true,
      },
      {
        id: "11111111-1111-4111-8111-111111111111",
        albumId: "album-a",
        albumName: "A",
        displayName: null,
        originalName: "a.jpg",
        thumbnailUrl: "/a-thumb",
        previewUrl: "/a-preview",
        originalUrl: "/a-original",
        mimeType: "image/jpeg",
        mediaType: "image",
        duration: null,
        width: 100,
        height: 100,
        sizeBytes: "100",
        checksum: "checksum-a",
        takenAt: "2026-07-10T08:00:00.000Z",
        uploadedAt: "2026-07-10T09:00:00.000Z",
        isFavorited: false,
        canDelete: true,
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        albumId: "album-b",
        albumName: "B",
        displayName: null,
        originalName: "b.jpg",
        thumbnailUrl: "/b-thumb",
        previewUrl: "/b-preview",
        originalUrl: "/b-original",
        mimeType: "image/jpeg",
        mediaType: "image",
        duration: null,
        width: 100,
        height: 100,
        sizeBytes: "200",
        checksum: "checksum-b",
        takenAt: "2026-07-11T08:00:00.000Z",
        uploadedAt: "2026-07-11T08:00:00.000Z",
        isFavorited: false,
        canDelete: true,
      },
    ];

    const groups = groupDuplicateMediaItems(items);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.checksum).toBe("checksum-a");
    expect(groups[0]?.items.map((item) => item.id)).toEqual([
      "33333333-3333-4333-8333-333333333333",
      "11111111-1111-4111-8111-111111111111",
    ]);
    expect(groups[0]?.suggestedKeeperId).toBe("11111111-1111-4111-8111-111111111111");
    expect(groups[0]?.totalSizeBytes).toBe("400");
    expect(groups[0]?.potentialSaveBytes).toBe("300");
  });
});
