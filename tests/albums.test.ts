import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getUserAlbums, getAlbumDetail, createAlbum } from "@/lib/albums/library";

describe("album library", () => {
  let prisma: PrismaClient;
  let userId = "";
  let albumId = "";

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.albumInvite.deleteMany();
    await prisma.albumPhoto.deleteMany();
    await prisma.photoShare.deleteMany();
    await prisma.favorite.deleteMany();
    await prisma.photo.deleteMany();
    await prisma.albumMember.deleteMany();
    await prisma.album.deleteMany();
    await prisma.spaceInvite.deleteMany();
    await prisma.spaceMember.deleteMany();
    await prisma.space.deleteMany();
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

    userId = user.id;

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
});
