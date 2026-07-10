import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createPhotoShare } from "@/lib/media/shares";
import { servePublicShareFile } from "@/lib/media/public-files";
import { getStorageLayout } from "@/lib/storage/paths";

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jx2kAAAAASUVORK5CYII=",
  "base64"
);

function createFakeImage(storageRoot: string, storedId: string) {
  const layout = getStorageLayout(storageRoot);
  mkdirSync(layout.originals, { recursive: true });
  mkdirSync(layout.previews, { recursive: true });
  mkdirSync(layout.thumbnails, { recursive: true });

  const imgPath = join(layout.originals, `${storedId}.png`);
  writeFileSync(imgPath, tinyPng);
  writeFileSync(join(layout.previews, `${storedId}.png`), tinyPng);
  writeFileSync(join(layout.thumbnails, `${storedId}.png`), tinyPng);
}

describe("public share file serving", () => {
  const storageRoot = mkdtempSync(join(tmpdir(), "public-files-"));
  let prisma: PrismaClient;

  beforeAll(() => {
    process.env.STORAGE_ROOT = storageRoot;
    prisma = new PrismaClient();
  });

  afterAll(async () => {
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

  it("serves thumbnail variant for a valid share", async () => {
    const user = await prisma.user.create({
      data: {
        email: `pf-${Date.now()}@photo.test`,
        password_hash: "hash",
        nickname: "Server",
      },
    });

    const album = await prisma.album.create({
      data: { creator_id: user.id, name: "PF Album" },
    });

    await prisma.albumMember.create({
      data: { album_id: album.id, user_id: user.id, role: "owner" },
    });

    const storedId = `a${Date.now()}`;
    createFakeImage(storageRoot, storedId);

    const media = await prisma.media.create({
      data: {
        album_id: album.id,
        uploader_id: user.id,
        original_name: "test.png",
        file_name: `${storedId}.png`,
        mime_type: "image/png",
        media_type: "image",
        size: tinyPng.length,
        width: 1,
        height: 1,
        original_url: `/api/files/originals/${storedId}.png`,
        preview_url: `/api/files/previews/${storedId}.png`,
        thumbnail_url: `/api/files/thumbnails/${storedId}.png`,
        storage_path: `${storedId}.png`,
        processing_status: "normal",
      },
    });

    const share = await createPhotoShare(prisma, {
      photoId: media.id,
      userId: user.id,
    });

    const response = await servePublicShareFile(prisma, storageRoot, share.token, "thumbnail");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("serves preview variant", async () => {
    const user = await prisma.user.create({
      data: {
        email: `pf-prev-${Date.now()}@photo.test`,
        password_hash: "hash",
        nickname: "Server2",
      },
    });

    const album = await prisma.album.create({
      data: { creator_id: user.id, name: "PF Album" },
    });

    await prisma.albumMember.create({
      data: { album_id: album.id, user_id: user.id, role: "owner" },
    });

    const storedId = `b${Date.now()}`;
    createFakeImage(storageRoot, storedId);

    const media = await prisma.media.create({
      data: {
        album_id: album.id,
        uploader_id: user.id,
        original_name: "preview.png",
        file_name: `${storedId}.png`,
        mime_type: "image/png",
        media_type: "image",
        size: tinyPng.length,
        width: 1,
        height: 1,
        original_url: `/api/files/originals/${storedId}.png`,
        preview_url: `/api/files/previews/${storedId}.png`,
        thumbnail_url: `/api/files/thumbnails/${storedId}.png`,
        storage_path: `${storedId}.png`,
        processing_status: "normal",
      },
    });

    const share = await createPhotoShare(prisma, { photoId: media.id, userId: user.id });

    const response = await servePublicShareFile(prisma, storageRoot, share.token, "preview");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
  });

  it("serves original variant", async () => {
    const user = await prisma.user.create({
      data: {
        email: `pf-orig-${Date.now()}@photo.test`,
        password_hash: "hash",
        nickname: "Server3",
      },
    });

    const album = await prisma.album.create({
      data: { creator_id: user.id, name: "PF Album" },
    });

    await prisma.albumMember.create({
      data: { album_id: album.id, user_id: user.id, role: "owner" },
    });

    const storedId = `c${Date.now()}`;
    createFakeImage(storageRoot, storedId);

    const media = await prisma.media.create({
      data: {
        album_id: album.id,
        uploader_id: user.id,
        original_name: "original.png",
        file_name: `${storedId}.png`,
        mime_type: "image/png",
        media_type: "image",
        size: tinyPng.length,
        width: 1,
        height: 1,
        original_url: `/api/files/originals/${storedId}.png`,
        preview_url: `/api/files/previews/${storedId}.png`,
        thumbnail_url: `/api/files/thumbnails/${storedId}.png`,
        storage_path: `${storedId}.png`,
        processing_status: "normal",
      },
    });

    const share = await createPhotoShare(prisma, { photoId: media.id, userId: user.id });

    const response = await servePublicShareFile(prisma, storageRoot, share.token, "original");
    expect(response.status).toBe(200);
  });

  it("rejects invalid token", async () => {
    await expect(
      servePublicShareFile(prisma, storageRoot, "nonexistent-token", "thumbnail")
    ).rejects.toThrow();
  });

  it("rejects invalid variant", async () => {
    const user = await prisma.user.create({
      data: {
        email: `pf-inv-${Date.now()}@photo.test`,
        password_hash: "hash",
        nickname: "Server4",
      },
    });

    const album = await prisma.album.create({
      data: { creator_id: user.id, name: "PF Album" },
    });

    await prisma.albumMember.create({
      data: { album_id: album.id, user_id: user.id, role: "owner" },
    });

    const storedId = `d${Date.now()}`;
    createFakeImage(storageRoot, storedId);

    const media = await prisma.media.create({
      data: {
        album_id: album.id,
        uploader_id: user.id,
        original_name: "inv.png",
        file_name: `${storedId}.png`,
        mime_type: "image/png",
        media_type: "image",
        size: tinyPng.length,
        width: 1,
        height: 1,
        original_url: `/api/files/originals/${storedId}.png`,
        preview_url: `/api/files/previews/${storedId}.png`,
        thumbnail_url: `/api/files/thumbnails/${storedId}.png`,
        storage_path: `${storedId}.png`,
        processing_status: "normal",
      },
    });

    const share = await createPhotoShare(prisma, { photoId: media.id, userId: user.id });

    await expect(
      servePublicShareFile(prisma, storageRoot, share.token as string, "hacked" as "thumbnail")
    ).rejects.toThrow();
  });
});
