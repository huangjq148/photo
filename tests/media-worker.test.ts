import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { processVideoMedia } from "@/lib/media/worker/process-video";

describe("media worker", () => {
  const storageRoot = mkdtempSync(join(tmpdir(), "media-worker-"));
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.photo.deleteMany();
    await prisma.albumMember.deleteMany();
    await prisma.album.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    rmSync(storageRoot, { recursive: true, force: true });
  });

  it("marks video normal after generated outputs exist", async () => {
    const user = await prisma.user.create({ data: { email: `worker-${Date.now()}@photo.test`, password_hash: "hash", nickname: "Worker" } });
    const album = await prisma.album.create({ data: { creator_id: user.id, name: "Worker Album" } });
    const media = await prisma.photo.create({
      data: {
        album_id: album.id,
        uploader_id: user.id,
        original_name: "worker.mp4",
        file_name: "worker.mp4",
        mime_type: "video/mp4",
        media_type: "video",
        size: 4n,
        original_size: 4n,
        width: 0,
        height: 0,
        original_url: "/api/files/originals/worker.mp4",
        preview_url: "",
        thumbnail_url: "",
        storage_path: "worker.mp4",
        processing_status: "processing",
        status: "normal",
      },
    });

    mkdirSync(join(storageRoot, "originals"), { recursive: true });
    writeFileSync(join(storageRoot, "originals", "worker.mp4"), "test");

    await processVideoMedia(prisma, {
      storageRoot,
      mediaId: media.id,
      run: async (_command, _args, options) => {
        if (options?.outputPath) writeFileSync(options.outputPath, "generated");
        return { stdout: JSON.stringify({ streams: [{ codec_type: "video", width: 1920, height: 1080, codec_name: "h264" }], format: { duration: "12.5" } }) };
      },
    });

    const updated = await prisma.photo.findUniqueOrThrow({ where: { id: media.id } });
    expect(updated.processing_status).toBe("normal");
    expect(updated.duration_seconds).toBe(12.5);
    expect(updated.playback_url).toContain("/api/files/playbacks/");
  });
});
