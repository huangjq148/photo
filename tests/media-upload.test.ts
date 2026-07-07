import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { uploadMediaToAlbum } from "@/lib/media/upload";

const tinyMp4 = Buffer.from("000000206674797069736f6d0000020069736f6d69736f32617663316d703431", "hex");
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jx2kAAAAASUVORK5CYII=",
  "base64"
);

describe("media upload", () => {
  const storageRoot = mkdtempSync(join(tmpdir(), "media-upload-"));
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

  it("stores video originals as pending media", async () => {
    const user = await prisma.user.create({
      data: { email: `video-${Date.now()}@photo.test`, password_hash: "hash", nickname: "Video" },
    });
    const album = await prisma.album.create({ data: { creator_id: user.id, name: "Videos" } });
    await prisma.albumMember.create({ data: { album_id: album.id, user_id: user.id, role: "owner" } });

    const result = await uploadMediaToAlbum(prisma, {
      storageRoot,
      maxImageMb: 20,
      maxVideoMb: 512,
    }, {
      albumId: album.id,
      userId: user.id,
      file: new File([tinyMp4], "family.mp4", { type: "video/mp4" }),
    });

    expect(result.mediaType).toBe("video");
    expect(result.processingStatus).toBe("pending");

    const media = await prisma.photo.findUniqueOrThrow({ where: { id: result.id } });
    expect(media.media_type).toBe("video");
    expect(media.processing_status).toBe("pending");
    expect(media.original_size?.toString()).toBe(String(tinyMp4.length));
  });

  it("uploads image media as normal", async () => {
    const user = await prisma.user.create({
      data: { email: `img-${Date.now()}@photo.test`, password_hash: "hash", nickname: "Image" },
    });
    const album = await prisma.album.create({ data: { creator_id: user.id, name: "Images" } });
    await prisma.albumMember.create({ data: { album_id: album.id, user_id: user.id, role: "owner" } });

    const result = await uploadMediaToAlbum(prisma, {
      storageRoot,
      maxImageMb: 20,
      maxVideoMb: 512,
    }, {
      albumId: album.id,
      userId: user.id,
      file: new File([tinyPng], "photo.png", { type: "image/png" }),
    });

    expect(result.mediaType).toBe("image");
    expect(result.processingStatus).toBe("normal");

    const media = await prisma.photo.findUniqueOrThrow({ where: { id: result.id } });
    expect(media.media_type).toBe("image");
    expect(media.processing_status).toBe("normal");
  });
});
