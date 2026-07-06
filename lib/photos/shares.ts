import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { getPhotoDetails } from "@/lib/photos/library";

type CreatePhotoShareContext = {
  photoId: string;
  userId: string;
  expiresInHours?: number;
};

type PublicShare = {
  token: string;
  url: string;
  expiresAt: Date | null;
};

export async function createPhotoShare(prisma: PrismaClient, context: CreatePhotoShareContext): Promise<PublicShare> {
  const photo = await getPhotoDetails(prisma, {
    photoId: context.photoId,
    userId: context.userId
  });

  if (photo.status === "deleted") {
    throw new Error("无法分享已删除的照片");
  }

  const token = randomUUID().replaceAll("-", "");
  const expiresAt =
    context.expiresInHours && context.expiresInHours > 0
      ? new Date(Date.now() + context.expiresInHours * 60 * 60 * 1000)
      : null;

  await prisma.photoShare.create({
    data: {
      photo_id: photo.id,
      created_by: context.userId,
      token,
      expires_at: expiresAt
    }
  });

  return {
    token,
    url: `/share/${token}`,
    expiresAt
  };
}

export async function getPublicPhotoShare(prisma: PrismaClient, token: string) {
  const share = await prisma.photoShare.findUnique({
    where: { token },
    include: {
      photo: {
        include: {
          album: true
        }
      }
    }
  });

  if (!share) {
    throw new Error("分享链接不存在");
  }

  if (share.revoked_at) {
    throw new Error("分享链接已被撤销");
  }

  if (share.expires_at && share.expires_at.getTime() < Date.now()) {
    throw new Error("分享链接已过期");
  }

  if (share.photo.status === "deleted") {
    throw new Error("照片不可用");
  }

  return {
    token: share.token,
    url: `/share/${share.token}`,
    originalName: share.photo.original_name,
    previewUrl: share.photo.preview_url,
    thumbnailUrl: share.photo.thumbnail_url,
    originalUrl: `/api/photos/${share.photo.id}/download`,
    mimeType: share.photo.mime_type,
    width: share.photo.width,
    height: share.photo.height,
    albumName: share.photo.album.name,
    createdAt: share.created_at,
    expiresAt: share.expires_at
  };
}
