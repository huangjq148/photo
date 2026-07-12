import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getTimelinePhotos } from "@/lib/media/timeline";

describe("timeline library", () => {
  let prisma: PrismaClient;
  let userId = "";

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.favorite.deleteMany();
    await prisma.media.deleteMany();
    await prisma.albumMember.deleteMany();
    await prisma.album.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it("returns timeline items with cursor pagination across accessible albums", async () => {
    const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const user = await prisma.user.create({
      data: {
        email: `timeline-${unique}@photo.test`,
        password_hash: "hash",
        nickname: "Timeline User",
      },
    });

    const albumA = await prisma.album.create({
      data: {
        id: "11111111-1111-4111-8111-111111111111",
        creator_id: user.id,
        name: "Album A",
      },
    });

    const albumB = await prisma.album.create({
      data: {
        id: "22222222-2222-4222-8222-222222222222",
        creator_id: user.id,
        name: "Album B",
      },
    });

    await prisma.albumMember.createMany({
      data: [
        { album_id: albumA.id, user_id: user.id, role: "owner" },
        { album_id: albumB.id, user_id: user.id, role: "owner" },
      ],
    });

    await prisma.media.createMany({
      data: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          album_id: albumA.id,
          uploader_id: user.id,
          original_name: "three.jpg",
          file_name: "three.jpg",
          mime_type: "image/jpeg",
          media_type: "image",
          size: 100n,
          width: 100,
          height: 100,
          original_url: "/o/three",
          preview_url: "/p/three",
          thumbnail_url: "/t/three",
          storage_path: "three.jpg",
          processing_status: "normal",
          status: "normal",
          taken_at: new Date("2026-07-11T08:00:00.000Z"),
          uploaded_at: new Date("2026-07-11T09:00:00.000Z"),
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          album_id: albumB.id,
          uploader_id: user.id,
          original_name: "two.jpg",
          file_name: "two.jpg",
          mime_type: "image/jpeg",
          media_type: "image",
          size: 100n,
          width: 100,
          height: 100,
          original_url: "/o/two",
          preview_url: "/p/two",
          thumbnail_url: "/t/two",
          storage_path: "two.jpg",
          processing_status: "normal",
          status: "normal",
          taken_at: null,
          uploaded_at: new Date("2026-07-12T08:00:00.000Z"),
        },
        {
          id: "11111111-1111-4111-8111-111111111111",
          album_id: albumA.id,
          uploader_id: user.id,
          original_name: "one.jpg",
          file_name: "one.jpg",
          mime_type: "image/jpeg",
          media_type: "image",
          size: 100n,
          width: 100,
          height: 100,
          original_url: "/o/one",
          preview_url: "/p/one",
          thumbnail_url: "/t/one",
          storage_path: "one.jpg",
          processing_status: "normal",
          status: "normal",
          taken_at: new Date("2026-07-11T08:00:00.000Z"),
          uploaded_at: new Date("2026-07-11T10:00:00.000Z"),
        },
      ],
    });

    userId = user.id;

    const firstPage = await getTimelinePhotos(prisma, {
      userId,
      pageSize: 2,
    });

    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.items.map((item) => item.id)).toEqual([
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333",
    ]);
    expect(firstPage.items[0]?.albumName).toBe("Album B");
    expect(firstPage.hasMore).toBe(true);
    expect(firstPage.nextCursor).toBeTruthy();

    const secondPage = await getTimelinePhotos(prisma, {
      userId,
      pageSize: 2,
      cursor: firstPage.nextCursor ?? undefined,
    });

    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.items[0]?.id).toBe("11111111-1111-4111-8111-111111111111");
    expect(secondPage.hasMore).toBe(false);
    expect(secondPage.nextCursor).toBeNull();
  });
});
