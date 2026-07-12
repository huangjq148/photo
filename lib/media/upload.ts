import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parse } from "exifr";
import sharp from "sharp";
import type { PhotoStatus, PrismaClient } from "@prisma/client";
import { getStorageLayout } from "@/lib/storage/paths";
import { assertCanUpload } from "@/lib/membership";
import {
  SUPPORTED_MIME_TYPES,
  SUPPORTED_VIDEO_TYPES,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  mimeToExtension,
  getVideoMeta,
  extractVideoFrame,
} from "@/lib/media/video";

type UploadEnv = {
  storageRoot: string;
  jwtSecret: string;
};

type UploadInput = {
  albumId: string;
  userId: string;
  file: File;
};

export type UploadResult = {
  id: string;
  originalName: string;
  mimeType: string;
  mediaType: "image" | "video";
  width: number;
  height: number;
  duration: number | null;
  status: PhotoStatus;
  originalPath: string;
  previewPath: string;
  thumbnailPath: string;
};

async function ensureStorageDirectories(storageRoot: string) {
  const layout = getStorageLayout(storageRoot);

  await mkdir(layout.originals, { recursive: true });
  await mkdir(layout.previews, { recursive: true });
  await mkdir(layout.thumbnails, { recursive: true });

  return layout;
}

function checksum(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

async function cleanupPaths(paths: string[]) {
  await Promise.all(
    paths.map(async (path) => {
      try {
        await rm(path, { force: true });
      } catch {
        // Ignore cleanup failures during rollback.
      }
    })
  );
}

async function getImageMeta(
  file: File,
  buffer: Buffer
): Promise<{ takenAt: Date | null; latitude: number | null; longitude: number | null }> {
  let takenAt: Date | null = null;
  let latitude: number | null = null;
  let longitude: number | null = null;

  try {
    const exif = await parse(buffer, { gps: true });

    if (exif?.DateTimeOriginal) {
      takenAt = new Date(exif.DateTimeOriginal);
    } else if (exif?.CreateDate) {
      takenAt = new Date(exif.CreateDate);
    }

    if (exif?.latitude != null && exif?.longitude != null) {
      latitude = Number(exif.latitude);
      longitude = Number(exif.longitude);
    }
  } catch {
    // EXIF parsing is best-effort
  }

  if (!takenAt) {
    takenAt = new Date(file.lastModified);
  }

  return { takenAt, latitude, longitude };
}

export async function uploadPhotoToAlbum(
  prisma: PrismaClient,
  env: UploadEnv,
  input: UploadInput
): Promise<UploadResult> {
  if (!SUPPORTED_MIME_TYPES.has(input.file.type)) {
    throw new Error("不支持的图片/视频格式");
  }

  const isVideo = SUPPORTED_VIDEO_TYPES.has(input.file.type);
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

  if (input.file.size > maxSize) {
    throw new Error(isVideo ? "视频大小超过500MB限制" : "图片大小超过20MB限制");
  }

  await assertCanUpload(prisma, input.albumId, input.userId);

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
  });

  if (!user) {
    throw new Error("用户不存在");
  }

  const uploadSize = BigInt(input.file.size);
  if (user.storage_used + uploadSize > user.storage_limit) {
    throw new Error("存储空间不足");
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const layout = await ensureStorageDirectories(env.storageRoot);
  const storedId = randomUUID();

  let width: number;
  let height: number;
  let duration: number | null = null;
  let takenAt: Date | null = null;
  let latitude: number | null = null;
  let longitude: number | null = null;

  let extension: string;
  let originalPath: string;
  let previewPath: string;
  let thumbnailPath: string;
  let originalUrl: string;
  let previewUrl: string;
  let thumbnailUrl: string;
  let fileChecksum: string;

  if (isVideo) {
    // ── Video processing ──
    extension = mimeToExtension(input.file.type);
    const videoFileName = `${storedId}${extension}`;
    const thumbFileName = `${storedId}_thumb.jpg`;
    const previewFileName = `${storedId}_preview.jpg`;

    originalPath = join(layout.originals, videoFileName);
    previewPath = join(layout.previews, previewFileName);
    thumbnailPath = join(layout.thumbnails, thumbFileName);

    originalUrl = `/api/files/originals/${videoFileName}`;
    previewUrl = `/api/files/previews/${previewFileName}`;
    thumbnailUrl = `/api/files/thumbnails/${thumbFileName}`;

    // Write video to a temp file for FFmpeg processing
    const tmpVideoPath = join(tmpdir(), `${storedId}${extension}`);
    await writeFile(tmpVideoPath, buffer);

    try {
      const meta = await getVideoMeta(tmpVideoPath);
      width = meta.width;
      height = meta.height;
      duration = meta.duration;

      await Promise.all([
        extractVideoFrame(tmpVideoPath, previewPath, 2048),
        extractVideoFrame(tmpVideoPath, thumbnailPath, 512),
      ]);

      // Copy original from temp to storage
      await writeFile(originalPath, buffer);
    } catch (error) {
      await cleanupPaths([tmpVideoPath, originalPath, previewPath, thumbnailPath]);
      throw error;
    } finally {
      await rm(tmpVideoPath, { force: true });
    }

    fileChecksum = checksum(buffer);
    takenAt = new Date(input.file.lastModified);
  } else {
    // ── Image processing (existing pipeline) ──
    const metadata = await sharp(buffer).metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error("无法读取图片尺寸");
    }

    const exif = await getImageMeta(input.file, buffer);
    takenAt = exif.takenAt;
    latitude = exif.latitude;
    longitude = exif.longitude;

    width = metadata.width;
    height = metadata.height;
    extension = mimeToExtension(input.file.type);
    const fileName = `${storedId}${extension}`;

    originalPath = join(layout.originals, fileName);
    previewPath = join(layout.previews, fileName);
    thumbnailPath = join(layout.thumbnails, fileName);

    originalUrl = `/api/files/originals/${fileName}`;
    previewUrl = `/api/files/previews/${fileName}`;
    thumbnailUrl = `/api/files/thumbnails/${fileName}`;

    const baseImage = sharp(buffer).rotate();

    try {
      await Promise.all([
        writeFile(originalPath, buffer),
        baseImage.clone().resize({ width: 2048, withoutEnlargement: true }).toFile(previewPath),
        baseImage.clone().resize({ width: 512, withoutEnlargement: true }).toFile(thumbnailPath),
      ]);
    } catch (error) {
      await cleanupPaths([originalPath, previewPath, thumbnailPath]);
      throw error;
    }

    fileChecksum = checksum(buffer);
  }

  try {
    const media = await prisma.$transaction(async (tx) => {
      const created = await tx.media.create({
        data: {
          id: storedId,
          album_id: input.albumId,
          uploader_id: input.userId,
          original_name: input.file.name,
          file_name: extension === ".bin" ? `${storedId}${extension}` : `${storedId}${extension}`,
          mime_type: input.file.type,
          media_type: isVideo ? "video" : "image",
          duration_seconds: duration,
          size: uploadSize,
          width,
          height,
          taken_at: takenAt,
          latitude,
          longitude,
          original_url: originalUrl,
          preview_url: previewUrl,
          thumbnail_url: thumbnailUrl,
          storage_path: isVideo ? `${storedId}${extension}` : `${storedId}${extension}`,
          checksum: fileChecksum,
          processing_status: "normal",
          status: "normal",
        },
      });

      // Add reference to the upload album
      await tx.albumPhoto.create({
        data: {
          album_id: input.albumId,
          photo_id: created.id,
          added_by: input.userId,
        },
      });

      await tx.user.update({
        where: { id: input.userId },
        data: {
          storage_used: { increment: uploadSize },
        },
      });

      // Touch album updated_at
      await tx.album.update({
        where: { id: input.albumId },
        data: { updated_at: new Date() },
      });

      return created;
    });

    return {
      id: media.id,
      originalName: media.original_name,
      mimeType: media.mime_type,
      mediaType: media.media_type as "image" | "video",
      width: media.width,
      height: media.height,
      duration: media.duration_seconds,
      status: media.status,
      originalPath,
      previewPath,
      thumbnailPath,
    };
  } catch (error) {
    await cleanupPaths([originalPath, previewPath, thumbnailPath]);
    throw error;
  }
}
