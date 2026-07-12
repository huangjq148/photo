import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getMapMediaPoints } from "@/lib/media/map";
import { updatePhotoMetadata } from "@/lib/photos/library";

describe("map media query", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.albumInvite.deleteMany();
    await prisma.photoShare.deleteMany();
    await prisma.albumPhoto.deleteMany();
    await prisma.favorite.deleteMany();
    await prisma.media.deleteMany();
    await prisma.albumMember.deleteMany();
    await prisma.album.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it("filters hidden locations by default and allows toggling them back", async () => {
    const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const user = await prisma.user.create({
      data: {
        email: `map-${unique}@photo.test`,
        password_hash: "hash",
        nickname: "Map User",
      },
    });

    const album = await prisma.album.create({
      data: {
        creator_id: user.id,
        name: "Map Album",
      },
    });

    await prisma.albumMember.create({
      data: {
        album_id: album.id,
        user_id: user.id,
        role: "owner",
      },
    });

    const visible = await prisma.media.create({
      data: {
        id: "11111111-1111-4111-8111-111111111111",
        album_id: album.id,
        uploader_id: user.id,
        original_name: "visible.jpg",
        file_name: "visible.jpg",
        mime_type: "image/jpeg",
        media_type: "image",
        size: 100n,
        width: 100,
        height: 100,
        original_url: "/o/visible",
        preview_url: "/p/visible",
        thumbnail_url: "/t/visible",
        storage_path: "visible.jpg",
        processing_status: "normal",
        status: "normal",
        checksum: "checksum-visible",
        latitude: 31.2304,
        longitude: 121.4737,
        taken_at: new Date("2026-07-10T08:00:00.000Z"),
        uploaded_at: new Date("2026-07-10T08:00:00.000Z"),
      },
    });

    const hidden = await prisma.media.create({
      data: {
        id: "22222222-2222-4222-8222-222222222222",
        album_id: album.id,
        uploader_id: user.id,
        original_name: "hidden.jpg",
        file_name: "hidden.jpg",
        mime_type: "image/jpeg",
        media_type: "image",
        size: 100n,
        width: 100,
        height: 100,
        original_url: "/o/hidden",
        preview_url: "/p/hidden",
        thumbnail_url: "/t/hidden",
        storage_path: "hidden.jpg",
        processing_status: "normal",
        status: "normal",
        checksum: "checksum-hidden",
        latitude: 31.24,
        longitude: 121.48,
        location_hidden: true,
        taken_at: new Date("2026-07-10T09:00:00.000Z"),
        uploaded_at: new Date("2026-07-10T09:00:00.000Z"),
      },
    });

    const defaultPoints = await getMapMediaPoints(prisma, {
      userId: user.id,
      includeHidden: false,
    });

    expect(defaultPoints).toHaveLength(1);
    expect(defaultPoints[0]?.id).toBe(visible.id);

    const allPoints = await getMapMediaPoints(prisma, {
      userId: user.id,
      includeHidden: true,
    });

    expect(allPoints).toHaveLength(2);

    await updatePhotoMetadata(prisma, {
      photoId: hidden.id,
      userId: user.id,
      locationHidden: false,
    });

    const restoredPoints = await getMapMediaPoints(prisma, {
      userId: user.id,
      includeHidden: false,
    });

    expect(restoredPoints.map((point) => point.id)).toEqual([hidden.id, visible.id]);
  });
});
