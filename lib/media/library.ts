import { rm } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import type { PrismaClient } from "@prisma/client";
import { getStorageLayout } from "@/lib/storage/paths";
import { assertAlbumMembership } from "@/lib/membership";

type MediaContext = {
  photoId: string;
  userId: string;
};

type BatchMediaContext = {
  albumId: string;
  photoIds: string[];
  userId: string;
};

type ListContext = {
  albumId: string;
  userId: string;
  page: number;
  pageSize: number;
  keyword?: string;
  uploaderId?: string;
  sortBy?: "uploadedAt" | "takenAt" | "fileName" | "size";
  sortOrder?: "asc" | "desc";
};

type TrashContext = {
  userId: string;
  page: number;
  pageSize: number;
};

type MediaListItem = {
  id: string;
  originalName: string;
  thumbnailUrl: string;
  previewUrl: string;
  originalUrl: string;
  mimeType: string;
  mediaType: string;
  duration: number | null;
  width: number;
  height: number;
  status: "normal" | "deleted";
  uploadedAt: Date;
  deletedAt: Date | null;
};

type MediaDetail = MediaListItem & {
  albumId: string;
  uploaderId: string;
  deletedBy: string | null;
  storagePath: string;
  isFavorited: boolean;
};

type MediaPage<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

type MediaRecord = {
  id: string;
  album_id: string;
  uploader_id: string;
  storage_path: string;
  status: "normal" | "deleted";
  deleted_by: string | null;
  deleted_at: Date | null;
  size: bigint;
  original_name: string;
  thumbnail_url: string;
  preview_url: string;
  original_url: string;
  mime_type: string;
  media_type: string;
  duration_seconds: number | null;
  width: number;
  height: number;
  uploaded_at: Date;
  album: {
    creator_id: string;
  };
  albumPhotos?: { album_id: string; album: { creator_id: string } }[];
  favorites?: { id: string }[];
};

function clampPage(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

async function assertMediaAccessible(
  prisma: PrismaClient,
  media: { album_id: string; albumPhotos?: { album_id: string }[] },
  userId: string
) {
  const owningMembership = await prisma.albumMember.findUnique({
    where: {
      album_id_user_id: {
        album_id: media.album_id,
        user_id: userId,
      },
    },
  });

  if (owningMembership) return;

  if (media.albumPhotos && media.albumPhotos.length > 0) {
    const linkedAlbumIds = media.albumPhotos.map((ap) => ap.album_id);
    const linkedMembership = await prisma.albumMember.findFirst({
      where: {
        album_id: { in: linkedAlbumIds },
        user_id: userId,
      },
    });

    if (linkedMembership) return;
  }

  throw new Error("你不在这个相册中");
}

function mapMediaListItem(media: MediaRecord): MediaListItem {
  return {
    id: media.id,
    originalName: media.original_name,
    thumbnailUrl: media.thumbnail_url,
    previewUrl: media.preview_url,
    originalUrl: media.original_url,
    mimeType: media.mime_type,
    mediaType: media.media_type,
    duration: media.duration_seconds,
    width: media.width,
    height: media.height,
    status: media.status,
    uploadedAt: media.uploaded_at,
    deletedAt: media.deleted_at,
  };
}

async function loadAccessibleMedia(prisma: PrismaClient, mediaId: string, userId: string) {
  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    include: {
      album: {
        select: { creator_id: true },
      },
      albumPhotos: {
        select: {
          album_id: true,
          album: { select: { creator_id: true } },
        },
      },
    },
  });

  if (!media) {
    throw new Error("媒体文件不存在");
  }

  await assertMediaAccessible(prisma, media, userId);

  return media as unknown as MediaRecord;
}

async function loadAccessibleMedias(
  prisma: PrismaClient,
  albumId: string,
  mediaIds: string[],
  userId: string
) {
  const uniqueMediaIds = Array.from(new Set(mediaIds.filter(Boolean)));

  if (uniqueMediaIds.length === 0) {
    return [];
  }

  const medias = await prisma.media.findMany({
    where: {
      id: { in: uniqueMediaIds },
      OR: [
        { album_id: albumId },
        {
          albumPhotos: {
            some: { album_id: albumId },
          },
        },
      ],
    },
    include: {
      album: {
        select: { creator_id: true },
      },
      albumPhotos: {
        select: {
          album_id: true,
          album: { select: { creator_id: true } },
        },
      },
    },
  });

  if (medias.length !== uniqueMediaIds.length) {
    throw new Error("部分媒体文件未找到");
  }

  for (const media of medias) {
    await assertMediaAccessible(prisma, media, userId);
  }

  return medias as unknown as MediaRecord[];
}

async function loadTrashAccessibleMedias(prisma: PrismaClient, mediaIds: string[], userId: string) {
  const uniqueMediaIds = Array.from(new Set(mediaIds.filter(Boolean)));

  if (uniqueMediaIds.length === 0) {
    return [];
  }

  const userAlbums = await prisma.albumMember.findMany({
    where: { user_id: userId },
    select: { album_id: true },
  });

  const albumIds = userAlbums.map((m) => m.album_id);

  const medias = await prisma.media.findMany({
    where: {
      id: { in: uniqueMediaIds },
      status: "deleted",
      album_id: { in: albumIds },
    },
    include: {
      album: {
        select: { creator_id: true },
      },
      albumPhotos: {
        select: { album_id: true },
      },
    },
  });

  if (medias.length !== uniqueMediaIds.length) {
    throw new Error("部分文件不在回收站或无法访问");
  }

  return medias as unknown as MediaRecord[];
}

function canManageMedia(media: MediaRecord, userId: string) {
  if (media.uploader_id === userId) return true;
  if (media.album.creator_id === userId) return true;

  if (media.albumPhotos) {
    for (const ap of media.albumPhotos) {
      if (ap.album.creator_id === userId) return true;
    }
  }

  return false;
}

function resolveMediaPaths(storageRoot: string, storagePath: string, isVideo: boolean) {
  const layout = getStorageLayout(storageRoot);
  const baseName = storagePath;

  if (isVideo) {
    const baseId = basename(baseName, extname(baseName));
    return {
      originalPath: join(layout.originals, baseName),
      previewPath: join(layout.previews, `${baseId}_preview.jpg`),
      thumbnailPath: join(layout.thumbnails, `${baseId}_thumb.jpg`),
    };
  }

  return {
    originalPath: join(layout.originals, baseName),
    previewPath: join(layout.previews, baseName),
    thumbnailPath: join(layout.thumbnails, baseName),
  };
}

async function removePaths(paths: string[]) {
  await Promise.all(
    paths.map(async (path) => {
      try {
        await rm(path, { force: true });
      } catch {
        // Best-effort cleanup.
      }
    })
  );
}

// ── Media Listing ──

export async function getAlbumPhotos(
  prisma: PrismaClient,
  context: ListContext
): Promise<MediaPage<MediaListItem>> {
  const page = clampPage(context.page);
  const pageSize = Math.min(Math.max(Math.floor(context.pageSize), 1), 50);
  const sortBy = context.sortBy ?? "uploadedAt";
  const sortOrder = context.sortOrder ?? "desc";
  const keyword = context.keyword?.trim();

  await assertAlbumMembership(prisma, context.albumId, context.userId);

  const orderBy =
    sortBy === "fileName"
      ? { original_name: sortOrder }
      : sortBy === "size"
        ? { size: sortOrder }
        : sortBy === "takenAt"
          ? { taken_at: sortOrder }
          : { uploaded_at: sortOrder };

  const where = {
    album_id: context.albumId,
    status: "normal" as const,
    ...(context.uploaderId ? { uploader_id: context.uploaderId } : {}),
    ...(keyword
      ? {
          OR: [
            { original_name: { contains: keyword, mode: "insensitive" as const } },
            { file_name: { contains: keyword, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.media.count({ where }),
    prisma.media.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    page,
    pageSize,
    total,
    items: (items as unknown as MediaRecord[]).map(mapMediaListItem),
  };
}

export async function getTrashPhotos(
  prisma: PrismaClient,
  context: TrashContext
): Promise<MediaPage<MediaListItem>> {
  const page = clampPage(context.page);
  const pageSize = Math.min(Math.max(Math.floor(context.pageSize), 1), 50);

  const userAlbums = await prisma.albumMember.findMany({
    where: { user_id: context.userId },
    select: { album_id: true },
  });

  const albumIds = userAlbums.map((m) => m.album_id);

  const [total, items] = await Promise.all([
    prisma.media.count({
      where: {
        status: "deleted",
        album_id: { in: albumIds },
      },
    }),
    prisma.media.findMany({
      where: {
        status: "deleted",
        album_id: { in: albumIds },
      },
      orderBy: { deleted_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    page,
    pageSize,
    total,
    items: (items as unknown as MediaRecord[]).map(mapMediaListItem),
  };
}

export async function getPhotoDetails(
  prisma: PrismaClient,
  context: MediaContext
): Promise<MediaDetail> {
  const media = await prisma.media.findUnique({
    where: { id: context.photoId },
    include: {
      album: {
        select: { creator_id: true },
      },
      favorites: {
        where: { user_id: context.userId },
        select: { id: true },
      },
    },
  });

  if (!media) {
    throw new Error("媒体文件不存在");
  }

  await assertAlbumMembership(prisma, media.album_id, context.userId);

  return {
    id: media.id,
    albumId: media.album_id,
    uploaderId: media.uploader_id,
    originalName: media.original_name,
    thumbnailUrl: media.thumbnail_url,
    previewUrl: media.preview_url,
    originalUrl: media.original_url,
    mimeType: media.mime_type,
    mediaType: media.media_type,
    duration: media.duration_seconds,
    width: media.width,
    height: media.height,
    status: media.status,
    uploadedAt: media.uploaded_at,
    deletedAt: media.deleted_at,
    deletedBy: media.deleted_by,
    storagePath: media.storage_path,
    isFavorited: media.favorites.length > 0,
  };
}

// ── Favorites ──

export async function toggleFavoritePhoto(prisma: PrismaClient, context: MediaContext) {
  const media = await loadAccessibleMedia(prisma, context.photoId, context.userId);

  const existing = await prisma.favorite.findUnique({
    where: {
      user_id_photo_id: {
        user_id: context.userId,
        photo_id: media.id,
      },
    },
  });

  if (existing) {
    await prisma.favorite.delete({
      where: {
        user_id_photo_id: {
          user_id: context.userId,
          photo_id: media.id,
        },
      },
    });
    return { favorited: false };
  }

  await prisma.favorite.create({
    data: {
      user_id: context.userId,
      photo_id: media.id,
    },
  });

  return { favorited: true };
}

export async function getFavoritePhotos(prisma: PrismaClient, userId: string) {
  const items = await prisma.favorite.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
    include: { media: true },
  });

  return items.map((item) => mapMediaListItem(item.media as unknown as MediaRecord));
}

// ── Delete / Restore ──

export async function softDeletePhoto(prisma: PrismaClient, context: MediaContext) {
  const media = await loadAccessibleMedia(prisma, context.photoId, context.userId);

  if (!canManageMedia(media, context.userId)) {
    throw new Error("你没有权限删除此文件");
  }

  if (media.status === "deleted") {
    return media.id;
  }

  await prisma.media.update({
    where: { id: media.id },
    data: {
      status: "deleted",
      deleted_at: new Date(),
      deleted_by: context.userId,
    },
  });

  return media.id;
}

export async function softDeletePhotos(prisma: PrismaClient, context: BatchMediaContext) {
  const medias = await loadAccessibleMedias(prisma, context.albumId, context.photoIds, context.userId);
  const deletableMedias = medias.filter((m) => canManageMedia(m, context.userId));

  if (deletableMedias.length !== medias.length) {
    throw new Error("你没有权限删除部分文件");
  }

  if (deletableMedias.length === 0) {
    return 0;
  }

  await prisma.media.updateMany({
    where: {
      id: { in: deletableMedias.map((m) => m.id) },
      status: "normal",
    },
    data: {
      status: "deleted",
      deleted_at: new Date(),
      deleted_by: context.userId,
    },
  });

  return deletableMedias.length;
}

export async function restorePhoto(prisma: PrismaClient, context: MediaContext) {
  const media = await loadAccessibleMedia(prisma, context.photoId, context.userId);

  if (media.status !== "deleted") {
    throw new Error("文件不在回收站中");
  }

  if (!canManageMedia(media, context.userId) && media.deleted_by !== context.userId) {
    throw new Error("你没有权限恢复此文件");
  }

  await prisma.media.update({
    where: { id: media.id },
    data: {
      status: "normal",
      deleted_at: null,
      deleted_by: null,
    },
  });

  return media.id;
}

export async function restorePhotos(prisma: PrismaClient, context: BatchMediaContext) {
  const medias = await loadAccessibleMedias(prisma, context.albumId, context.photoIds, context.userId);
  const restorableMedias = medias.filter((m) => m.status === "deleted");

  if (restorableMedias.length !== medias.length) {
    throw new Error("部分文件不在回收站中");
  }

  if (restorableMedias.length === 0) {
    return 0;
  }

  await prisma.media.updateMany({
    where: {
      id: { in: restorableMedias.map((m) => m.id) },
      status: "deleted",
    },
    data: {
      status: "normal",
      deleted_at: null,
      deleted_by: null,
    },
  });

  return restorableMedias.length;
}

export async function restoreTrashPhotos(prisma: PrismaClient, mediaIds: string[], userId: string) {
  const medias = await loadTrashAccessibleMedias(prisma, mediaIds, userId);

  if (medias.length === 0) {
    return 0;
  }

  await prisma.media.updateMany({
    where: {
      id: { in: medias.map((m) => m.id) },
      status: "deleted",
    },
    data: {
      status: "normal",
      deleted_at: null,
      deleted_by: null,
    },
  });

  return medias.length;
}

// ── Permanent Delete ──

export async function permanentlyDeletePhoto(
  prisma: PrismaClient,
  context: MediaContext,
  storageRoot = process.env.STORAGE_ROOT ?? "./data/storage"
) {
  const media = await loadAccessibleMedia(prisma, context.photoId, context.userId);

  if (media.status !== "deleted") {
    throw new Error("文件必须先放入回收站才能永久删除");
  }

  if (!canManageMedia(media, context.userId) && media.deleted_by !== context.userId) {
    throw new Error("你没有权限永久删除此文件");
  }

  const isVideo = media.media_type === "video";
  const paths = resolveMediaPaths(storageRoot, media.storage_path, isVideo);
  const size = media.size;

  await prisma.$transaction(async (tx) => {
    await tx.media.delete({
      where: { id: media.id },
    });

    await tx.user.update({
      where: { id: media.uploader_id },
      data: {
        storage_used: { decrement: size },
      },
    });
  });

  await removePaths([paths.originalPath, paths.previewPath, paths.thumbnailPath]);

  return media.id;
}

export async function permanentlyDeletePhotos(
  prisma: PrismaClient,
  context: BatchMediaContext,
  storageRoot = process.env.STORAGE_ROOT ?? "./data/storage"
) {
  const medias = await loadAccessibleMedias(prisma, context.albumId, context.photoIds, context.userId);
  const deletableMedias = medias.filter((m) => m.status === "deleted");

  if (deletableMedias.length !== medias.length) {
    throw new Error("部分文件不在回收站中");
  }

  if (deletableMedias.length === 0) {
    return 0;
  }

  await prisma.$transaction(async (tx) => {
    for (const media of deletableMedias) {
      await tx.media.delete({ where: { id: media.id } });
      await tx.user.update({
        where: { id: media.uploader_id },
        data: { storage_used: { decrement: media.size } },
      });
    }
  });

  for (const media of deletableMedias) {
    const isVideo = media.media_type === "video";
    const paths = resolveMediaPaths(storageRoot, media.storage_path, isVideo);
    await removePaths([paths.originalPath, paths.previewPath, paths.thumbnailPath]);
  }

  return deletableMedias.length;
}

export async function permanentlyDeleteTrashPhotos(
  prisma: PrismaClient,
  mediaIds: string[],
  userId: string,
  storageRoot = process.env.STORAGE_ROOT ?? "./data/storage"
) {
  const medias = await loadTrashAccessibleMedias(prisma, mediaIds, userId);

  if (medias.length === 0) {
    return 0;
  }

  await prisma.$transaction(async (tx) => {
    for (const media of medias) {
      await tx.media.delete({ where: { id: media.id } });
      await tx.user.update({
        where: { id: media.uploader_id },
        data: { storage_used: { decrement: media.size } },
      });
    }
  });

  const allPaths = medias.flatMap((media) => {
    const isVideo = media.media_type === "video";
    const paths = resolveMediaPaths(storageRoot, media.storage_path, isVideo);
    return [paths.originalPath, paths.previewPath, paths.thumbnailPath];
  });

  await removePaths(allPaths);

  return medias.length;
}
