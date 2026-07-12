import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { uploadPhotoToAlbum } from "@/lib/photos/upload";
import {
  getAlbumPhotos,
  getTrashPhotos,
  softDeletePhoto,
  restorePhoto,
  permanentlyDeletePhoto,
  toggleFavoritePhoto,
  getFavoritePhotos,
  updatePhotoTakenAt
} from "@/lib/photos/library";

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jx2kAAAAASUVORK5CYII=",
  "base64"
);

describe("photo library flows", () => {
  const storageRoot = mkdtempSync(join(tmpdir(), "photo-library-"));
  let prisma: PrismaClient;
  let userId = "";
  let albumId = "";
  let photoId = "";

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
    await prisma.album.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    rmSync(storageRoot, { recursive: true, force: true });
  });

  async function seedPhoto() {
    const user = await prisma.user.create({
      data: {
        email: `seed-${Date.now()}@photo.test`,
        password_hash: "hash",
        nickname: "Seeder"
      }
    });

    const album = await prisma.album.create({
      data: {
        creator_id: user.id,
        name: "Library Album"
      }
    });

    await prisma.albumMember.create({
      data: {
        album_id: album.id,
        user_id: user.id,
        role: "owner"
      }
    });

    const uploaded = await uploadPhotoToAlbum(prisma, {
      storageRoot,
      jwtSecret: "x".repeat(32)
    }, {
      albumId: album.id,
      userId: user.id,
      file: new File([tinyPng], "seed.png", { type: "image/png" })
    });

    userId = user.id;
    albumId = album.id;
    photoId = uploaded.id;
  }

  it("lists photos, soft deletes, restores, and permanently deletes", async () => {
    await seedPhoto();

    const listed = await getAlbumPhotos(prisma, {
      albumId,
      userId,
      page: 1,
      pageSize: 20
    });

    expect(listed.items).toHaveLength(1);
    expect(listed.items[0]?.id).toBe(photoId);

    await softDeletePhoto(prisma, { photoId, userId });

    const trash = await getTrashPhotos(prisma, { userId, page: 1, pageSize: 20 });
    expect(trash.items).toHaveLength(1);
    expect(trash.items[0]?.id).toBe(photoId);

    await restorePhoto(prisma, { photoId, userId });

    const restored = await getAlbumPhotos(prisma, {
      albumId, userId, page: 1, pageSize: 20
    });
    expect(restored.items).toHaveLength(1);
    expect(restored.items[0]?.status).toBe("normal");

    await softDeletePhoto(prisma, { photoId, userId });
    await permanentlyDeletePhoto(prisma, { photoId, userId });

    const finalTrash = await getTrashPhotos(prisma, { userId, page: 1, pageSize: 20 });
    expect(finalTrash.items).toHaveLength(0);
  });

  it("searches photos and supports favorites", async () => {
    await seedPhoto();

    const search = await getAlbumPhotos(prisma, {
      albumId, userId, page: 1, pageSize: 20, keyword: "seed"
    });
    expect(search.items).toHaveLength(1);

    const empty = await getAlbumPhotos(prisma, {
      albumId, userId, page: 1, pageSize: 20, keyword: "missing"
    });
    expect(empty.items).toHaveLength(0);

    await toggleFavoritePhoto(prisma, { photoId, userId });
    const favorites = await getFavoritePhotos(prisma, userId);
    expect(favorites.items).toHaveLength(1);
    expect(favorites.items[0]?.id).toBe(photoId);

    await toggleFavoritePhoto(prisma, { photoId, userId });
    const noFavorites = await getFavoritePhotos(prisma, userId);
    expect(noFavorites.items).toHaveLength(0);
  });

  it("updates and clears taken time", async () => {
    await seedPhoto();

    const updated = await updatePhotoTakenAt(prisma, {
      photoId,
      userId,
      takenAt: "2026-07-12T10:11:00.000Z",
    });

    expect(updated.takenAt?.toISOString()).toBe("2026-07-12T10:11:00.000Z");

    const listed = await getAlbumPhotos(prisma, {
      albumId,
      userId,
      page: 1,
      pageSize: 20,
    });

    expect(listed.items[0]?.takenAt?.toISOString()).toBe("2026-07-12T10:11:00.000Z");

    const cleared = await updatePhotoTakenAt(prisma, {
      photoId,
      userId,
      takenAt: null,
    });

    expect(cleared.takenAt).toBeNull();
  });
});
