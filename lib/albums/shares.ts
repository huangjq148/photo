import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { assertAlbumOwner } from "@/lib/membership";

type CreateAlbumShareContext = {
  albumId: string;
  userId: string;
  expiresInHours?: number | null;
  allowDownload?: boolean;
};

type PublicAlbumShareSummary = {
  id: string;
  token: string;
  url: string;
  createdAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  allowDownload: boolean;
};

type AlbumSharePhotoItem = {
  id: string;
  displayName: string | null;
  originalName: string;
  thumbnailUrl: string;
  previewUrl: string;
  originalUrl: string;
  mimeType: string;
  mediaType: string;
  duration: number | null;
  width: number;
  height: number;
  takenAt: string | null;
  uploadedAt: string;
  locationHidden: boolean;
  addedAt: string;
};

type PublicAlbumShareDetail = PublicAlbumShareSummary & {
  albumId: string;
  albumName: string;
  albumDescription: string | null;
  coverUrl: string | null;
  photoCount: number;
  memberCount: number;
  photos: AlbumSharePhotoItem[];
};

const ALLOWED_EXPIRY_HOURS = [null, 24, 168] as const;

function mapShareSummary(share: {
  id: string;
  token: string;
  created_at: Date;
  expires_at: Date | null;
  revoked_at: Date | null;
  allow_download: boolean;
}): PublicAlbumShareSummary {
  return {
    id: share.id,
    token: share.token,
    url: `/share/album/${share.token}`,
    createdAt: share.created_at,
    expiresAt: share.expires_at,
    revokedAt: share.revoked_at,
    allowDownload: share.allow_download,
  };
}

export async function createAlbumShare(prisma: PrismaClient, context: CreateAlbumShareContext): Promise<PublicAlbumShareSummary> {
  await assertAlbumOwner(prisma, context.albumId, context.userId);

  const expiresInHours = context.expiresInHours ?? null;
  if (expiresInHours !== null && !ALLOWED_EXPIRY_HOURS.includes(expiresInHours as 24 | 168)) {
    throw new Error("请选择有效期限");
  }

  const token = randomUUID().replaceAll("-", "");
  const expiresAt =
    expiresInHours !== null && expiresInHours > 0
      ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
      : null;

  const record = await prisma.albumShare.create({
    data: {
      album_id: context.albumId,
      created_by: context.userId,
      token,
      allow_download: context.allowDownload ?? true,
      expires_at: expiresAt,
    },
  });

  return mapShareSummary(record);
}

export async function listAlbumShares(prisma: PrismaClient, context: { albumId: string; userId: string }): Promise<PublicAlbumShareSummary[]> {
  await assertAlbumOwner(prisma, context.albumId, context.userId);

  const shares = await prisma.albumShare.findMany({
    where: {
      album_id: context.albumId,
      created_by: context.userId,
    },
    orderBy: { created_at: "desc" },
  });

  return shares.map(mapShareSummary);
}

export async function revokeAlbumShare(prisma: PrismaClient, shareId: string, userId: string): Promise<void> {
  const share = await prisma.albumShare.findUnique({
    where: { id: shareId },
  });

  if (!share) {
    throw new Error("分享不存在");
  }

  if (share.created_by !== userId) {
    throw new Error("无权管理此分享");
  }

  if (share.revoked_at) {
    return;
  }

  await prisma.albumShare.update({
    where: { id: shareId },
    data: { revoked_at: new Date() },
  });
}

export async function getPublicAlbumShare(prisma: PrismaClient, token: string): Promise<PublicAlbumShareDetail> {
  const share = await resolvePublicAlbumShare(prisma, token);

  return {
    ...mapShareSummary(share),
    albumId: share.album.id,
    albumName: share.album.name,
    albumDescription: share.album.description,
    coverUrl: share.album.coverPhoto?.thumbnail_url ?? null,
    photoCount: share.album.photos.length,
    memberCount: share.album.members.length,
    photos: share.album.photos.map((entry) => ({
      id: entry.media.id,
      displayName: entry.media.display_name,
      originalName: entry.media.original_name,
      thumbnailUrl: entry.media.thumbnail_url,
      previewUrl: entry.media.preview_url,
      originalUrl: entry.media.original_url,
      mimeType: entry.media.mime_type,
      mediaType: entry.media.media_type,
      duration: entry.media.duration_seconds,
      width: entry.media.width,
      height: entry.media.height,
      takenAt: entry.media.taken_at?.toISOString() ?? null,
      uploadedAt: entry.media.uploaded_at.toISOString(),
      locationHidden: entry.media.location_hidden,
      addedAt: entry.added_at.toISOString(),
    })),
  };
}

export async function resolvePublicAlbumShare(prisma: PrismaClient, token: string) {
  const share = await prisma.albumShare.findUnique({
    where: { token },
    include: {
      album: {
        include: {
          coverPhoto: {
            select: { thumbnail_url: true },
          },
          members: {
            select: { id: true },
          },
          photos: {
            where: { media: { status: "normal" } },
            orderBy: { added_at: "desc" },
            include: {
                media: {
                  select: {
                    id: true,
                    display_name: true,
                    original_name: true,
                    storage_path: true,
                    thumbnail_url: true,
                    preview_url: true,
                    original_url: true,
                    mime_type: true,
                    media_type: true,
                  duration_seconds: true,
                  width: true,
                  height: true,
                  taken_at: true,
                  uploaded_at: true,
                  location_hidden: true,
                },
              },
            },
          },
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

  return share;
}

export async function resolvePublicAlbumShareMedia(
  prisma: PrismaClient,
  token: string,
  mediaId: string
) {
  const share = await resolvePublicAlbumShare(prisma, token);
  const media = share.album.photos.find((entry) => entry.media.id === mediaId)?.media;

  if (!media) {
    throw new Error("文件不可用");
  }

  return { share, media };
}
