import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { uploadPhotoToAlbum } from "@/lib/photos/upload";
import {
  createPhotoShare,
  getPublicPhotoShare,
  listPhotoShares,
  revokePhotoShare,
} from "@/lib/media/shares";

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jx2kAAAAASUVORK5CYII=",
  "base64"
);

async function createUserWithPhoto(prisma: PrismaClient, storageRoot: string, suffix = "") {
  const user = await prisma.user.create({
    data: {
      email: `share${suffix}-${Date.now()}@photo.test`,
      password_hash: "hash",
      nickname: "Sharer",
    },
  });

  const album = await prisma.album.create({
    data: { creator_id: user.id, name: "Share Album" },
  });

  await prisma.albumMember.create({
    data: { album_id: album.id, user_id: user.id, role: "owner" },
  });

  const uploaded = await uploadPhotoToAlbum(
    prisma,
    { storageRoot, jwtSecret: "x".repeat(32) },
    {
      albumId: album.id,
      userId: user.id,
      file: new File([tinyPng], `share${suffix}.png`, { type: "image/png" }),
    }
  );

  return { user, album, photo: uploaded };
}

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
    await prisma.media.deleteMany();
    await prisma.albumMember.deleteMany();
    await prisma.album.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    rmSync(storageRoot, { recursive: true, force: true });
  });

  it("creates and resolves public share links", async () => {
    const { user, photo } = await createUserWithPhoto(prisma, storageRoot);

    const share = await createPhotoShare(prisma, {
      photoId: photo.id,
      userId: user.id,
    });

    expect(share.url).toMatch(/^\/share\//);

    const publicShare = await getPublicPhotoShare(prisma, share.token);
    expect(publicShare.originalName).toBe("share.png");
    expect(publicShare.albumName).toBe("Share Album");
  });

  it("creates a share with 24-hour expiry", async () => {
    const { user, photo } = await createUserWithPhoto(prisma, storageRoot, "-24h");

    const share = await createPhotoShare(prisma, {
      photoId: photo.id,
      userId: user.id,
      expiresInHours: 24,
    });

    expect(share.expiresAt).not.toBeNull();
    const expiresMs = share.expiresAt!.getTime() - Date.now();
    expect(expiresMs).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(expiresMs).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 5000);
  });

  it("creates a share with 168-hour (7-day) expiry", async () => {
    const { user, photo } = await createUserWithPhoto(prisma, storageRoot, "-168h");

    const share = await createPhotoShare(prisma, {
      photoId: photo.id,
      userId: user.id,
      expiresInHours: 168,
    });

    expect(share.expiresAt).not.toBeNull();
  });

  it("rejects invalid expiresInHours values", async () => {
    const { user, photo } = await createUserWithPhoto(prisma, storageRoot, "-inv");

    await expect(
      createPhotoShare(prisma, {
        photoId: photo.id,
        userId: user.id,
        expiresInHours: 12,
      })
    ).rejects.toThrow(/有效期/);

    await expect(
      createPhotoShare(prisma, {
        photoId: photo.id,
        userId: user.id,
        expiresInHours: 0,
      })
    ).rejects.toThrow(/有效期/);
  });

  it("rejects expired share", async () => {
    const { user, photo } = await createUserWithPhoto(prisma, storageRoot, "-exp");

    const share = await createPhotoShare(prisma, {
      photoId: photo.id,
      userId: user.id,
      expiresInHours: 24,
    });

    // Manually expire the share
    await prisma.photoShare.update({
      where: { id: share.id },
      data: { expires_at: new Date(Date.now() - 1000) },
    });

    await expect(getPublicPhotoShare(prisma, share.token)).rejects.toThrow(/过期/);
  });

  it("rejects revoked share", async () => {
    const { user, photo } = await createUserWithPhoto(prisma, storageRoot, "-rev");

    const share = await createPhotoShare(prisma, {
      photoId: photo.id,
      userId: user.id,
    });

    await revokePhotoShare(prisma, share.id, user.id);

    await expect(getPublicPhotoShare(prisma, share.token)).rejects.toThrow(/撤销/);
  });

  it("rejects share for deleted media", async () => {
    const { user, photo, album } = await createUserWithPhoto(prisma, storageRoot, "-del");

    const share = await createPhotoShare(prisma, {
      photoId: photo.id,
      userId: user.id,
    });

    // Soft-delete the media
    await prisma.media.update({
      where: { id: photo.id },
      data: { status: "deleted", deleted_at: new Date(), deleted_by: user.id },
    });

    await expect(getPublicPhotoShare(prisma, share.token)).rejects.toThrow(/不可用/);
  });

  it("lists only the current creator's shares", async () => {
    const { user, photo: photo1 } = await createUserWithPhoto(prisma, storageRoot, "-la");

    const share1 = await createPhotoShare(prisma, {
      photoId: photo1.id,
      userId: user.id,
    });

    // Create another user and photo
    const otherUser = await prisma.user.create({
      data: {
        email: `other-${Date.now()}@photo.test`,
        password_hash: "hash",
        nickname: "Other",
      },
    });

    const album2 = await prisma.album.create({
      data: { creator_id: otherUser.id, name: "Other Album" },
    });

    await prisma.albumMember.create({
      data: { album_id: album2.id, user_id: otherUser.id, role: "owner" },
      // Also add first user as member so they can access
    });

    await prisma.albumMember.create({
      data: { album_id: album2.id, user_id: user.id, role: "member" },
    });

    const photo2 = await uploadPhotoToAlbum(
      prisma,
      { storageRoot, jwtSecret: "x".repeat(32) },
      {
        albumId: album2.id,
        userId: otherUser.id,
        file: new File([tinyPng], "other.png", { type: "image/png" }),
      }
    );

    await createPhotoShare(prisma, {
      photoId: photo2.id,
      userId: otherUser.id,
    });

    // List as first user — should only see their own share
    const myShares = await listPhotoShares(prisma, { photoId: photo1.id, userId: user.id });
    expect(myShares).toHaveLength(1);
    expect(myShares[0].id).toBe(share1.id);

    // List as other user on photo1 — should see nothing
    const otherShares = await listPhotoShares(prisma, { photoId: photo1.id, userId: otherUser.id });
    expect(otherShares).toHaveLength(0);
  });

  it("revokes share idempotently", async () => {
    const { user, photo } = await createUserWithPhoto(prisma, storageRoot, "-ido");

    const share = await createPhotoShare(prisma, {
      photoId: photo.id,
      userId: user.id,
    });

    // First revoke — should succeed
    await revokePhotoShare(prisma, share.id, user.id);

    const revoked = await prisma.photoShare.findUnique({ where: { id: share.id } });
    expect(revoked?.revoked_at).not.toBeNull();

    // Second revoke — should not throw
    await revokePhotoShare(prisma, share.id, user.id);
  });

  it("prevents non-creator from revoking a share", async () => {
    const { user, photo } = await createUserWithPhoto(prisma, storageRoot, "-ncr");

    const share = await createPhotoShare(prisma, {
      photoId: photo.id,
      userId: user.id,
    });

    const otherUser = await prisma.user.create({
      data: {
        email: `revoker-${Date.now()}@photo.test`,
        password_hash: "hash",
        nickname: "Revoker",
      },
    });

    await expect(
      revokePhotoShare(prisma, share.id, otherUser.id)
    ).rejects.toThrow(/无权/);
  });
});
