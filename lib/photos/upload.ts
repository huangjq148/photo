import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { extname, join } from "node:path";
import sharp from "sharp";
import type { PhotoStatus, PrismaClient } from "@prisma/client";
import { getStorageLayout } from "@/lib/storage/paths";
import { assertAlbumMembership } from "@/lib/membership";

const MAX_UPLOAD_SIZE = 20 * 1024 * 1024;
const SUPPORTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type UploadEnv = {
  storageRoot: string;
  jwtSecret: string;
};

type UploadInput = {
  albumId: string;
  userId: string;
  file: File;
};

type UploadResult = {
  id: string;
  originalName: string;
  mimeType: string;
  width: number;
  height: number;
  status: PhotoStatus;
  originalPath: string;
  previewPath: string;
  thumbnailPath: string;
};

function mimeToExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    default:
      return extname("file.bin") || ".bin";
  }
}

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

export async function uploadPhotoToAlbum(
  prisma: PrismaClient,
  env: UploadEnv,
  input: UploadInput
): Promise<UploadResult> {
  if (!SUPPORTED_MIME_TYPES.has(input.file.type)) {
    throw new Error("不支持的图片格式");
  }

  if (input.file.size > MAX_UPLOAD_SIZE) {
    throw new Error("图片大小超过20MB限制");
  }

  await assertAlbumMembership(prisma, input.albumId, input.userId);

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
          width: metadata.width ?? 0,
          height: metadata.height ?? 0,
          original_url: originalUrl,
          preview_url: previewUrl,
          thumbnail_url: thumbnailUrl,
          storage_path: fileName,
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
      id: photo.id,
      originalName: photo.original_name,
      mimeType: photo.mime_type,
      width: photo.width,
      height: photo.height,
      status: photo.status,
      originalPath,
      previewPath,
      thumbnailPath,
    };
  } catch (error) {
    await cleanupPaths([originalPath, previewPath, thumbnailPath]);
    throw error;
  }
}
