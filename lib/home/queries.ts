import type { PrismaClient } from "@prisma/client";

export type RecentPhoto = {
  id: string;
  thumbnailUrl: string;
  previewUrl: string;
  originalName: string;
  albumId: string;
  albumName: string;
  uploadedAt: Date;
};

export async function getUserAlbumIds(
  prisma: PrismaClient,
  userId: string
): Promise<string[]> {
  const memberships = await prisma.albumMember.findMany({
    where: { user_id: userId },
    select: { album_id: true },
  });
  return memberships.map((m) => m.album_id);
}

export async function getUserPhotoCount(
  prisma: PrismaClient,
  userId: string
): Promise<number> {
  const albumIds = await getUserAlbumIds(prisma, userId);
  if (albumIds.length === 0) return 0;

  return prisma.media.count({
    where: {
      album_id: { in: albumIds },
      status: "normal",
    },
  });
}

export async function getRecentPhotos(
  prisma: PrismaClient,
  userId: string,
  limit = 12
): Promise<RecentPhoto[]> {
  const albumIds = await getUserAlbumIds(prisma, userId);
  if (albumIds.length === 0) return [];

  const media = await prisma.media.findMany({
    where: {
      album_id: { in: albumIds },
      status: "normal",
    },
    orderBy: { uploaded_at: "desc" },
    take: limit,
    include: {
      album: {
        select: { name: true },
      },
    },
  });

  return media.map((m) => ({
    id: m.id,
    thumbnailUrl: m.thumbnail_url,
    previewUrl: m.preview_url,
    originalName: m.original_name,
    albumId: m.album_id,
    albumName: m.album.name,
    uploadedAt: m.uploaded_at,
  }));
}
