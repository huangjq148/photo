import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { uploadMediaToAlbum } from "@/lib/media/upload";
import { getPublicPhotoShare, createPhotoShare } from "@/lib/photos/shares";

const tinyMp4 = Buffer.from("000000206674797069736f6d0000020069736f6d69736f32617663316d703431", "hex");
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jx2kAAAAASUVORK5CYII=",
  "base64"
);

describe("media shares", () => {
  const storageRoot = mkdtempSync(join(tmpdir(), "media-shares-"));
  let prisma: PrismaClient;

  beforeAll(() => {
    process.env.STORAGE_ROOT = storageRoot;
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.albumInvite.deleteMany();
    await prisma.photoShare.deleteMany();
    await prisma.albumPhoto.deleteMany();
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

  it("pending video share does not expose originalUrl or playbackUrl", async () => {
    const user = await prisma.user.create({
      data: { email: `share-vid-${Date.now()}@photo.test`, password_hash: "hash", nickname: "Sharer" },
    });
    const album = await prisma.album.create({ data: { creator_id: user.id, name: "Share Album" } });
    await prisma.albumMember.create({ data: { album_id: album.id, user_id: user.id, role: "owner" } });

    const uploaded = await uploadMediaToAlbum(prisma, {
      storageRoot, maxImageMb: 20, maxVideoMb: 512,
    }, {
      albumId: album.id, userId: user.id,
      file: new File([tinyMp4], "video.mp4", { type: "video/mp4" }),
    });

    const share = await createPhotoShare(prisma, { photoId: uploaded.id, userId: user.id });
    const publicShare = await getPublicPhotoShare(prisma, share.token);

    // pending video should not expose originalUrl or playbackUrl
    expect((publicShare as Record<string, unknown>).playbackUrl ?? null).toBeNull();
    expect(publicShare.originalUrl).toBeNull();
  });

  it("image share preserves originalUrl", async () => {
    const user = await prisma.user.create({
      data: { email: `share-img-${Date.now()}@photo.test`, password_hash: "hash", nickname: "Sharer" },
    });
    const album = await prisma.album.create({ data: { creator_id: user.id, name: "Share Album" } });
    await prisma.albumMember.create({ data: { album_id: album.id, user_id: user.id, role: "owner" } });

    const uploaded = await uploadMediaToAlbum(prisma, {
      storageRoot, maxImageMb: 20, maxVideoMb: 512,
    }, {
      albumId: album.id, userId: user.id,
      file: new File([tinyPng], "photo.png", { type: "image/png" }),
    });

    const share = await createPhotoShare(prisma, { photoId: uploaded.id, userId: user.id });
    const publicShare = await getPublicPhotoShare(prisma, share.token);

    expect(publicShare.originalUrl).toMatch(/\/api\/photos\//);
  });

  it("ready video share exposes token-validated playbackUrl", async () => {
    const user = await prisma.user.create({
      data: { email: `share-ready-${Date.now()}@photo.test`, password_hash: "hash", nickname: "Sharer" },
    });
    const album = await prisma.album.create({ data: { creator_id: user.id, name: "Share Album" } });
    await prisma.albumMember.create({ data: { album_id: album.id, user_id: user.id, role: "owner" } });

    // Create a normal video manually
    const media = await prisma.photo.create({
      data: {
        album_id: album.id,
        uploader_id: user.id,
        original_name: "ready.mp4",
        file_name: "ready.mp4",
        mime_type: "video/mp4",
        media_type: "video",
        size: 4n,
        original_size: 4n,
        width: 1920,
        height: 1080,
        original_url: "/api/files/originals/ready.mp4",
        preview_url: "",
        thumbnail_url: "",
        storage_path: "ready.mp4",
        processing_status: "normal",
        status: "normal",
        playback_url: "/api/files/playbacks/ready.mp4",
        duration_seconds: 60,
      },
    });

    const share = await createPhotoShare(prisma, { photoId: media.id, userId: user.id });
    const publicShare = await getPublicPhotoShare(prisma, share.token);

    expect((publicShare as Record<string, unknown>).playbackUrl).toBe(`/api/share/${share.token}/playback`);
    expect(publicShare.originalUrl).toBeNull();
  });
});
