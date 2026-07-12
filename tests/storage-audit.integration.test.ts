import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getStorageLayout } from "@/lib/storage/paths";
import { runStorageConsistencyAudit } from "@/lib/storage/audit";

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jx2kAAAAASUVORK5CYII=",
  "base64"
);

describe("storage consistency audit", () => {
  const storageRoot = mkdtempSync(join(tmpdir(), "storage-audit-"));
  let prisma: PrismaClient;

  beforeAll(() => {
    process.env.STORAGE_ROOT = storageRoot;
    prisma = new PrismaClient();

    const layout = getStorageLayout(storageRoot);
    mkdirSync(layout.originals, { recursive: true });
    mkdirSync(layout.previews, { recursive: true });
    mkdirSync(layout.thumbnails, { recursive: true });
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

  it("reports missing files, orphan files, storage mismatches, and stale processing tasks", async () => {
    const layout = getStorageLayout(storageRoot);

    const owner = await prisma.user.create({
      data: {
        email: `audit-owner-${Date.now()}@photo.test`,
        password_hash: "hash",
        nickname: "Audit Owner",
        storage_used: 999n,
      },
    });

    const album = await prisma.album.create({
      data: {
        creator_id: owner.id,
        name: "Audit Album",
      },
    });

    await prisma.albumMember.create({
      data: {
        album_id: album.id,
        user_id: owner.id,
        role: "owner",
      },
    });

    const imageMedia = await prisma.media.create({
      data: {
        album_id: album.id,
        uploader_id: owner.id,
        original_name: "missing.png",
        file_name: "missing.png",
        mime_type: "image/png",
        media_type: "image",
        size: 100n,
        width: 1,
        height: 1,
        original_url: "/api/files/originals/missing.png",
        preview_url: "/api/files/previews/missing.png",
        thumbnail_url: "/api/files/thumbnails/missing.png",
        storage_path: "missing.png",
        processing_status: "normal",
      },
    });

    const videoStoredId = "video-audit";
    writeFileSync(join(layout.originals, `${videoStoredId}.mp4`), tinyPng);

    await prisma.media.create({
      data: {
        album_id: album.id,
        uploader_id: owner.id,
        original_name: "video.mp4",
        file_name: `${videoStoredId}.mp4`,
        mime_type: "video/mp4",
        media_type: "video",
        size: 200n,
        width: 1920,
        height: 1080,
        duration_seconds: 10,
        original_url: `/api/files/originals/${videoStoredId}.mp4`,
        preview_url: `/api/files/previews/${videoStoredId}_preview.jpg`,
        thumbnail_url: `/api/files/thumbnails/${videoStoredId}_thumb.jpg`,
        storage_path: `${videoStoredId}.mp4`,
        processing_status: "pending",
        uploaded_at: new Date(Date.now() - 10 * 60 * 60 * 1000),
      },
    });

    writeFileSync(join(layout.previews, "orphan-preview.jpg"), tinyPng);
    writeFileSync(join(layout.thumbnails, "orphan-thumb.jpg"), tinyPng);

    const report = await runStorageConsistencyAudit({
      prisma,
      storageRoot,
      now: new Date(),
      staleProcessingAfterHours: 6,
    });

    expect(report.status).toBe("unhealthy");
    expect(report.counts.missingFiles).toBeGreaterThanOrEqual(3);
    expect(report.counts.orphanFiles).toBeGreaterThanOrEqual(2);
    expect(report.counts.storageUsedMismatches).toBe(1);
    expect(report.counts.stuckProcessing).toBe(1);

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "missing_file",
          mediaId: imageMedia.id,
        }),
        expect.objectContaining({
          type: "storage_used_mismatch",
          userId: owner.id,
        }),
        expect.objectContaining({
          type: "stuck_processing",
          mediaId: expect.any(String),
        }),
      ])
    );
  });
});
