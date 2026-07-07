import type { PrismaClient } from "@prisma/client";

export type MediaStreamFilter = {
  userId: string;
  mediaType?: "image" | "video";
  albumId?: string;
  uploaderId?: string;
  page: number;
  pageSize: number;
};

export type MediaStreamItem = {
  id: string;
  mediaType: string;
  originalName: string;
  thumbnailUrl: string;
  posterUrl: string | null;
  previewUrl: string;
  playbackUrl: string | null;
  mimeType: string;
  width: number;
  height: number;
  durationSeconds: number | null;
  processingStatus: string;
  takenAt: Date | null;
  uploadedAt: Date;
  albumId: string;
  albumName: string;
  uploaderId: string;
  uploaderName: string;
};

export type MediaStreamPage = {
  items: MediaStreamItem[];
  groups: Array<{ label: string; items: MediaStreamItem[] }>;
  page: number;
  pageSize: number;
  total: number;
};

function clampPage(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

export async function getAccessibleMediaStream(
  prisma: PrismaClient,
  filter: MediaStreamFilter
): Promise<MediaStreamPage> {
  const page = clampPage(filter.page);
  const pageSize = Math.min(Math.max(Math.floor(filter.pageSize), 1), 50);

  const where: Record<string, unknown> = {
    status: "normal",
    album: {
      members: {
        some: { user_id: filter.userId },
      },
    },
  };

  if (filter.mediaType) {
    where.media_type = filter.mediaType;
  }

  if (filter.albumId) {
    where.album_id = filter.albumId;
  }

  if (filter.uploaderId) {
    where.uploader_id = filter.uploaderId;
  }

  const [total, items] = await Promise.all([
    prisma.photo.count({ where }),
    prisma.photo.findMany({
      where,
      orderBy: { uploaded_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        album: {
          select: { id: true, name: true },
        },
        uploader: {
          select: { id: true, nickname: true },
        },
      },
    }),
  ]);

  const mapped: MediaStreamItem[] = items.map((photo) => ({
    id: photo.id,
    mediaType: photo.media_type,
    originalName: photo.original_name,
    thumbnailUrl: photo.thumbnail_url,
    posterUrl: photo.poster_url,
    previewUrl: photo.preview_url,
    playbackUrl: photo.playback_url,
    mimeType: photo.mime_type,
    width: photo.width,
    height: photo.height,
    durationSeconds: photo.duration_seconds,
    processingStatus: photo.processing_status,
    takenAt: photo.taken_at,
    uploadedAt: photo.uploaded_at,
    albumId: photo.album.id,
    albumName: photo.album.name,
    uploaderId: photo.uploader.id,
    uploaderName: photo.uploader.nickname,
  }));

  return {
    items: mapped,
    groups: groupMediaByMonth(mapped.map((item) => ({
      id: item.id,
      takenAt: item.takenAt,
      uploadedAt: item.uploadedAt,
    }))).map((group) => ({
      label: group.label,
      items: group.items.map((g) => mapped.find((m) => m.id === g.id)!),
    })),
    page,
    pageSize,
    total,
  };
}

export function groupMediaByMonth(
  items: Array<{ id: string; takenAt: Date | null; uploadedAt: Date }>
): Array<{ label: string; items: Array<{ id: string }> }> {
  const groups = new Map<string, Array<{ id: string }>>();

  for (const item of items) {
    const date = item.takenAt ?? item.uploadedAt;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key)!.push({ id: item.id });
  }

  // Sort by key descending (newest first)
  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, items]) => {
      const [year, month] = key.split("-");
      return { label: `${year} 年 ${parseInt(month)} 月`, items };
    });
}

export async function getMediaDetail(prisma: PrismaClient, mediaId: string, userId: string): Promise<MediaStreamItem> {
  const media = await prisma.photo.findUnique({
    where: { id: mediaId },
    include: {
      album: {
        select: { id: true, name: true },
      },
      uploader: {
        select: { id: true, nickname: true },
      },
    },
  });

  if (!media) throw new Error("媒体不存在");

  // Check membership
  const membership = await prisma.albumMember.findUnique({
    where: {
      album_id_user_id: {
        album_id: media.album_id,
        user_id: userId,
      },
    },
  });

  if (!membership) {
    // Also check linked albums
    const linkedRef = await prisma.albumPhoto.findFirst({
      where: {
        photo_id: media.id,
        album: {
          members: {
            some: { user_id: userId },
          },
        },
      },
    });

    if (!linkedRef) throw new Error("你不在这个相册中");
  }

  return {
    id: media.id,
    mediaType: media.media_type,
    originalName: media.original_name,
    thumbnailUrl: media.thumbnail_url,
    posterUrl: media.poster_url,
    previewUrl: media.preview_url,
    playbackUrl: media.playback_url,
    mimeType: media.mime_type,
    width: media.width,
    height: media.height,
    durationSeconds: media.duration_seconds,
    processingStatus: media.processing_status,
    takenAt: media.taken_at,
    uploadedAt: media.uploaded_at,
    albumId: media.album.id,
    albumName: media.album.name,
    uploaderId: media.uploader.id,
    uploaderName: media.uploader.nickname,
  };
}
