import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getAccessibleMediaStream, groupMediaByMonth } from "@/lib/media/library";
import { uploadMediaToAlbum } from "@/lib/media/upload";

const tinyMp4 = Buffer.from("000000206674797069736f6d0000020069736f6d69736f32617663316d703431", "hex");
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jx2kAAAAASUVORK5CYII=",
  "base64"
);

describe("media library", () => {
  it("groups media by taken date and falls back to upload date", () => {
    const groups = groupMediaByMonth([
      { id: "1", takenAt: new Date("2026-07-01"), uploadedAt: new Date("2026-07-02") },
      { id: "2", takenAt: null, uploadedAt: new Date("2026-06-05") },
    ]);

    expect(groups.map((group) => group.label)).toEqual(["2026 年 7 月", "2026 年 6 月"]);
  });
});

describe("media library DB", () => {
  const storageRoot = mkdtempSync(join(tmpdir(), "media-lib-"));
  let prisma: PrismaClient;

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
    rmSync(storageRoot, { recursive: true, force: true });
  });

  it("returns only accessible media and supports type filter", async () => {
    const user = await prisma.user.create({
      data: { email: `stream-${Date.now()}@photo.test`, password_hash: "hash", nickname: "Stream" },
    });
    const album = await prisma.album.create({ data: { creator_id: user.id, name: "Stream Album" } });
    await prisma.albumMember.create({ data: { album_id: album.id, user_id: user.id, role: "owner" } });

    // Upload an image
    await uploadMediaToAlbum(prisma, {
      storageRoot, maxImageMb: 20, maxVideoMb: 512,
    }, {
      albumId: album.id, userId: user.id,
      file: new File([tinyPng], "photo.png", { type: "image/png" }),
    });

    // Upload a video
    await uploadMediaToAlbum(prisma, {
      storageRoot, maxImageMb: 20, maxVideoMb: 512,
    }, {
      albumId: album.id, userId: user.id,
      file: new File([tinyMp4], "video.mp4", { type: "video/mp4" }),
    });

    // All media
    const all = await getAccessibleMediaStream(prisma, {
      userId: user.id,
      page: 1,
      pageSize: 24,
    });
    expect(all.items.length).toBeGreaterThanOrEqual(2);

    // Image only
    const images = await getAccessibleMediaStream(prisma, {
      userId: user.id,
      mediaType: "image",
      page: 1,
      pageSize: 24,
    });
    expect(images.items.every((item) => item.mediaType === "image")).toBe(true);

    // Video only
    const videos = await getAccessibleMediaStream(prisma, {
      userId: user.id,
      mediaType: "video",
      page: 1,
      pageSize: 24,
    });
    expect(videos.items.every((item) => item.mediaType === "video")).toBe(true);

    // Other user should see nothing
    const other = await prisma.user.create({
      data: { email: `other-${Date.now()}@photo.test`, password_hash: "hash", nickname: "Other" },
    });
    const otherStream = await getAccessibleMediaStream(prisma, {
      userId: other.id,
      page: 1,
      pageSize: 24,
    });
    expect(otherStream.items).toHaveLength(0);
  });
});
