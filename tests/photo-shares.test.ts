import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { uploadPhotoToAlbum } from "@/lib/photos/upload";
import { createPhotoShare, getPublicPhotoShare } from "@/lib/photos/shares";

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jx2kAAAAASUVORK5CYII=",
  "base64"
);

describe("photo shares", () => {
  const storageRoot = mkdtempSync(join(tmpdir(), "photo-shares-"));
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

  it("creates and resolves public share links", async () => {
    const user = await prisma.user.create({
      data: {
        email: `share-${Date.now()}@photo.test`,
        password_hash: "hash",
        nickname: "Sharer"
      }
    });

    const album = await prisma.album.create({
      data: {
        creator_id: user.id,
        name: "Share Album"
      }
    });

    await prisma.albumMember.create({
      data: {
        album_id: album.id,
        user_id: user.id,
        role: "owner"
      }
    });

    const uploaded = await uploadPhotoToAlbum(prisma, {
      storageRoot,
      jwtSecret: "x".repeat(32)
    }, {
      albumId: album.id,
      userId: user.id,
      file: new File([tinyPng], "share.png", { type: "image/png" })
    });

    const share = await createPhotoShare(prisma, {
      photoId: uploaded.id,
      userId: user.id
    });

    expect(share.url).toMatch(/^\/share\//);

    const publicShare = await getPublicPhotoShare(prisma, share.token);
    expect(publicShare.originalName).toBe("share.png");
    expect(publicShare.albumName).toBe("Share Album");
  });
});
