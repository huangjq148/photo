import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getCurrentUserFromRequest: vi.fn(),
  getAlbumPhotos: vi.fn(),
  addPhotosToAlbum: vi.fn(),
}));

vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUserFromRequest: mocks.getCurrentUserFromRequest,
}));

vi.mock("@/lib/db", () => ({
  prisma: {},
}));

vi.mock("@/lib/albums/library", () => ({
  getAlbumPhotos: mocks.getAlbumPhotos,
  addPhotosToAlbum: mocks.addPhotosToAlbum,
}));

import { GET, POST } from "@/app/api/albums/[id]/photos/route";

function nextRequest(input: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(input, init);
}

describe("/api/albums/[id]/photos route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUserFromRequest.mockResolvedValue({ id: "user-1" });
  });

  it("rejects page sizes above 200 with a 422 response", async () => {
    const response = await GET(
      nextRequest("http://localhost/api/albums/album-1/photos?pageSize=201"),
      { params: Promise.resolve({ id: "album-1" }) },
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(mocks.getAlbumPhotos).not.toHaveBeenCalled();
  });

  it("passes cursor and excludeAlbumId through to the library layer", async () => {
    mocks.getAlbumPhotos.mockResolvedValue({
      items: [{ id: "photo-1" }],
      total: 1,
      page: 1,
      pageSize: 100,
      nextCursor: "cursor-2",
    });

    const response = await GET(
      nextRequest(
        "http://localhost/api/albums/album-1/photos?pageSize=100&cursor=cursor-1&excludeAlbumId=target-1&keyword=%E6%B5%B7&mediaType=image&favoritedOnly=1&uploaderId=user-2&takenFrom=2026-07-01&takenTo=2026-07-31&sortBy=takenAt&sortOrder=asc",
      ),
      { params: Promise.resolve({ id: "album-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.getAlbumPhotos).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        albumId: "album-1",
        userId: "user-1",
        pageSize: 100,
        cursor: "cursor-1",
        excludeAlbumId: "target-1",
        keyword: "海",
        mediaType: "image",
        favoritedOnly: true,
        uploaderId: "user-2",
        takenFrom: "2026-07-01",
        takenTo: "2026-07-31",
        sortBy: "takenAt",
        sortOrder: "asc",
      }),
    );
  });

  it("rejects add requests larger than 200 ids with a 422 response", async () => {
    const response = await POST(
      nextRequest("http://localhost/api/albums/album-1/photos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          photoIds: Array.from({ length: 201 }, (_, index) => `photo-${index}`),
        }),
      }),
      { params: Promise.resolve({ id: "album-1" }) },
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(mocks.addPhotosToAlbum).not.toHaveBeenCalled();
  });

  it("returns the batch result contract from partial add requests", async () => {
    mocks.addPhotosToAlbum.mockResolvedValue({
      succeededIds: ["photo-1"],
      failed: [{ id: "photo-2", code: "FORBIDDEN", message: "无权访问全部照片" }],
    });

    const response = await POST(
      nextRequest("http://localhost/api/albums/album-1/photos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photoIds: ["photo-1", "photo-2"] }),
      }),
      { params: Promise.resolve({ id: "album-1" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        succeededIds: ["photo-1"],
        failed: [{ id: "photo-2", code: "FORBIDDEN", message: "无权访问全部照片" }],
      },
    });
  });
});
