import { mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PrismaClient } from "@prisma/client";
import { getStorageLayout } from "@/lib/storage/paths";
import { runFfprobe, generatePoster, generateThumbnail, transcodePlayback, type CommandRunner } from "@/lib/media/worker/ffmpeg";

type ProcessVideoOptions = {
  storageRoot: string;
  mediaId: string;
  run: CommandRunner;
  transcodePreset?: string;
};

export async function processVideoMedia(
  prisma: PrismaClient,
  options: ProcessVideoOptions
): Promise<void> {
  const media = await prisma.photo.findUnique({
    where: { id: options.mediaId },
  });

  if (!media) throw new Error("媒体不存在");
  if (media.media_type !== "video") throw new Error("媒体不是视频");

  const layout = getStorageLayout(options.storageRoot);

  await mkdir(layout.posters, { recursive: true });
  await mkdir(layout.playbacks, { recursive: true });
  await mkdir(layout.thumbnails, { recursive: true });

  const originalPath = join(layout.originals, media.storage_path);
  const posterFileName = `${media.id}_poster.jpg`;
  const posterPath = join(layout.posters, posterFileName);
  const thumbnailFileName = `${media.id}_thumb.jpg`;
  const thumbnailPath = join(layout.thumbnails, thumbnailFileName);
  const playbackFileName = `${media.id}_playback.mp4`;
  const playbackPath = join(layout.playbacks, playbackFileName);

  let posterSize = 0n;
  let thumbnailSize = 0n;
  let playbackSize = 0n;
  let errorMessage: string | null = null;
  let width = 0;
  let height = 0;
  let duration = 0;
  let codec = "";

  try {
    const probe = await runFfprobe(options.run, originalPath);
    width = probe.width;
    height = probe.height;
    duration = probe.duration;
    codec = probe.codec;
  } catch (error) {
    errorMessage = `ffprobe: ${error instanceof Error ? error.message : "未知错误"}`;
    await prisma.photo.update({
      where: { id: options.mediaId },
      data: {
        processing_status: "failed",
        processing_error: errorMessage,
        updated_at: new Date(),
      },
    });
    return;
  }

  // Generate poster
  try {
    await generatePoster(options.run, originalPath, posterPath);
    const posterStat = await stat(posterPath);
    posterSize = BigInt(posterStat.size);
  } catch {
    // Poster generation is non-critical
  }

  // Generate thumbnail
  try {
    await generateThumbnail(options.run, originalPath, thumbnailPath);
    const thumbStat = await stat(thumbnailPath);
    thumbnailSize = BigInt(thumbStat.size);
  } catch {
    // Thumbnail generation is non-critical
  }

  // Transcode playback
  const preset = options.transcodePreset ?? "medium";
  try {
    await transcodePlayback(options.run, originalPath, playbackPath, preset);
    const playbackStat = await stat(playbackPath);
    playbackSize = BigInt(playbackStat.size);
  } catch (error) {
    errorMessage = `transcode: ${error instanceof Error ? error.message : "未知错误"}`;

    // Keep poster/thumbnail if created, remove incomplete playback
    await prisma.photo.update({
      where: { id: options.mediaId },
      data: {
        width,
        height,
        duration_seconds: duration,
        original_codec: codec,
        poster_url: posterSize > 0n ? `/api/files/posters/${posterFileName}` : null,
        poster_size: posterSize > 0n ? posterSize : null,
        thumbnail_url: thumbnailSize > 0n ? `/api/files/thumbnails/${thumbnailFileName}` : media.thumbnail_url,
        thumbnail_size: thumbnailSize > 0n ? thumbnailSize : null,
        processing_status: "failed",
        processing_error: errorMessage,
        updated_at: new Date(),
      },
    });
    return;
  }

  // Success - update media record to normal
  const posterUrl = posterSize > 0n ? `/api/files/posters/${posterFileName}` : null;
  const playbackUrl = `/api/files/playbacks/${playbackFileName}`;

  await prisma.photo.update({
    where: { id: options.mediaId },
    data: {
      width,
      height,
      duration_seconds: duration,
      original_codec: codec,
      poster_url: posterUrl,
      poster_size: posterSize > 0n ? posterSize : null,
      thumbnail_url: thumbnailSize > 0n
        ? `/api/files/thumbnails/${thumbnailFileName}`
        : media.thumbnail_url,
      thumbnail_size: thumbnailSize > 0n ? thumbnailSize : null,
      playback_url: playbackUrl,
      playback_size: playbackSize,
      processing_status: "normal",
      processing_error: null,
      processed_at: new Date(),
      updated_at: new Date(),
    },
  });
}
