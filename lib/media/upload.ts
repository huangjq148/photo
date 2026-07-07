import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { extname, join } from "node:path";
import { parse } from "exifr";
import sharp from "sharp";
import type { PrismaClient } from "@prisma/client";
import { getStorageLayout } from "@/lib/storage/paths";
import { assertCanUpload } from "@/lib/membership";
import { validateMediaFile } from "@/lib/media/validation";
import type { MediaType } from "@/lib/media/types";

type MediaEnv = {
  storageRoot: string;
  maxImageMb: number;
  maxVideoMb: number;
};

type MediaInput = {
  albumId: string;
  userId: string;
  file: File;
};

type MediaUploadResult = {
  id: string;
  originalName: string;
  mimeType: string;
  width: number;
  height: number;
  mediaType: MediaType;
  processingStatus: string;
  originalPath: string;
  previewPath: string | null;
  thumbnailPath: string | null;
};

function mimeToExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "video/mp4":
      return ".mp4";
    case "video/quicktime":
      return ".mov";
    case "video/webm":
      return ".webm";
    default:
      return extname("file.bin") || ".bin";
  }
}

async function ensureStorageDirectories(storageRoot: string) {
  const layout = getStorageLayout(storageRoot);

  await mkdir(layout.originals, { recursive: true });
  await mkdir(layout.previews, { recursive: true });
  await mkdir(layout.thumbnails, { recursive: true });
  await mkdir(layout.posters, { recursive: true });
  await mkdir(layout.playbacks, { recursive: true });

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

async function uploadImageMedia(
  prisma: PrismaClient,
  env: MediaEnv,
  input: MediaInput
): Promise<MediaUploadResult> {
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
  const metadata = await sharp(buffer).metadata();

  const { takenAt, latitude, longitude } = await getImageMeta(input.file, buffer);

  if (!metadata.width || !metadata.height) {
    throw new Error("无法读取图片尺寸");
  }

  const layout = await ensureStorageDirectories(env.storageRoot);
  const storedId = randomUUID();
  const extension = mimeToExtension(input.file.type);
  const fileName = `${storedId}${extension}`;
  const originalPath = join(layout.originals, fileName);
  const previewPath = join(layout.previews, fileName);
  const thumbnailPath = join(layout.thumbnails, fileName);

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

  const fileChecksum = checksum(buffer);
  const originalUrl = `/api/files/originals/${fileName}`;
  const previewUrl = `/api/files/previews/${fileName}`;
  const thumbnailUrl = `/api/files/thumbnails/${fileName}`;

  try {
    const photo = await prisma.$transaction(async (tx) => {
      const created = await tx.photo.create({
        data: {
          id: storedId,
          album_id: input.albumId,
          uploader_id: input.userId,
          original_name: input.file.name,
          file_name: fileName,
          mime_type: input.file.type,
          size: uploadSize,
          original_size: uploadSize,
          width: metadata.width ?? 0,
          height: metadata.height ?? 0,
          taken_at: takenAt,
          latitude,
          longitude,
          original_url: originalUrl,
          preview_url: previewUrl,
          thumbnail_url: thumbnailUrl,
          storage_path: fileName,
          checksum: fileChecksum,
          media_type: "image",
          processing_status: "normal",
          status: "normal",
        },
      });

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

      await tx.album.update({
        where: { id: input.albumId },
        data: { updated_at: new Date() },
      });

      return created;
    });

    return {
      id: photo.id,
      originalName: photo.original_name,
      mimeType: photo.mime_type,
      width: photo.width,
      height: photo.height,
      mediaType: "image",
      processingStatus: photo.processing_status,
      originalPath,
      previewPath,
      thumbnailPath,
    };
  } catch (error) {
    await cleanupPaths([originalPath, previewPath, thumbnailPath]);
    throw error;
  }
}

async function uploadVideoMedia(
  prisma: PrismaClient,
  env: MediaEnv,
  input: MediaInput
): Promise<MediaUploadResult> {
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
  const extension = mimeToExtension(input.file.type);
  const fileName = `${storedId}${extension}`;
  const originalPath = join(layout.originals, fileName);

  const fileChecksum = checksum(buffer);
  const originalUrl = `/api/files/originals/${fileName}`;

  try {
    await writeFile(originalPath, buffer);
  } catch (error) {
    await cleanupPaths([originalPath]);
    throw error;
  }

  try {
    const photo = await prisma.$transaction(async (tx) => {
      const created = await tx.photo.create({
        data: {
          id: storedId,
          album_id: input.albumId,
          uploader_id: input.userId,
          original_name: input.file.name,
          file_name: fileName,
          mime_type: input.file.type,
          size: uploadSize,
          original_size: uploadSize,
          width: 0,
          height: 0,
          original_url: originalUrl,
          preview_url: "",
          thumbnail_url: "",
          storage_path: fileName,
          checksum: fileChecksum,
          media_type: "video",
          processing_status: "pending",
          status: "normal",
        },
      });

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

      await tx.album.update({
        where: { id: input.albumId },
        data: { updated_at: new Date() },
      });

      return created;
    });

    return {
      id: photo.id,
      originalName: photo.original_name,
      mimeType: photo.mime_type,
      width: photo.width,
      height: photo.height,
      mediaType: "video",
      processingStatus: photo.processing_status,
      originalPath,
      previewPath: null,
      thumbnailPath: null,
    };
  } catch (error) {
    await cleanupPaths([originalPath]);
    throw error;
  }
}

export async function uploadMediaToAlbum(
  prisma: PrismaClient,
  env: MediaEnv,
  input: MediaInput
): Promise<MediaUploadResult> {
  const mediaType = validateMediaFile(input.file, {
    maxImageMb: env.maxImageMb,
    maxVideoMb: env.maxVideoMb,
  });

  if (mediaType === "image") {
    return uploadImageMedia(prisma, env, input);
  }

  return uploadVideoMedia(prisma, env, input);
}
