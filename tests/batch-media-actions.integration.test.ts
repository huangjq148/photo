import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { uploadPhotoToAlbum } from "@/lib/photos/upload";
import {
  batchPermanentlyDeleteTrashPhotos,
  batchRestoreTrashPhotos,
  batchSetFavoritePhotos,
  batchSoftDeletePhotos,
  clearTrashPhotos,
  getFavoritePhotos,
  getTrashPhotos,
  setFavoritePhoto,
  softDeletePhoto,
} from "@/lib/photos/library";

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jx2kAAAAASUVORK5CYII=",
  "base64"
);

describe("batch media actions", () => {
  const storageRoot = mkdtempSync(join(tmpdir(), "batch-media-actions-"));
  let prisma: PrismaClient;

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

  async function seedAlbumWithTwoUsers() {
    const owner = await prisma.user.create({
      data: {
        email: `batch-owner-${Date.now()}@photo.test`,
        password_hash: "hash",
        nickname: "Batch Owner",
      },
    });

    const collaborator = await prisma.user.create({
      data: {
        email: `batch-collab-${Date.now()}@photo.test`,
        password_hash: "hash",
        nickname: "Batch Collaborator",
      },
    });

    const album = await prisma.album.create({
      data: {
        creator_id: owner.id,
        name: "Batch Album",
      },
    });

    await prisma.albumMember.createMany({
      data: [
        { album_id: album.id, user_id: owner.id, role: "owner" },
        { album_id: album.id, user_id: collaborator.id, role: "member", can_upload: true, can_delete: false },
      ],
    });

    const ownerUpload = await uploadPhotoToAlbum(
      prisma,
      { storageRoot, jwtSecret: "x".repeat(32) },
      {
        albumId: album.id,
        userId: owner.id,
        file: new File([tinyPng], "owner.png", { type: "image/png" }),
      },
    );

    const collaboratorUpload = await uploadPhotoToAlbum(
      prisma,
      { storageRoot, jwtSecret: "x".repeat(32) },
      {
        albumId: album.id,
        userId: collaborator.id,
        file: new File([tinyPng], "collaborator.png", { type: "image/png" }),
      },
    );

    return { owner, collaborator, album, ownerUpload, collaboratorUpload };
  }

  it("supports explicit favorite state and partial failures", async () => {
    const { owner, ownerUpload } = await seedAlbumWithTwoUsers();

    const result = await batchSetFavoritePhotos(prisma, {
      userId: owner.id,
      photoIds: [ownerUpload.id, "missing-photo-id"],
      favorited: true,
    });

    expect(result.succeededIds).toEqual([ownerUpload.id]);
    expect(result.failed).toHaveLength(1);

    const favorites = await getFavoritePhotos(prisma, owner.id);
    expect(favorites.items.map((item) => item.id)).toEqual([ownerUpload.id]);

    const cleared = await setFavoritePhoto(prisma, {
      photoId: ownerUpload.id,
      userId: owner.id,
      favorited: false,
    });
    expect(cleared.favorited).toBe(false);
  });

  it("processes batch trash, restore, and permanent delete independently", async () => {
    const { owner, collaborator, ownerUpload, collaboratorUpload } = await seedAlbumWithTwoUsers();

    const trashed = await batchSoftDeletePhotos(prisma, {
      userId: owner.id,
      photoIds: [ownerUpload.id, collaboratorUpload.id],
    });

    expect(trashed.succeededIds).toEqual([ownerUpload.id]);
    expect(trashed.failed).toHaveLength(1);

    const ownerTrash = await getTrashPhotos(prisma, { userId: owner.id, page: 1, pageSize: 20 });
    expect(ownerTrash.items.map((item) => item.id)).toEqual([ownerUpload.id]);

    const restoreResult = await batchRestoreTrashPhotos(prisma, {
      userId: owner.id,
      photoIds: [ownerUpload.id, collaboratorUpload.id],
    });

    expect(restoreResult.succeededIds).toEqual([ownerUpload.id]);
    expect(restoreResult.failed).toHaveLength(1);

    const retrash = await batchSoftDeletePhotos(prisma, {
      userId: owner.id,
      photoIds: [ownerUpload.id],
    });
    expect(retrash.succeededIds).toEqual([ownerUpload.id]);

    await softDeletePhoto(prisma, { photoId: collaboratorUpload.id, userId: collaborator.id });

    const deleteResult = await batchPermanentlyDeleteTrashPhotos(prisma, {
      userId: owner.id,
      photoIds: [ownerUpload.id, collaboratorUpload.id],
    });

    expect(deleteResult.succeededIds).toEqual([ownerUpload.id]);
    expect(deleteResult.failed).toHaveLength(1);

    const collaboratorTrash = await getTrashPhotos(prisma, {
      userId: collaborator.id,
      page: 1,
      pageSize: 20,
    });
    expect(collaboratorTrash.items.map((item) => item.id)).toEqual([collaboratorUpload.id]);
  });

  it("clears only the current uploader's trashed snapshot", async () => {
    const { owner, collaborator, ownerUpload, collaboratorUpload } = await seedAlbumWithTwoUsers();

    await softDeletePhoto(prisma, { photoId: ownerUpload.id, userId: owner.id });
    await softDeletePhoto(prisma, { photoId: collaboratorUpload.id, userId: collaborator.id });

    const cleared = await clearTrashPhotos(prisma, owner.id, storageRoot);
    expect(cleared).toBe(1);

    const ownerTrash = await getTrashPhotos(prisma, { userId: owner.id, page: 1, pageSize: 20 });
    expect(ownerTrash.items).toHaveLength(0);

    const collaboratorTrash = await getTrashPhotos(prisma, {
      userId: collaborator.id,
      page: 1,
      pageSize: 20,
    });
    expect(collaboratorTrash.items.map((item) => item.id)).toEqual([collaboratorUpload.id]);
  });
});
