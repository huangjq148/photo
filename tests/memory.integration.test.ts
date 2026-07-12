import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getMemoryDashboard } from "@/lib/memory/dashboard";

describe("memory dashboard", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.favorite.deleteMany();
    await prisma.albumPhoto.deleteMany();
    await prisma.media.deleteMany();
    await prisma.albumMember.deleteMany();
    await prisma.album.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it("builds on-this-day, child growth and yearly highlight sections", async () => {
    const now = new Date("2026-07-12T12:00:00.000Z");
    const user = await prisma.user.create({
      data: {
        email: `memory-${Date.now()}@photo.test`,
        password_hash: "hash",
        nickname: "Memory User",
      },
    });

    const regularAlbum = await prisma.album.create({
      data: {
        creator_id: user.id,
        name: "Memory Album",
      },
    });

    const childAlbum = await prisma.album.create({
      data: {
        creator_id: user.id,
        name: "Baby Album",
        is_child_album: true,
        child_birth_date: new Date("2024-01-11T00:00:00.000Z"),
      },
    });

    await prisma.albumMember.createMany({
      data: [
        { album_id: regularAlbum.id, user_id: user.id, role: "owner" },
        { album_id: childAlbum.id, user_id: user.id, role: "owner" },
      ],
    });

    const onThisDay = await prisma.media.create({
      data: {
        album_id: regularAlbum.id,
        uploader_id: user.id,
        original_name: "on-this-day.jpg",
        file_name: "on-this-day.jpg",
        mime_type: "image/jpeg",
        media_type: "image",
        size: 100n,
        width: 100,
        height: 100,
        original_url: "/o/on-this-day",
        preview_url: "/p/on-this-day",
        thumbnail_url: "/t/on-this-day",
        storage_path: "on-this-day.jpg",
        processing_status: "normal",
        status: "normal",
        taken_at: new Date("2024-07-12T08:00:00.000Z"),
        uploaded_at: new Date("2024-07-12T09:00:00.000Z"),
      },
    });

    const yearly = await prisma.media.create({
      data: {
        album_id: regularAlbum.id,
        uploader_id: user.id,
        original_name: "yearly.jpg",
        file_name: "yearly.jpg",
        mime_type: "image/jpeg",
        media_type: "image",
        size: 100n,
        width: 100,
        height: 100,
        original_url: "/o/yearly",
        preview_url: "/p/yearly",
        thumbnail_url: "/t/yearly",
        storage_path: "yearly.jpg",
        processing_status: "normal",
        status: "normal",
        taken_at: new Date("2026-03-05T08:00:00.000Z"),
        uploaded_at: new Date("2026-03-05T09:00:00.000Z"),
      },
    });

    const childPhoto = await prisma.media.create({
      data: {
        album_id: childAlbum.id,
        uploader_id: user.id,
        original_name: "child.jpg",
        file_name: "child.jpg",
        mime_type: "image/jpeg",
        media_type: "image",
        size: 100n,
        width: 100,
        height: 100,
        original_url: "/o/child",
        preview_url: "/p/child",
        thumbnail_url: "/t/child",
        storage_path: "child.jpg",
        processing_status: "normal",
        status: "normal",
        taken_at: new Date("2026-07-05T08:00:00.000Z"),
        uploaded_at: new Date("2026-07-05T09:00:00.000Z"),
      },
    });

    const dashboard = await getMemoryDashboard(prisma, user.id, now);

    expect(dashboard.onThisDay.title).toContain("7月12日");
    expect(dashboard.onThisDay.items.map((item) => item.id)).toContain(onThisDay.id);

    expect(dashboard.childReports).toHaveLength(1);
    expect(dashboard.childReports[0]?.albumId).toBe(childAlbum.id);
    expect(dashboard.childReports[0]?.childAgeLabel).toBe("2岁6个月");
    expect(dashboard.childReports[0]?.items.map((item) => item.id)).toContain(childPhoto.id);

    expect(dashboard.annualHighlights[0]?.year).toBe(2026);
    expect(dashboard.annualHighlights[0]?.items.map((item) => item.id)).toContain(yearly.id);
  });
});
