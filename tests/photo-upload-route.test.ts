import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getCurrentUserFromRequest: vi.fn(),
  getAppEnv: vi.fn(),
  getUserDefaultAlbumId: vi.fn(),
  addPhotosToAlbum: vi.fn(),
  uploadPhotoToAlbum: vi.fn(),
  assertCanUpload: vi.fn(),
}));

vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUserFromRequest: mocks.getCurrentUserFromRequest,
}));
vi.mock("@/lib/config", () => ({
  getAppEnv: mocks.getAppEnv,
}));
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/albums/library", () => ({
  getUserDefaultAlbumId: mocks.getUserDefaultAlbumId,
  addPhotosToAlbum: mocks.addPhotosToAlbum,
}));
vi.mock("@/lib/media/upload", () => ({
  uploadPhotoToAlbum: mocks.uploadPhotoToAlbum,
}));
vi.mock("@/lib/membership", () => ({
  assertCanUpload: mocks.assertCanUpload,
}));

import { POST } from "@/app/api/albums/[id]/photos/upload/route";

describe("album upload route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUserFromRequest.mockResolvedValue({ id: "user-1" });
    mocks.getAppEnv.mockReturnValue({ STORAGE_ROOT: "./storage", JWT_SECRET: "x".repeat(32) });
    mocks.getUserDefaultAlbumId.mockResolvedValue("default-album");
    mocks.assertCanUpload.mockResolvedValue({ role: "owner" });
  });

  it("checks target album permission before writing to the default album", async () => {
    mocks.assertCanUpload.mockRejectedValue(new Error("你没有上传权限"));
    const formData = new FormData();
    formData.set("file", new File(["file"], "photo.jpg", { type: "image/jpeg" }));

    const response = await POST(
      new NextRequest("http://localhost/api/albums/target/photos/upload", { method: "POST", body: formData }),
      { params: Promise.resolve({ id: "target-album" }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.assertCanUpload).toHaveBeenCalledWith({}, "target-album", "user-1");
    expect(mocks.uploadPhotoToAlbum).not.toHaveBeenCalled();
  });
});
