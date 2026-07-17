import { describe, expect, it, vi } from "vitest";
import { groupPhotos } from "@/components/photos/photo-gallery";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => undefined }),
  usePathname: () => "/albums/album-1",
  useSearchParams: () => new URLSearchParams(),
}));

describe("photo gallery grouping", () => {
  const basePhoto = {
    thumbnailUrl: "",
    previewUrl: "",
    originalUrl: "",
    mimeType: "image/jpeg",
    mediaType: "image",
    duration: null,
    width: 100,
    height: 100,
    albumCount: 1,
    isFavorited: false,
    canEditName: false,
    locationHidden: false,
  } as const;

  it("keeps group order by date while respecting the active sort within each group", () => {
    const photos = [
      {
        ...basePhoto,
        id: "photo-1",
        originalName: "zebra.jpg",
        displayName: null,
        size: 200,
        takenAt: "2026-07-10T08:30:00.000Z",
        uploadedAt: "2026-07-10T08:30:00.000Z",
      },
      {
        ...basePhoto,
        id: "photo-2",
        originalName: "apple.jpg",
        displayName: null,
        size: 100,
        takenAt: "2026-07-12T08:30:00.000Z",
        uploadedAt: "2026-07-12T08:30:00.000Z",
      },
      {
        ...basePhoto,
        id: "photo-3",
        originalName: "banana.jpg",
        displayName: null,
        size: 150,
        takenAt: "2026-06-01T08:30:00.000Z",
        uploadedAt: "2026-06-01T08:30:00.000Z",
      },
    ];

    const grouped = groupPhotos(photos as never[], "month", {
      sortBy: "fileName",
      sortOrder: "asc",
    });

    expect(Array.from(grouped.keys())).toEqual(["2026年7月", "2026年6月"]);
    expect(grouped.get("2026年7月")?.map((photo) => photo.id)).toEqual(["photo-2", "photo-1"]);
    expect(grouped.get("2026年6月")?.map((photo) => photo.id)).toEqual(["photo-3"]);
  });

  it("still groups by date when sorting by size", () => {
    const photos = [
      {
        ...basePhoto,
        id: "photo-1",
        originalName: "a.jpg",
        displayName: null,
        size: 300,
        takenAt: "2026-07-10T08:30:00.000Z",
        uploadedAt: "2026-07-10T08:30:00.000Z",
      },
      {
        ...basePhoto,
        id: "photo-2",
        originalName: "b.jpg",
        displayName: null,
        size: 100,
        takenAt: "2026-07-10T09:30:00.000Z",
        uploadedAt: "2026-07-10T09:30:00.000Z",
      },
    ];

    const grouped = groupPhotos(photos as never[], "month", {
      sortBy: "size",
      sortOrder: "asc",
    });

    expect(grouped.get("2026年7月")?.map((photo) => photo.id)).toEqual(["photo-2", "photo-1"]);
  });
});
