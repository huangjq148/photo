import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { uploadPhotoToAlbum } from "@/lib/photos/upload";

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jx2kAAAAASUVORK5CYII=",
  "base64"
);

describe("photo upload", () => {
  const storageRoot = mkdtempSync(join(tmpdir(), "photo-upload-"));
  let prisma: PrismaClient;
  let userId = "";
  let albumId = "";

  beforeAll(() => {
    process.env.STORAGE_ROOT = storageRoot;
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.albumInvite.deleteMany();
    await prisma.albumPhoto.deleteMany();
    await prisma.photoShare.deleteMany();
    await prisma.favorite.deleteMany();
    await prisma.media.deleteMany();
    await prisma.albumMember.deleteMany();
    await prisma.album.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    rmSync(storageRoot, { recursive: true, force: true });
  });

  it("uploads a photo to an album", async () => {
    const user = await prisma.user.create({
      data: {
        email: `upload-${Date.now()}@photo.test`,
        password_hash: "hash",
        nickname: "Uploader"
      }
    });

    userId = user.id;

    const album = await prisma.album.create({
      data: {
        creator_id: user.id,
        name: "Upload Album"
      }
    });

    await prisma.albumMember.create({
      data: {
        album_id: album.id,
        user_id: user.id,
        role: "owner"
      }
    });

    albumId = album.id;

    const result = await uploadPhotoToAlbum(prisma, {
      storageRoot,
      jwtSecret: "x".repeat(32)
    }, {
      albumId: album.id,
      userId: user.id,
      file: new File([tinyPng], "upload.png", { type: "image/png" })
    });

    expect(result.id).toBeTruthy();
    expect(result.originalName).toBe("upload.png");
    expect(result.status).toBe("normal");

    const photo = await prisma.media.findUnique({ where: { id: result.id } });
    expect(photo?.album_id).toBe(albumId);

    // Verify AlbumPhoto reference was created
    const ref = await prisma.albumPhoto.findFirst({
      where: { album_id: albumId, photo_id: result.id }
    });
    expect(ref).toBeTruthy();
  });

  it("rejects non-members from uploading", async () => {
    const otherUser = await prisma.user.create({
      data: {
        email: `other-${Date.now()}@photo.test`,
        password_hash: "hash",
        nickname: "Other"
      }
    });

    await expect(
      uploadPhotoToAlbum(prisma, {
        storageRoot,
        jwtSecret: "x".repeat(32)
      }, {
        albumId,
        userId: otherUser.id,
        file: new File([tinyPng], "reject.png", { type: "image/png" })
      })
    ).rejects.toThrow("不在这个相册中");
  });
});
