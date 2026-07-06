import { rm } from "node:fs/promises";
import { join } from "node:path";
import type { PrismaClient } from "@prisma/client";
import { getStorageLayout } from "@/lib/storage/paths";
import { assertAlbumMembership } from "@/lib/membership";

type PhotoContext = {
  photoId: string;
  userId: string;
};

type BatchPhotoContext = {
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

type PhotoListItem = {
  id: string;
  originalName: string;
  thumbnailUrl: string;
  previewUrl: string;
  mimeType: string;
  width: number;
  height: number;
  status: "normal" | "deleted";
  uploadedAt: Date;
  deletedAt: Date | null;
};

type PhotoDetail = PhotoListItem & {
  albumId: string;
  uploaderId: string;
  deletedBy: string | null;
  originalUrl: string;
  storagePath: string;
  isFavorited: boolean;
};

type PhotoPage<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

type PhotoRecord = {
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
  mime_type: string;
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

async function assertPhotoAccessible(
  prisma: PrismaClient,
  photo: { album_id: string; albumPhotos?: { album_id: string }[] },
  userId: string
) {
  // Check if user is a member of the photo's owning album
  const owningMembership = await prisma.albumMember.findUnique({
    where: {
      album_id_user_id: {
        album_id: photo.album_id,
        user_id: userId,
      },
    },
  });

  if (owningMembership) return;

  // Check if user is a member of any linked album via AlbumPhoto
  if (photo.albumPhotos && photo.albumPhotos.length > 0) {
    const linkedAlbumIds = photo.albumPhotos.map((ap) => ap.album_id);
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

async function loadAccessiblePhoto(prisma: PrismaClient, photoId: string, userId: string) {
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    include: {
      album: {
        select: {
          creator_id: true,
        },
      },
      albumPhotos: {
        select: {
          album_id: true,
          album: { select: { creator_id: true } },
        },
      },
    },
  });

  if (!photo) {
    throw new Error("照片不存在");
  }

  await assertPhotoAccessible(prisma, photo, userId);

  return photo as unknown as PhotoRecord;
}

async function loadAccessiblePhotos(
  prisma: PrismaClient,
  albumId: string,
  photoIds: string[],
  userId: string
) {
  const uniquePhotoIds = Array.from(new Set(photoIds.filter(Boolean)));

  if (uniquePhotoIds.length === 0) {
    return [];
  }

  // Find photos that are either owned by this album or referenced by it
  const photos = await prisma.photo.findMany({
    where: {
      id: { in: uniquePhotoIds },
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
        select: {
          creator_id: true,
        },
      },
      albumPhotos: {
        select: {
          album_id: true,
          album: { select: { creator_id: true } },
        },
      },
    },
  });

  if (photos.length !== uniquePhotoIds.length) {
    throw new Error("部分照片未找到");
  }

  for (const photo of photos) {
    await assertPhotoAccessible(prisma, photo, userId);
  }

  return photos as unknown as PhotoRecord[];
}

async function loadTrashAccessiblePhotos(prisma: PrismaClient, photoIds: string[], userId: string) {
  const uniquePhotoIds = Array.from(new Set(photoIds.filter(Boolean)));

  if (uniquePhotoIds.length === 0) {
    return [];
  }

  // Find deleted photos from albums the user belongs to
  const userAlbums = await prisma.albumMember.findMany({
    where: { user_id: userId },
    select: { album_id: true },
  });

  const albumIds = userAlbums.map((m) => m.album_id);

  const photos = await prisma.photo.findMany({
    where: {
      id: { in: uniquePhotoIds },
      status: "deleted",
      album_id: { in: albumIds },
    },
    include: {
      album: {
        select: {
          creator_id: true,
        },
      },
      albumPhotos: {
        select: { album_id: true },
      },
    },
  });

  if (photos.length !== uniquePhotoIds.length) {
    throw new Error("部分照片不在回收站或无法访问");
  }

  return photos as unknown as PhotoRecord[];
}

function canManagePhoto(photo: PhotoRecord, userId: string) {
  if (photo.uploader_id === userId) return true;
  if (photo.album.creator_id === userId) return true;

  // Check if user is the creator of any linked album
  if (photo.albumPhotos) {
    for (const ap of photo.albumPhotos) {
      if (ap.album.creator_id === userId) return true;
    }
  }

  return false;
}

function resolvePhotoPaths(storageRoot: string, storagePath: string) {
  const layout = getStorageLayout(storageRoot);

  return {
    originalPath: join(layout.originals, storagePath),
    previewPath: join(layout.previews, storagePath),
    thumbnailPath: join(layout.thumbnails, storagePath),
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

// ── Photo Listing ──

export async function getAlbumPhotos(
  prisma: PrismaClient,
  context: ListContext
): Promise<PhotoPage<PhotoListItem>> {
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
    prisma.photo.count({ where }),
    prisma.photo.findMany({
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
    items: items.map((photo) => ({
      id: photo.id,
      originalName: photo.original_name,
      thumbnailUrl: photo.thumbnail_url,
      previewUrl: photo.preview_url,
      mimeType: photo.mime_type,
      width: photo.width,
      height: photo.height,
      status: photo.status,
      uploadedAt: photo.uploaded_at,
      deletedAt: photo.deleted_at,
    })),
  };
}

export async function getTrashPhotos(
  prisma: PrismaClient,
  context: TrashContext
): Promise<PhotoPage<PhotoListItem>> {
  const page = clampPage(context.page);
  const pageSize = Math.min(Math.max(Math.floor(context.pageSize), 1), 50);

  const userAlbums = await prisma.albumMember.findMany({
    where: { user_id: context.userId },
    select: { album_id: true },
  });

  const albumIds = userAlbums.map((m) => m.album_id);

  const [total, items] = await Promise.all([
    prisma.photo.count({
      where: {
        status: "deleted",
        album_id: { in: albumIds },
      },
    }),
    prisma.photo.findMany({
      where: {
        status: "deleted",
        album_id: { in: albumIds },
      },
      orderBy: {
        deleted_at: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    page,
    pageSize,
    total,
    items: items.map((photo) => ({
      id: photo.id,
      originalName: photo.original_name,
      thumbnailUrl: photo.thumbnail_url,
      previewUrl: photo.preview_url,
      mimeType: photo.mime_type,
      width: photo.width,
      height: photo.height,
      status: photo.status,
      uploadedAt: photo.uploaded_at,
      deletedAt: photo.deleted_at,
    })),
  };
}

export async function getPhotoDetails(
  prisma: PrismaClient,
  context: PhotoContext
): Promise<PhotoDetail> {
  const photo = await prisma.photo.findUnique({
    where: { id: context.photoId },
    include: {
      album: {
        select: {
          creator_id: true,
        },
      },
      favorites: {
        where: {
          user_id: context.userId,
        },
        select: {
          id: true,
        },
      },
    },
  });

  if (!photo) {
    throw new Error("照片不存在");
  }

  await assertAlbumMembership(prisma, photo.album_id, context.userId);

  return {
    id: photo.id,
    albumId: photo.album_id,
    uploaderId: photo.uploader_id,
    originalName: photo.original_name,
    thumbnailUrl: photo.thumbnail_url,
    previewUrl: photo.preview_url,
    originalUrl: `/api/photos/${photo.id}/download`,
    mimeType: photo.mime_type,
    width: photo.width,
    height: photo.height,
    status: photo.status,
    uploadedAt: photo.uploaded_at,
    deletedAt: photo.deleted_at,
    deletedBy: photo.deleted_by,
    storagePath: photo.storage_path,
    isFavorited: photo.favorites.length > 0,
  };
}

// ── Favorites ──

export async function toggleFavoritePhoto(prisma: PrismaClient, context: PhotoContext) {
  const photo = await loadAccessiblePhoto(prisma, context.photoId, context.userId);

  const existing = await prisma.favorite.findUnique({
    where: {
      user_id_photo_id: {
        user_id: context.userId,
        photo_id: photo.id,
      },
    },
  });

  if (existing) {
    await prisma.favorite.delete({
      where: {
        user_id_photo_id: {
          user_id: context.userId,
          photo_id: photo.id,
        },
      },
    });
    return { favorited: false };
  }

  await prisma.favorite.create({
    data: {
      user_id: context.userId,
      photo_id: photo.id,
    },
  });

  return { favorited: true };
}

export async function getFavoritePhotos(prisma: PrismaClient, userId: string) {
  const items = await prisma.favorite.findMany({
    where: { user_id: userId },
    orderBy: {
      created_at: "desc",
    },
    include: {
      photo: true,
    },
  });

  return items.map((item) => ({
    id: item.photo.id,
    originalName: item.photo.original_name,
    thumbnailUrl: item.photo.thumbnail_url,
    previewUrl: item.photo.preview_url,
    mimeType: item.photo.mime_type,
    width: item.photo.width,
    height: item.photo.height,
    status: item.photo.status,
    uploadedAt: item.photo.uploaded_at,
    deletedAt: item.photo.deleted_at,
  }));
}

// ── Delete / Restore ──

export async function softDeletePhoto(prisma: PrismaClient, context: PhotoContext) {
  const photo = await loadAccessiblePhoto(prisma, context.photoId, context.userId);

  if (!canManagePhoto(photo, context.userId)) {
    throw new Error("你没有权限删除此照片");
  }

  if (photo.status === "deleted") {
    return photo.id;
  }

  await prisma.photo.update({
    where: { id: photo.id },
    data: {
      status: "deleted",
      deleted_at: new Date(),
      deleted_by: context.userId,
    },
  });

  return photo.id;
}

export async function softDeletePhotos(prisma: PrismaClient, context: BatchPhotoContext) {
  const photos = await loadAccessiblePhotos(prisma, context.albumId, context.photoIds, context.userId);

  const deletablePhotos = photos.filter((photo) => canManagePhoto(photo, context.userId));

  if (deletablePhotos.length !== photos.length) {
    throw new Error("你没有权限删除部分照片");
  }

  if (deletablePhotos.length === 0) {
    return 0;
  }

  await prisma.photo.updateMany({
    where: {
      id: { in: deletablePhotos.map((photo) => photo.id) },
      status: "normal",
    },
    data: {
      status: "deleted",
      deleted_at: new Date(),
      deleted_by: context.userId,
    },
  });

  return deletablePhotos.length;
}

export async function restorePhoto(prisma: PrismaClient, context: PhotoContext) {
  const photo = await loadAccessiblePhoto(prisma, context.photoId, context.userId);

  if (photo.status !== "deleted") {
    throw new Error("照片不在回收站中");
  }

  if (!canManagePhoto(photo, context.userId) && photo.deleted_by !== context.userId) {
    throw new Error("你没有权限恢复此照片");
  }

  await prisma.photo.update({
    where: { id: photo.id },
    data: {
      status: "normal",
      deleted_at: null,
      deleted_by: null,
    },
  });

  return photo.id;
}

export async function restorePhotos(prisma: PrismaClient, context: BatchPhotoContext) {
  const photos = await loadAccessiblePhotos(prisma, context.albumId, context.photoIds, context.userId);

  const restorablePhotos = photos.filter((photo) => photo.status === "deleted");

  if (restorablePhotos.length !== photos.length) {
    throw new Error("部分照片不在回收站中");
  }

  if (restorablePhotos.length === 0) {
    return 0;
  }

  await prisma.photo.updateMany({
    where: {
      id: { in: restorablePhotos.map((photo) => photo.id) },
      status: "deleted",
    },
    data: {
      status: "normal",
      deleted_at: null,
      deleted_by: null,
    },
  });

  return restorablePhotos.length;
}

export async function restoreTrashPhotos(prisma: PrismaClient, photoIds: string[], userId: string) {
  const photos = await loadTrashAccessiblePhotos(prisma, photoIds, userId);

  if (photos.length === 0) {
    return 0;
  }

  await prisma.photo.updateMany({
    where: {
      id: { in: photos.map((photo) => photo.id) },
      status: "deleted",
    },
    data: {
      status: "normal",
      deleted_at: null,
      deleted_by: null,
    },
  });

  return photos.length;
}

// ── Permanent Delete ──

export async function permanentlyDeletePhoto(
  prisma: PrismaClient,
  context: PhotoContext,
  storageRoot = process.env.STORAGE_ROOT ?? "./data/storage"
) {
  const photo = await loadAccessiblePhoto(prisma, context.photoId, context.userId);

  if (photo.status !== "deleted") {
    throw new Error("照片必须先放入回收站才能永久删除");
  }

  if (!canManagePhoto(photo, context.userId) && photo.deleted_by !== context.userId) {
    throw new Error("你没有权限永久删除此照片");
  }

  const paths = resolvePhotoPaths(storageRoot, photo.storage_path);
  const size = photo.size;

  await prisma.$transaction(async (tx) => {
    await tx.photo.delete({
      where: { id: photo.id },
    });

    await tx.user.update({
      where: { id: photo.uploader_id },
      data: {
        storage_used: { decrement: size },
      },
    });
  });

  await removePaths([paths.originalPath, paths.previewPath, paths.thumbnailPath]);

  return photo.id;
}

export async function permanentlyDeletePhotos(
  prisma: PrismaClient,
  context: BatchPhotoContext,
  storageRoot = process.env.STORAGE_ROOT ?? "./data/storage"
) {
  const photos = await loadAccessiblePhotos(prisma, context.albumId, context.photoIds, context.userId);

  const deletablePhotos = photos.filter((photo) => photo.status === "deleted");

  if (deletablePhotos.length !== photos.length) {
    throw new Error("部分照片不在回收站中");
  }

  if (deletablePhotos.length === 0) {
    return 0;
  }

  await prisma.$transaction(async (tx) => {
    for (const photo of deletablePhotos) {
      const paths = resolvePhotoPaths(storageRoot, photo.storage_path);

      await tx.photo.delete({
        where: { id: photo.id },
      });

      await tx.user.update({
        where: { id: photo.uploader_id },
        data: {
          storage_used: { decrement: photo.size },
        },
      });

      await removePaths([paths.originalPath, paths.previewPath, paths.thumbnailPath]);
    }
  });

  return deletablePhotos.length;
}

export async function permanentlyDeleteTrashPhotos(
  prisma: PrismaClient,
  photoIds: string[],
  userId: string,
  storageRoot = process.env.STORAGE_ROOT ?? "./data/storage"
) {
  const photos = await loadTrashAccessiblePhotos(prisma, photoIds, userId);

  if (photos.length === 0) {
    return 0;
  }

  await prisma.$transaction(async (tx) => {
    for (const photo of photos) {
      await tx.photo.delete({
        where: { id: photo.id },
      });

      await tx.user.update({
        where: { id: photo.uploader_id },
        data: {
          storage_used: { decrement: photo.size },
        },
      });
    }
  });

  await removePaths(
    photos.flatMap((photo) => {
      const paths = resolvePhotoPaths(storageRoot, photo.storage_path);
      return [paths.originalPath, paths.previewPath, paths.thumbnailPath];
    })
  );

  return photos.length;
}
