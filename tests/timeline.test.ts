import { describe, expect, it } from "vitest";
import {
  decodeTimelineCursor,
  encodeTimelineCursor,
  formatTimelineGroupLabel,
  groupTimelinePhotos,
  type TimelinePhotoItem,
} from "@/lib/media/timeline";

describe("timeline helpers", () => {
  it("round-trips cursor payloads", () => {
    const cursor = {
      effectiveAt: "2026-07-12T08:00:00.000Z",
      id: "11111111-1111-4111-8111-111111111111",
    };

    expect(decodeTimelineCursor(encodeTimelineCursor(cursor))).toEqual(cursor);
  });

  it("groups items by day, month, and year in descending order", () => {
    const items: TimelinePhotoItem[] = [
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
        height: 80,
        takenAt: "2026-07-10T08:00:00.000Z",
        uploadedAt: "2026-07-10T09:00:00.000Z",
        effectiveAt: "2026-07-10T08:00:00.000Z",
        isFavorited: false,
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
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
        height: 80,
        takenAt: null,
        uploadedAt: "2026-07-12T08:00:00.000Z",
        effectiveAt: "2026-07-12T08:00:00.000Z",
        isFavorited: true,
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        albumId: "album-c",
        albumName: "C",
        displayName: null,
        originalName: "c.jpg",
        thumbnailUrl: "/c-thumb",
        previewUrl: "/c-preview",
        originalUrl: "/c-original",
        mimeType: "image/jpeg",
        mediaType: "image",
        duration: null,
        width: 100,
        height: 80,
        takenAt: "2026-07-10T08:00:00.000Z",
        uploadedAt: "2026-07-10T10:00:00.000Z",
        effectiveAt: "2026-07-10T08:00:00.000Z",
        isFavorited: false,
      },
    ];

    const dayGroups = groupTimelinePhotos(items, "day");
    expect(Array.from(dayGroups.keys())).toEqual(["2026年7月12日", "2026年7月10日"]);
    expect(dayGroups.get("2026年7月10日")?.map((item) => item.id)).toEqual([
      "22222222-2222-4222-8222-222222222222",
      "11111111-1111-4111-8111-111111111111",
    ]);

    const monthGroups = groupTimelinePhotos(items, "month");
    expect(Array.from(monthGroups.keys())).toEqual(["2026年7月"]);

    const yearGroups = groupTimelinePhotos(items, "year");
    expect(Array.from(yearGroups.keys())).toEqual(["2026年"]);

    expect(formatTimelineGroupLabel(new Date("2026-07-12T08:00:00.000Z"), "day")).toBe("2026年7月12日");
  });
});
