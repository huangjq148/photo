import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  addPhotosToAlbum,
  createAlbum,
  createDefaultAlbum,
  getAlbumDetail,
  getAlbumPhotos,
  getUserAlbums,
} from "@/lib/albums/library";

describe("album library", () => {
  let prisma: PrismaClient;
  let albumId = "";

  beforeAll(() => {
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
  });

  it("lists albums for a member and returns detail", async () => {
    const user = await prisma.user.create({
      data: {
        email: `albums-${Date.now()}@photo.test`,
        password_hash: "hash",
        nickname: "Album User"
      }
    });

    const album = await createAlbum(prisma, {
      userId: user.id,
      name: "Test Album"
    });

    albumId = album.id;

    const albums = await getUserAlbums(prisma, user.id);

    expect(albums).toHaveLength(1);
    expect(albums[0]?.id).toBe(albumId);
    expect(albums[0]?.role).toBe("owner");

    const detail = await getAlbumDetail(prisma, {
      albumId,
      userId: user.id
    });

    expect(detail.id).toBe(albumId);
    expect(detail.name).toBe("Test Album");
    expect(detail.role).toBe("owner");
    expect(detail.memberCount).toBe(1);
    expect(detail.photoCount).toBe(0);
  });

  it("creates default album with immutable flags", async () => {
    const { createDefaultAlbum, getUserDefaultAlbumId } = await import("@/lib/albums/library");

    const user = await prisma.user.create({
      data: {
        email: `default-${Date.now()}@photo.test`,
        password_hash: "hash",
        nickname: "Default User"
      }
    });

    const album = await createDefaultAlbum(prisma, user.id);

    expect(album.is_default).toBe(true);
    expect(album.is_immutable).toBe(true);
    expect(album.name).toBe("全部照片");

    const defaultId = await getUserDefaultAlbumId(prisma, user.id);
    expect(defaultId).toBe(album.id);
  });

  it("marks uploadable albums in the summary payload", async () => {
    const owner = await prisma.user.create({
      data: {
        email: `summary-owner-${Date.now()}@photo.test`,
        password_hash: "hash",
        nickname: "Summary Owner"
      }
    });
    const reader = await prisma.user.create({
      data: {
        email: `summary-reader-${Date.now()}@photo.test`,
        password_hash: "hash",
        nickname: "Summary Reader"
      }
    });

    const album = await createAlbum(prisma, {
      userId: owner.id,
      name: "Upload Summary"
    });

    await prisma.albumMember.create({
      data: {
        album_id: album.id,
        user_id: reader.id,
        role: "member",
        can_upload: false,
        can_delete: false
      }
    });

    const ownerAlbums = await getUserAlbums(prisma, owner.id);
    expect(ownerAlbums[0]?.canUpload).toBe(true);

    const readerAlbums = await getUserAlbums(prisma, reader.id);
    expect(readerAlbums[0]?.canUpload).toBe(false);
  });

  it("paginates default album results with cursor support and excludes photos already in the target album", async () => {
    const user = await prisma.user.create({
      data: {
        email: `pagination-${Date.now()}@photo.test`,
        password_hash: "hash",
        nickname: "Pagination User",
      },
    });

    const defaultAlbum = await createDefaultAlbum(prisma, user.id);
    const targetAlbum = await createAlbum(prisma, {
      userId: user.id,
      name: "Target Album",
    });
    const excludedIds = new Set<string>();

    for (let index = 0; index < 60; index += 1) {
      const timestamp = new Date(Date.now() + index * 1000);
      const media = await prisma.media.create({
        data: {
          album_id: defaultAlbum.id,
          uploader_id: user.id,
          original_name: `photo-${index}.jpg`,
          file_name: `photo-${index}.jpg`,
          mime_type: "image/jpeg",
          media_type: "image",
          size: 1,
          width: 1,
          height: 1,
          original_url: `/originals/${index}.jpg`,
          preview_url: `/previews/${index}.jpg`,
          thumbnail_url: `/thumbnails/${index}.jpg`,
          storage_path: `photo-${index}.jpg`,
          processing_status: "normal",
          status: "normal",
          uploaded_at: timestamp,
          created_at: timestamp,
          updated_at: timestamp,
        },
      });

      await prisma.albumPhoto.create({
        data: {
          album_id: defaultAlbum.id,
          photo_id: media.id,
          added_by: user.id,
          added_at: timestamp,
        },
      });

      if (index < 5) {
        excludedIds.add(media.id);
        await prisma.albumPhoto.create({
          data: {
            album_id: targetAlbum.id,
            photo_id: media.id,
            added_by: user.id,
            added_at: new Date(timestamp.getTime() + 500),
          },
        });
      }
    }

    const firstPage = await getAlbumPhotos(prisma, {
      albumId: defaultAlbum.id,
      userId: user.id,
      page: 1,
      pageSize: 50,
      excludeAlbumId: targetAlbum.id,
    });

    expect(firstPage.total).toBe(55);
    expect(firstPage.items).toHaveLength(50);
    expect(firstPage.nextCursor).toBeTruthy();
    expect(firstPage.items.some((item) => excludedIds.has(item.id))).toBe(false);

    const secondPage = await getAlbumPhotos(prisma, {
      albumId: defaultAlbum.id,
      userId: user.id,
      page: 1,
      pageSize: 50,
      cursor: firstPage.nextCursor ?? undefined,
      excludeAlbumId: targetAlbum.id,
    });

    expect(secondPage.items).toHaveLength(5);
    expect(secondPage.nextCursor).toBeNull();
    expect(secondPage.items.some((item) => excludedIds.has(item.id))).toBe(false);
    expect(new Set([...firstPage.items, ...secondPage.items].map((item) => item.id)).size).toBe(55);
  });

  it("adds photos from the default album with partial success instead of aborting the whole batch", async () => {
    const user = await prisma.user.create({
      data: {
        email: `partial-${Date.now()}@photo.test`,
        password_hash: "hash",
        nickname: "Partial User",
      },
    });

    const defaultAlbum = await createDefaultAlbum(prisma, user.id);
    const targetAlbum = await createAlbum(prisma, {
      userId: user.id,
      name: "Selection Target",
    });
    const otherAlbum = await createAlbum(prisma, {
      userId: user.id,
      name: "Other Source",
    });

    const validPhoto = await prisma.media.create({
      data: {
        album_id: defaultAlbum.id,
        uploader_id: user.id,
        original_name: "valid.jpg",
        file_name: "valid.jpg",
        mime_type: "image/jpeg",
        media_type: "image",
        size: 1,
        width: 1,
        height: 1,
        original_url: "/originals/valid.jpg",
        preview_url: "/previews/valid.jpg",
        thumbnail_url: "/thumbnails/valid.jpg",
        storage_path: "valid.jpg",
        processing_status: "normal",
        status: "normal",
      },
    });

    await prisma.albumPhoto.create({
      data: {
        album_id: defaultAlbum.id,
        photo_id: validPhoto.id,
        added_by: user.id,
      },
    });

    const invalidPhoto = await prisma.media.create({
      data: {
        album_id: otherAlbum.id,
        uploader_id: user.id,
        original_name: "invalid.jpg",
        file_name: "invalid.jpg",
        mime_type: "image/jpeg",
        media_type: "image",
        size: 1,
        width: 1,
        height: 1,
        original_url: "/originals/invalid.jpg",
        preview_url: "/previews/invalid.jpg",
        thumbnail_url: "/thumbnails/invalid.jpg",
        storage_path: "invalid.jpg",
        processing_status: "normal",
        status: "normal",
      },
    });

    await prisma.albumPhoto.create({
      data: {
        album_id: otherAlbum.id,
        photo_id: invalidPhoto.id,
        added_by: user.id,
      },
    });

    const result = await addPhotosToAlbum(prisma, {
      albumId: targetAlbum.id,
      userId: user.id,
      photoIds: [validPhoto.id, invalidPhoto.id],
    });

    expect(result.succeededIds).toEqual([validPhoto.id]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]?.id).toBe(invalidPhoto.id);

    const targetRefs = await prisma.albumPhoto.findMany({
      where: { album_id: targetAlbum.id },
      orderBy: { added_at: "asc" },
    });

    expect(targetRefs.map((ref) => ref.photo_id)).toEqual([validPhoto.id]);
  });
});
