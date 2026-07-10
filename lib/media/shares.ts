import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { getPhotoDetails } from "@/lib/media/library";

type CreatePhotoShareContext = {
  photoId: string;
  userId: string;
  expiresInHours?: number | null;
};

type PublicShare = {
  id: string;
  token: string;
  url: string;
  createdAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
};

const ALLOWED_EXPIRY_HOURS = [null, 24, 168] as const;

export async function createPhotoShare(
  prisma: PrismaClient,
  context: CreatePhotoShareContext
): Promise<PublicShare> {
  const media = await getPhotoDetails(prisma, {
    photoId: context.photoId,
    userId: context.userId,
  });

  if (media.status === "deleted") {
    throw new Error("无法分享已删除的文件");
  }

  const expiresInHours = context.expiresInHours ?? null;
  if (
    expiresInHours !== null &&
    !ALLOWED_EXPIRY_HOURS.includes(expiresInHours as 24 | 168)
  ) {
    throw new Error("请选择有效期限");
  }

  const token = randomUUID().replaceAll("-", "");
  const expiresAt =
    expiresInHours !== null && expiresInHours > 0
      ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
      : null;

  const record = await prisma.photoShare.create({
    data: {
      photo_id: media.id,
      created_by: context.userId,
      token,
      expires_at: expiresAt,
    },
  });

  return {
    id: record.id,
    token: record.token,
    url: `/share/${record.token}`,
    createdAt: record.created_at,
    expiresAt: record.expires_at,
    revokedAt: record.revoked_at,
  };
}

export async function listPhotoShares(
  prisma: PrismaClient,
  context: { photoId: string; userId: string }
): Promise<PublicShare[]> {
  // Check if the user can access this photo via album membership
  const media = await prisma.media.findUnique({
    where: { id: context.photoId },
    include: {
      album: {
        include: {
          members: { where: { user_id: context.userId } },
        },
      },
    },
  });

  if (!media || media.album.members.length === 0) {
    return [];
  }

  const shares = await prisma.photoShare.findMany({
    where: {
      photo_id: context.photoId,
      created_by: context.userId,
    },
    orderBy: { created_at: "desc" },
  });

  return shares.map((s) => ({
    id: s.id,
    token: s.token,
    url: `/share/${s.token}`,
    createdAt: s.created_at,
    expiresAt: s.expires_at,
    revokedAt: s.revoked_at,
  }));
}

export async function revokePhotoShare(
  prisma: PrismaClient,
  shareId: string,
  userId: string
): Promise<void> {
  const share = await prisma.photoShare.findUnique({
    where: { id: shareId },
  });

  if (!share) {
    throw new Error("分享不存在");
  }

  if (share.created_by !== userId) {
    throw new Error("无权管理此分享");
  }

  // Already revoked — idempotent
  if (share.revoked_at) {
    return;
  }

  await prisma.photoShare.update({
    where: { id: shareId },
    data: { revoked_at: new Date() },
  });
}

export async function getPublicPhotoShare(prisma: PrismaClient, token: string) {
  const share = await resolvePublicShare(prisma, token);

  return {
    token: share.token,
    url: `/share/${share.token}`,
    originalName: share.media.original_name,
    previewUrl: share.media.preview_url,
    thumbnailUrl: share.media.thumbnail_url,
    originalUrl: `/api/photos/${share.media.id}/download`,
    mimeType: share.media.mime_type,
    mediaType: share.media.media_type,
    duration: share.media.duration_seconds,
    width: share.media.width,
    height: share.media.height,
    albumName: share.media.album.name,
    createdAt: share.created_at,
    expiresAt: share.expires_at,
  };
}

/** Low-level share resolution — returns the raw Prisma objects for file serving */
export async function resolvePublicShare(prisma: PrismaClient, token: string) {
  const share = await prisma.photoShare.findUnique({
    where: { token },
    include: {
      media: {
        include: {
          album: true,
        },
      },
    },
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

  if (share.media.status === "deleted") {
    throw new Error("文件不可用");
  }

  return share;
}
