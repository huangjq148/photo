import { describe, expect, it } from "vitest";
import { clusterMapPoints, type MapMediaPoint } from "@/lib/media/map";

describe("map helpers", () => {
  it("clusters nearby points by zoom level", () => {
    const points: MapMediaPoint[] = [
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
        latitude: 31.2304,
        longitude: 121.4737,
        takenAt: "2026-07-10T08:00:00.000Z",
        uploadedAt: "2026-07-10T08:00:00.000Z",
        locationHidden: false,
        isFavorited: false,
        canEditLocation: true,
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        albumId: "album-a",
        albumName: "A",
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
        latitude: 34.8,
        longitude: 123.9,
        takenAt: "2026-07-10T09:00:00.000Z",
        uploadedAt: "2026-07-10T09:00:00.000Z",
        locationHidden: false,
        isFavorited: false,
        canEditLocation: true,
      },
    ];

    const lowZoom = clusterMapPoints(points, 1);
    expect(lowZoom).toHaveLength(1);
    expect(lowZoom[0]?.count).toBe(2);

    const highZoom = clusterMapPoints(points, 3);
    expect(highZoom).toHaveLength(2);
    expect(highZoom.map((cluster) => cluster.count)).toEqual([1, 1]);
  });
});
