import { mkdtempSync, rmSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { uploadPhotoToAlbum } from "@/lib/photos/upload";
import { getAlbumPhotos, updateAlbumPhotoDisplayName } from "@/lib/albums/library";

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jx2kAAAAASUVORK5CYII=",
  "base64"
);

describe("album media display names", () => {
  const storageRoot = mkdtempSync(join(tmpdir(), "album-media-display-name-"));
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

  async function seed() {
    const suffix = randomUUID();

    const owner = await prisma.user.create({
      data: {
        email: `owner-${suffix}@photo.test`,
        password_hash: "hash",
        nickname: "Owner",
      },
    });

    const uploader = await prisma.user.create({
      data: {
        email: `uploader-${suffix}@photo.test`,
        password_hash: "hash",
        nickname: "Uploader",
      },
    });

    const member = await prisma.user.create({
      data: {
        email: `member-${suffix}@photo.test`,
        password_hash: "hash",
        nickname: "Member",
      },
    });

    const album = await prisma.album.create({
      data: {
        creator_id: owner.id,
        name: "Display Name Album",
      },
    });

    await prisma.albumMember.createMany({
      data: [
        { album_id: album.id, user_id: owner.id, role: "owner" },
        { album_id: album.id, user_id: uploader.id, role: "member" },
        { album_id: album.id, user_id: member.id, role: "member" },
      ],
    });

    const uploaded = await uploadPhotoToAlbum(
      prisma,
      {
        storageRoot,
        jwtSecret: "x".repeat(32),
      },
      {
        albumId: album.id,
        userId: uploader.id,
        file: new File([tinyPng], "seed.png", { type: "image/png" }),
      }
    );

    const uploadedByOwner = await uploadPhotoToAlbum(
      prisma,
      {
        storageRoot,
        jwtSecret: "x".repeat(32),
      },
      {
        albumId: album.id,
        userId: owner.id,
        file: new File([tinyPng], "sunset.png", { type: "image/png" }),
      }
    );

    return {
      ownerId: owner.id,
      uploaderId: uploader.id,
      memberId: member.id,
      albumId: album.id,
      photoId: uploaded.id,
      ownerPhotoId: uploadedByOwner.id,
    };
  }

  it("exposes display name fields and edit permissions in album listings", async () => {
    const seeded = await seed();

    const ownerView = await getAlbumPhotos(prisma, {
      albumId: seeded.albumId,
      userId: seeded.ownerId,
      page: 1,
      pageSize: 20,
    });

    expect(ownerView.items.find((item) => item.id === seeded.photoId)).toMatchObject({
      id: seeded.photoId,
      originalName: "seed.png",
      displayName: null,
      canEditName: true,
    });

    const memberView = await getAlbumPhotos(prisma, {
      albumId: seeded.albumId,
      userId: seeded.memberId,
      page: 1,
      pageSize: 20,
    });

    expect(memberView.items[0]?.canEditName).toBe(false);
  });

  it("updates display names for owners or uploaders and trims whitespace", async () => {
    const seeded = await seed();

    const updated = await updateAlbumPhotoDisplayName(prisma, {
      albumId: seeded.albumId,
      photoId: seeded.photoId,
      userId: seeded.uploaderId,
      displayName: "  海边的日落  ",
    });

    expect(updated.displayName).toBe("海边的日落");

    const listed = await getAlbumPhotos(prisma, {
      albumId: seeded.albumId,
      userId: seeded.ownerId,
      page: 1,
      pageSize: 20,
    });

    expect(listed.items.find((item) => item.id === seeded.photoId)?.displayName).toBe("海边的日落");

    const cleared = await updateAlbumPhotoDisplayName(prisma, {
      albumId: seeded.albumId,
      photoId: seeded.photoId,
      userId: seeded.ownerId,
      displayName: "   ",
    });

    expect(cleared.displayName).toBeNull();
  });

  it("rejects non-editors and overly long names", async () => {
    const seeded = await seed();

    await expect(
      updateAlbumPhotoDisplayName(prisma, {
        albumId: seeded.albumId,
        photoId: seeded.photoId,
        userId: seeded.memberId,
        displayName: "Hack",
      })
    ).rejects.toThrow("你没有权限编辑此名称");

    await expect(
      updateAlbumPhotoDisplayName(prisma, {
        albumId: seeded.albumId,
        photoId: seeded.photoId,
        userId: seeded.ownerId,
        displayName: "😀".repeat(101),
      })
    ).rejects.toThrow("名称最多 100 个字符");
  });

  it("applies media filters in album listings", async () => {
    const seeded = await seed();

    await prisma.media.update({
      where: { id: seeded.photoId },
      data: {
        display_name: "海边合影",
        taken_at: new Date("2026-07-12T08:30:00.000Z"),
      },
    });

    await prisma.media.update({
      where: { id: seeded.ownerPhotoId },
      data: {
        media_type: "video",
        taken_at: new Date("2026-07-10T08:30:00.000Z"),
      },
    });

    await prisma.favorite.create({
      data: {
        user_id: seeded.ownerId,
        photo_id: seeded.photoId,
      },
    });

    const byDisplayName = await getAlbumPhotos(prisma, {
      albumId: seeded.albumId,
      userId: seeded.ownerId,
      page: 1,
      pageSize: 20,
      keyword: "海边",
    });
    expect(byDisplayName.items.map((item) => item.id)).toEqual([seeded.photoId]);

    const byMediaType = await getAlbumPhotos(prisma, {
      albumId: seeded.albumId,
      userId: seeded.ownerId,
      page: 1,
      pageSize: 20,
      mediaType: "video",
    });
    expect(byMediaType.items.map((item) => item.id)).toEqual([seeded.ownerPhotoId]);

    const byUploader = await getAlbumPhotos(prisma, {
      albumId: seeded.albumId,
      userId: seeded.ownerId,
      page: 1,
      pageSize: 20,
      uploaderId: seeded.uploaderId,
    });
    expect(byUploader.items.map((item) => item.id)).toEqual([seeded.photoId]);

    const favoritedOnly = await getAlbumPhotos(prisma, {
      albumId: seeded.albumId,
      userId: seeded.ownerId,
      page: 1,
      pageSize: 20,
      favoritedOnly: true,
    });
    expect(favoritedOnly.items.map((item) => item.id)).toEqual([seeded.photoId]);

    const takenRange = await getAlbumPhotos(prisma, {
      albumId: seeded.albumId,
      userId: seeded.ownerId,
      page: 1,
      pageSize: 20,
      takenFrom: "2026-07-12",
      takenTo: "2026-07-12",
    });
    expect(takenRange.items.map((item) => item.id)).toEqual([seeded.photoId]);
  });
});
