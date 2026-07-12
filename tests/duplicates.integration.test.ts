import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getDuplicateMediaGroups } from "@/lib/media/duplicates";

describe("duplicate media query", () => {
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

  it("returns only accessible duplicate groups", async () => {
    const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const user = await prisma.user.create({
      data: {
        email: `duplicates-${unique}@photo.test`,
        password_hash: "hash",
        nickname: "Duplicate User",
      },
    });

    const album = await prisma.album.create({
      data: {
        creator_id: user.id,
        name: "Duplicate Album",
      },
    });

    await prisma.albumMember.create({
      data: {
        album_id: album.id,
        user_id: user.id,
        role: "owner",
      },
    });

    await prisma.media.createMany({
      data: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          album_id: album.id,
          uploader_id: user.id,
          original_name: "dup-a.jpg",
          file_name: "dup-a.jpg",
          mime_type: "image/jpeg",
          media_type: "image",
          size: 100n,
          width: 100,
          height: 100,
          original_url: "/o/a",
          preview_url: "/p/a",
          thumbnail_url: "/t/a",
          storage_path: "a.jpg",
          processing_status: "normal",
          status: "normal",
          checksum: "checksum-a",
          taken_at: new Date("2026-07-11T08:00:00.000Z"),
          uploaded_at: new Date("2026-07-11T09:00:00.000Z"),
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          album_id: album.id,
          uploader_id: user.id,
          original_name: "dup-b.jpg",
          file_name: "dup-b.jpg",
          mime_type: "image/jpeg",
          media_type: "image",
          size: 120n,
          width: 100,
          height: 100,
          original_url: "/o/b",
          preview_url: "/p/b",
          thumbnail_url: "/t/b",
          storage_path: "b.jpg",
          processing_status: "normal",
          status: "normal",
          checksum: "checksum-a",
          taken_at: new Date("2026-07-11T08:00:00.000Z"),
          uploaded_at: new Date("2026-07-11T10:00:00.000Z"),
        },
        {
          id: "33333333-3333-4333-8333-333333333333",
          album_id: album.id,
          uploader_id: user.id,
          original_name: "single.jpg",
          file_name: "single.jpg",
          mime_type: "image/jpeg",
          media_type: "image",
          size: 80n,
          width: 100,
          height: 100,
          original_url: "/o/c",
          preview_url: "/p/c",
          thumbnail_url: "/t/c",
          storage_path: "c.jpg",
          processing_status: "normal",
          status: "normal",
          checksum: "checksum-c",
          taken_at: new Date("2026-07-12T08:00:00.000Z"),
          uploaded_at: new Date("2026-07-12T08:00:00.000Z"),
        },
      ],
    });

    const groups = await getDuplicateMediaGroups(prisma, user.id);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.items).toHaveLength(2);
    expect(groups[0]?.items.map((item) => item.id)).toEqual([
      "22222222-2222-4222-8222-222222222222",
      "11111111-1111-4111-8111-111111111111",
    ]);
    expect(groups[0]?.suggestedKeeperId).toBe("11111111-1111-4111-8111-111111111111");
  });
});
