import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { AppError } from "@/lib/api/errors";
import { buildBatchResult, type BatchMutationResult } from "@/lib/api/batch-result";
import { assertAlbumMembership, assertAlbumOwner, assertCanUpload, assertCanDelete } from "@/lib/membership";
import { INVITE_STATUS, INVITE_DURATION_MS } from "@/lib/albums/invite-status";
import { getCodePointLength, normalizeDisplayName } from "@/lib/media/display-name";

// ── Types ──

export type AlbumSummary = {
  id: string;
  name: string;
  description: string | null;
  coverPhotoId: string | null;
  coverUrl: string | null;
  lastPhotoUrl: string | null;
  isDefault: boolean;
  isImmutable: boolean;
  canUpload: boolean;
  photoCount: number;
  memberCount: number;
  role: string;
  updatedAt: Date;
};

export type AlbumDetail = {
  id: string;
  creatorId: string;
  currentUserId: string;
  name: string;
  description: string | null;
  isChildAlbum: boolean;
  childBirthDate: string | null;
  coverPhotoId: string | null;
  coverUrl: string | null;
  previewUrl: string | null;
  isDefault: boolean;
  isImmutable: boolean;
  photoCount: number;
  memberCount: number;
  role: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AlbumEditableResult = {
  id: string;
  name: string;
  description: string | null;
  isChildAlbum: boolean;
  childBirthDate: string | null;
  updatedAt: Date;
};

export type AlbumPhotoItem = {
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
  size: number;
  albumCount: number;
  takenAt: Date | null;
  uploadedAt: Date;
  status: "normal" | "deleted";
  isFavorited: boolean;
  locationHidden: boolean;
  canEditName: boolean;
};

type AlbumPhotoSortBy = "uploadedAt" | "takenAt" | "fileName" | "size";
type AlbumPhotoSortOrder = "asc" | "desc";

export type MediaDisplayNameUpdate = {
  id: string;
  displayName: string | null;
  originalName: string;
};

function parseBirthDateInput(value: string | null | undefined): Date | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("孩子生日格式不正确");
  }

  return parsed;
}

function parseDateFilterInput(
  value: string | null | undefined,
  mode: "start" | "end",
): Date | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(`${trimmed}T${mode === "start" ? "00:00:00.000" : "23:59:59.999"}Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("拍摄日期格式不正确");
  }

  return parsed;
}

type MediaPage<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  nextCursor: string | null;
};

const albumPhotosCursorSchema = z.object({
  addedAt: z.string().datetime(),
  id: z.string().uuid(),
});

type AlbumPhotosCursor = z.infer<typeof albumPhotosCursorSchema>;

export function encodeAlbumPhotosCursor(cursor: AlbumPhotosCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeAlbumPhotosCursor(cursor: string): AlbumPhotosCursor {
  const raw = Buffer.from(cursor, "base64url").toString("utf8");
  return albumPhotosCursorSchema.parse(JSON.parse(raw));
}

export type AlbumMemberItem = {
  userId: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  role: string;
  canUpload: boolean;
  canDelete: boolean;
  joinedAt: Date;
};

export type AlbumInviteItem = {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  createdAt: Date;
  expiredAt: Date;
};

// ── Album CRUD ──

export async function getUserAlbums(
  prisma: PrismaClient,
  userId: string
): Promise<AlbumSummary[]> {
  const memberships = await prisma.albumMember.findMany({
    where: { user_id: userId },
    include: {
      album: {
        include: {
          _count: {
            select: {
              photos: { where: { media: { status: "normal" } } },
              members: true,
            },
          },
          coverPhoto: {
            select: { thumbnail_url: true },
          },
          photos: {
            take: 1,
            orderBy: { added_at: "desc" },
            where: { media: { status: "normal" } },
            include: {
              media: {
                select: { thumbnail_url: true },
              },
            },
          },
        },
      },
    },
    orderBy: { album: { updated_at: "desc" } },
  });

  return memberships.map((m) => ({
    id: m.album.id,
    name: m.album.name,
    description: m.album.description,
    coverPhotoId: m.album.cover_photo_id,
    coverUrl: m.album.coverPhoto?.thumbnail_url ?? null,
    lastPhotoUrl: m.album.photos[0]?.media.thumbnail_url ?? null,
    isDefault: m.album.is_default,
    isImmutable: m.album.is_immutable,
    canUpload: m.role === "owner" || m.can_upload,
    photoCount: m.album._count.photos,
    memberCount: m.album._count.members,
    role: m.role,
    updatedAt: m.album.updated_at,
  }));
}

export async function createAlbum(
  prisma: PrismaClient,
  context: {
    userId: string;
    name: string;
    description?: string;
  }
) {
  if (!context.name.trim()) {
    throw new Error("相册名不能为空");
  }

  const album = await prisma.album.create({
    data: {
      creator_id: context.userId,
      name: context.name.trim(),
      description: context.description?.trim() || null,
    },
  });

  await prisma.albumMember.create({
    data: {
      album_id: album.id,
      user_id: context.userId,
      role: "owner",
    },
  });

  return album;
}

export async function getAlbumDetail(
  prisma: PrismaClient,
  context: { albumId: string; userId: string }
): Promise<AlbumDetail> {
  const membership = await assertAlbumMembership(prisma, context.albumId, context.userId);

  const album = await prisma.album.findUnique({
    where: { id: context.albumId },
    include: {
      coverPhoto: {
        select: { thumbnail_url: true, preview_url: true },
      },
      _count: {
        select: {
          photos: { where: { media: { status: "normal" } } },
          members: true,
        },
      },
    },
  });

  if (!album) throw new Error("相册不存在");

  return {
    id: album.id,
    creatorId: album.creator_id,
    currentUserId: context.userId,
    name: album.name,
    description: album.description,
    isChildAlbum: album.is_child_album,
    childBirthDate: album.child_birth_date ? album.child_birth_date.toISOString().slice(0, 10) : null,
    coverPhotoId: album.cover_photo_id,
    coverUrl: album.coverPhoto?.thumbnail_url ?? null,
    previewUrl: album.coverPhoto?.preview_url ?? null,
    isDefault: album.is_default,
    isImmutable: album.is_immutable,
    photoCount: album._count.photos,
    memberCount: album._count.members,
    role: membership.role,
    createdAt: album.created_at,
    updatedAt: album.updated_at,
  };
}

export async function updateAlbum(
  prisma: PrismaClient,
  context: {
    albumId: string;
    userId: string;
    name?: string;
    description?: string | null;
    isChildAlbum?: boolean;
    childBirthDate?: string | null;
  }
): Promise<AlbumEditableResult> {
  const album = await prisma.album.findUnique({
    where: { id: context.albumId },
    select: {
      id: true,
      is_immutable: true,
      is_child_album: true,
      child_birth_date: true,
    },
  });
  if (!album) throw new Error("相册不存在");
  if (album.is_immutable) throw new Error("此相册不可编辑");

  await assertAlbumOwner(prisma, context.albumId, context.userId);

  const data: Record<string, unknown> = {};
  if (context.name !== undefined) {
    if (!context.name.trim()) throw new Error("相册名不能为空");
    data.name = context.name.trim();
  }
  if (context.description !== undefined) {
    data.description = context.description?.trim() || null;
  }
  if (context.isChildAlbum !== undefined) {
    data.is_child_album = context.isChildAlbum;
    if (!context.isChildAlbum) {
      data.child_birth_date = null;
    }
  }

  if (context.childBirthDate !== undefined) {
    const parsedBirthDate = parseBirthDateInput(context.childBirthDate);
    if (context.isChildAlbum ?? album.is_child_album) {
      if (!parsedBirthDate) {
        throw new Error("孩子生日不能为空");
      }
      data.child_birth_date = parsedBirthDate;
    } else {
      data.child_birth_date = null;
    }
  } else if (context.isChildAlbum === true && !album.child_birth_date && data.child_birth_date === undefined) {
    throw new Error("孩子生日不能为空");
  }

  const updated = await prisma.album.update({
    where: { id: context.albumId },
    data,
    select: {
      id: true,
      name: true,
      description: true,
      is_child_album: true,
      child_birth_date: true,
      updated_at: true,
    },
  });

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    isChildAlbum: updated.is_child_album,
    childBirthDate: updated.child_birth_date ? updated.child_birth_date.toISOString().slice(0, 10) : null,
    updatedAt: updated.updated_at,
  };
}

export async function deleteAlbum(
  prisma: PrismaClient,
  context: { albumId: string; userId: string }
) {
  const album = await prisma.album.findUnique({ where: { id: context.albumId } });
  if (!album) throw new Error("相册不存在");
  if (album.is_immutable) throw new Error("此相册不可删除");

  await assertAlbumOwner(prisma, context.albumId, context.userId);

  await prisma.album.delete({ where: { id: context.albumId } });
}

// ── Cover Management ──

export async function setAlbumCover(
  prisma: PrismaClient,
  context: { albumId: string; userId: string; photoId: string }
) {
  await assertAlbumOwner(prisma, context.albumId, context.userId);

  const ref = await prisma.albumPhoto.findUnique({
    where: {
      album_id_photo_id: {
        album_id: context.albumId,
        photo_id: context.photoId,
      },
    },
  });

  if (!ref) throw new Error("照片不在此相册中");

  return prisma.album.update({
    where: { id: context.albumId },
    data: { cover_photo_id: context.photoId },
  });
}

// ── Album Photos (references) ──

export async function getAlbumPhotos(
  prisma: PrismaClient,
  context: {
    albumId: string;
    userId: string;
    page?: number;
    pageSize: number;
    keyword?: string;
    mediaType?: "image" | "video";
    favoritedOnly?: boolean;
    uploaderId?: string;
    takenFrom?: string;
    takenTo?: string;
    sortBy?: AlbumPhotoSortBy;
    sortOrder?: AlbumPhotoSortOrder;
    cursor?: string;
    excludeAlbumId?: string;
  }
): Promise<MediaPage<AlbumPhotoItem>> {
  await assertAlbumMembership(prisma, context.albumId, context.userId);
  const album = await prisma.album.findUnique({
    where: { id: context.albumId },
    select: { creator_id: true },
  });

  if (!album) {
    throw new Error("相册不存在");
  }

  const page = Math.max(1, Math.floor(context.page ?? 1));
  const pageSize = Math.min(Math.max(Math.floor(context.pageSize), 1), 200);
  const keyword = context.keyword?.trim();
  const takenFrom = parseDateFilterInput(context.takenFrom, "start");
  const takenTo = parseDateFilterInput(context.takenTo, "end");
  const parsedCursor = context.cursor ? decodeAlbumPhotosCursor(context.cursor) : null;
  const excludeAlbumId = context.excludeAlbumId?.trim();
  const excludedPhotoIds = excludeAlbumId
    ? (
        await prisma.albumPhoto.findMany({
          where: { album_id: excludeAlbumId },
          select: { photo_id: true },
        })
      ).map((row) => row.photo_id)
    : [];

  const where: Record<string, unknown> = {
    album_id: context.albumId,
  };

  const mediaWhere: Record<string, unknown> = {
    status: "normal",
  };

  if (keyword) {
    mediaWhere.OR = [
      { display_name: { contains: keyword, mode: "insensitive" } },
      { original_name: { contains: keyword, mode: "insensitive" } },
      { file_name: { contains: keyword, mode: "insensitive" } },
    ];
  }

  if (context.mediaType) {
    mediaWhere.media_type = context.mediaType;
  }

  if (context.favoritedOnly) {
    mediaWhere.favorites = {
      some: { user_id: context.userId },
    };
  }

  if (context.uploaderId) {
    mediaWhere.uploader_id = context.uploaderId;
  }

  if (takenFrom || takenTo) {
    mediaWhere.taken_at = {
      ...(takenFrom ? { gte: takenFrom } : {}),
      ...(takenTo ? { lte: takenTo } : {}),
    };
  }

  if (excludedPhotoIds.length > 0) {
    where.photo_id = { notIn: excludedPhotoIds };
  }

  where.media = mediaWhere;

  const orderBy =
    context.sortBy === "fileName"
      ? { media: { original_name: context.sortOrder ?? "desc" } }
      : context.sortBy === "size"
        ? { media: { size: context.sortOrder ?? "desc" } }
        : context.sortBy === "takenAt"
          ? { media: { taken_at: context.sortOrder ?? "desc" } }
          : { added_at: context.sortOrder ?? "desc" };

  const cursorWhere = parsedCursor
    ? {
        OR: [
          { added_at: { lt: new Date(parsedCursor.addedAt) } },
          {
            added_at: new Date(parsedCursor.addedAt),
            photo_id: { lt: parsedCursor.id },
          },
        ],
      }
    : undefined;

  const [total, refs] = await Promise.all([
    prisma.albumPhoto.count({ where }),
    prisma.albumPhoto.findMany({
      where: cursorWhere ? { ...where, ...cursorWhere } : where,
      include: {
        media: {
          include: {
            favorites: {
              where: { user_id: context.userId },
              select: { id: true },
            },
          },
        },
      },
      orderBy: [
        orderBy,
        { photo_id: context.sortOrder === "asc" ? "asc" : "desc" },
      ],
      skip: parsedCursor ? undefined : (page - 1) * pageSize,
      take: pageSize + 1,
    }),
  ]);

  const hasMore = refs.length > pageSize;
  const pageItems = refs.slice(0, pageSize);

  return {
    page,
    pageSize,
    total,
    nextCursor:
      hasMore && pageItems.length > 0
        ? encodeAlbumPhotosCursor({
            addedAt: pageItems[pageItems.length - 1]!.added_at.toISOString(),
            id: pageItems[pageItems.length - 1]!.photo_id,
          })
        : null,
    items: pageItems.map((ref) => ({
      id: ref.media.id,
      displayName: ref.media.display_name ?? null,
      originalName: ref.media.original_name,
      thumbnailUrl: ref.media.thumbnail_url,
      previewUrl: ref.media.preview_url,
      originalUrl: ref.media.original_url,
      mimeType: ref.media.mime_type,
      mediaType: ref.media.media_type,
      duration: ref.media.duration_seconds ?? null,
      width: ref.media.width,
      height: ref.media.height,
      size: Number(ref.media.size),
      albumCount: 1,
      takenAt: ref.media.taken_at,
      uploadedAt: ref.media.uploaded_at,
      status: ref.media.status,
      isFavorited: ref.media.favorites.length > 0,
      locationHidden: ref.media.location_hidden,
      canEditName: ref.media.uploader_id === context.userId || album.creator_id === context.userId,
    })),
  };
}

export async function updateAlbumPhotoDisplayName(
  prisma: PrismaClient,
  context: {
    albumId: string;
    photoId: string;
    userId: string;
    displayName?: string | null;
  }
): Promise<MediaDisplayNameUpdate> {
  const album = await prisma.album.findUnique({
    where: { id: context.albumId },
    select: { creator_id: true },
  });

  if (!album) {
    throw new Error("相册不存在");
  }

  await assertAlbumMembership(prisma, context.albumId, context.userId);

  const ref = await prisma.albumPhoto.findUnique({
    where: {
      album_id_photo_id: {
        album_id: context.albumId,
        photo_id: context.photoId,
      },
    },
    include: {
      media: {
        select: {
          id: true,
          uploader_id: true,
          original_name: true,
          display_name: true,
          status: true,
        },
      },
    },
  });

  if (!ref || ref.media.status === "deleted") {
    throw new Error("该媒体已不存在");
  }

  const canEdit = ref.media.uploader_id === context.userId || album.creator_id === context.userId;
  if (!canEdit) {
    throw new Error("你没有权限编辑此名称");
  }

  if (context.displayName === undefined) {
    return {
      id: ref.media.id,
      displayName: ref.media.display_name ?? null,
      originalName: ref.media.original_name,
    };
  }

  const nextDisplayName = normalizeDisplayName(context.displayName);
  if (nextDisplayName !== null && getCodePointLength(nextDisplayName) > 100) {
    throw new Error("名称最多 100 个字符");
  }

  const updated = await prisma.media.update({
    where: { id: ref.media.id },
    data: { display_name: nextDisplayName },
    select: {
      id: true,
      display_name: true,
      original_name: true,
    },
  });

  return {
    id: updated.id,
    displayName: updated.display_name ?? null,
    originalName: updated.original_name,
  };
}

export async function addPhotosToAlbum(
  prisma: PrismaClient,
  context: { albumId: string; userId: string; photoIds: string[] }
): Promise<BatchMutationResult> {
  const album = await prisma.album.findUnique({ where: { id: context.albumId } });
  if (!album) throw new Error("相册不存在");

  await assertCanUpload(prisma, context.albumId, context.userId);

  const defaultAlbumId = await getUserDefaultAlbumId(prisma, context.userId);
  const uniquePhotoIds = Array.from(new Set(context.photoIds.filter(Boolean)));
  const availableMedia = await prisma.media.findMany({
    where: {
      id: { in: uniquePhotoIds },
      status: "normal",
      album_id: defaultAlbumId,
    },
    select: { id: true },
  });

  const availableIdSet = new Set(availableMedia.map((media) => media.id));
  const failures = new Map<string, unknown>();

  for (const photoId of uniquePhotoIds) {
    if (!availableIdSet.has(photoId)) {
      failures.set(photoId, new AppError("该照片不在全部照片中", "FORBIDDEN", 403));
    }
  }

  for (const photoId of uniquePhotoIds) {
    if (failures.has(photoId)) {
      continue;
    }

    try {
      await prisma.albumPhoto.upsert({
        where: {
          album_id_photo_id: {
            album_id: context.albumId,
            photo_id: photoId,
          },
        },
        update: {},
        create: {
          album_id: context.albumId,
          photo_id: photoId,
          added_by: context.userId,
        },
      });
    } catch (error) {
      failures.set(photoId, error);
    }
  }

  const result = buildBatchResult(uniquePhotoIds, failures);

  if (result.succeededIds.length > 0) {
    await prisma.album.update({
      where: { id: context.albumId },
      data: { updated_at: new Date() },
    });
  }

  return result;
}

export async function removePhotoFromAlbum(
  prisma: PrismaClient,
  context: { albumId: string; userId: string; photoId: string }
) {
  const album = await prisma.album.findUnique({ where: { id: context.albumId } });
  if (!album) throw new Error("相册不存在");

  await assertCanDelete(prisma, context.albumId, context.userId);

  if (album.cover_photo_id === context.photoId) {
    await prisma.album.update({
      where: { id: context.albumId },
      data: { cover_photo_id: null },
    });
  }

  const deleteResult = await prisma.albumPhoto.deleteMany({
    where: {
      album_id: context.albumId,
      photo_id: context.photoId,
    },
  });

  if (deleteResult.count === 0) {
    throw new AppError("该照片不在相册中", "ALBUM_PHOTO_NOT_FOUND", 404);
  }

  return prisma.album.update({
    where: { id: context.albumId },
    data: { updated_at: new Date() },
  });
}

export async function restorePhotoToAlbum(
  prisma: PrismaClient,
  context: { albumId: string; userId: string; photoId: string }
) {
  const album = await prisma.album.findUnique({ where: { id: context.albumId } });
  if (!album) throw new Error("相册不存在");

  await assertCanDelete(prisma, context.albumId, context.userId);

  await prisma.albumPhoto.upsert({
    where: {
      album_id_photo_id: {
        album_id: context.albumId,
        photo_id: context.photoId,
      },
    },
    update: {},
    create: {
      album_id: context.albumId,
      photo_id: context.photoId,
      added_by: context.userId,
    },
  });

  return prisma.album.update({
    where: { id: context.albumId },
    data: { updated_at: new Date() },
  });
}

export async function batchRemovePhotosFromAlbum(
  prisma: PrismaClient,
  context: { albumId: string; userId: string; photoIds: string[] }
): Promise<BatchMutationResult> {
  const uniquePhotoIds = Array.from(new Set(context.photoIds.filter(Boolean)));
  const failures = new Map<string, unknown>();

  for (const photoId of uniquePhotoIds) {
    try {
      await removePhotoFromAlbum(prisma, {
        albumId: context.albumId,
        userId: context.userId,
        photoId,
      });
    } catch (error) {
      failures.set(photoId, error);
    }
  }

  return buildBatchResult(uniquePhotoIds, failures);
}

// ── Members ──

export async function getAlbumMembers(
  prisma: PrismaClient,
  context: { albumId: string; userId: string }
): Promise<AlbumMemberItem[]> {
  await assertAlbumMembership(prisma, context.albumId, context.userId);

  const members = await prisma.albumMember.findMany({
    where: { album_id: context.albumId },
    include: {
      user: {
        select: { id: true, email: true, nickname: true, avatar_url: true },
      },
    },
    orderBy: { joined_at: "asc" },
  });

  return members.map((m) => ({
    userId: m.user.id,
    email: m.user.email,
    nickname: m.user.nickname,
    avatarUrl: m.user.avatar_url,
    role: m.role,
    canUpload: m.can_upload,
    canDelete: m.can_delete,
    joinedAt: m.joined_at,
  }));
}

export async function updateMemberPermissions(
  prisma: PrismaClient,
  context: {
    albumId: string;
    userId: string;
    targetUserId: string;
    canUpload?: boolean;
    canDelete?: boolean;
  }
) {
  await assertAlbumOwner(prisma, context.albumId, context.userId);

  const member = await prisma.albumMember.findUnique({
    where: {
      album_id_user_id: {
        album_id: context.albumId,
        user_id: context.targetUserId,
      },
    },
  });

  if (!member) throw new Error("成员不存在");
  if (member.role === "owner") throw new Error("不能修改拥有者的权限");

  const data: Record<string, boolean> = {};
  if (context.canUpload !== undefined) data.can_upload = context.canUpload;
  if (context.canDelete !== undefined) data.can_delete = context.canDelete;

  return prisma.albumMember.update({
    where: {
      album_id_user_id: {
        album_id: context.albumId,
        user_id: context.targetUserId,
      },
    },
    data,
  });
}

export async function leaveAlbum(
  prisma: PrismaClient,
  context: { albumId: string; userId: string }
) {
  const member = await prisma.albumMember.findUnique({
    where: {
      album_id_user_id: {
        album_id: context.albumId,
        user_id: context.userId,
      },
    },
  });

  if (!member) throw new Error("你不在此相册中");
  if (member.role === "owner") throw new Error("拥有者不能退出相册，请先转让拥有权或删除相册");

  await prisma.albumMember.delete({
    where: {
      album_id_user_id: {
        album_id: context.albumId,
        user_id: context.userId,
      },
    },
  });

  return prisma.album.update({
    where: { id: context.albumId },
    data: { updated_at: new Date() },
  });
}

export async function removeAlbumMember(
  prisma: PrismaClient,
  context: { albumId: string; userId: string; targetUserId: string }
) {
  await assertAlbumOwner(prisma, context.albumId, context.userId);

  if (context.userId === context.targetUserId) {
    throw new Error("不能移除自己");
  }

  await prisma.albumMember.deleteMany({
    where: {
      album_id: context.albumId,
      user_id: context.targetUserId,
    },
  });
}

export async function addAlbumMemberByEmail(
  prisma: PrismaClient,
  context: { albumId: string; userId: string; email: string }
): Promise<AlbumMemberItem> {
  await assertAlbumOwner(prisma, context.albumId, context.userId);

  const email = context.email.trim().toLowerCase();
  if (!email) throw new Error("请输入邮箱");

  const targetUser = await prisma.user.findUnique({ where: { email } });
  if (!targetUser) throw new Error("用户不存在，请先注册");

  const existing = await prisma.albumMember.findUnique({
    where: {
      album_id_user_id: {
        album_id: context.albumId,
        user_id: targetUser.id,
      },
    },
  });

  if (existing) throw new Error("该用户已是此相册成员");

  const member = await prisma.albumMember.create({
    data: {
      album_id: context.albumId,
      user_id: targetUser.id,
      role: "member",
    },
  });

  await prisma.album.update({
    where: { id: context.albumId },
    data: { updated_at: new Date() },
  });

  return {
    userId: targetUser.id,
    email: targetUser.email,
    nickname: targetUser.nickname,
    avatarUrl: targetUser.avatar_url,
    role: member.role,
    canUpload: member.can_upload,
    canDelete: member.can_delete,
    joinedAt: member.joined_at,
  };
}

// ── Invites ──

export async function getAlbumInvites(
  prisma: PrismaClient,
  context: { albumId: string; userId: string }
): Promise<AlbumInviteItem[]> {
  await assertAlbumOwner(prisma, context.albumId, context.userId);

  const invites = await prisma.albumInvite.findMany({
    where: { album_id: context.albumId },
    orderBy: { created_at: "desc" },
  });

  return invites.map((invite) => ({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    status: invite.status,
    token: invite.token,
    createdAt: invite.created_at,
    expiredAt: invite.expired_at,
  }));
}

export async function createAlbumInvite(
  prisma: PrismaClient,
  context: { albumId: string; userId: string; email: string }
) {
  await assertAlbumOwner(prisma, context.albumId, context.userId);

  const email = context.email.trim().toLowerCase();
  if (!email || !email.includes("@")) throw new Error("请输入有效的邮箱地址");

  const existing = await prisma.albumInvite.findFirst({
    where: {
      album_id: context.albumId,
      email,
      status: INVITE_STATUS.PENDING,
    },
  });

  if (existing) {
    throw new Error("此邮箱已有待处理的邀请");
  }

  // Check if email already belongs to a member
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const membership = await prisma.albumMember.findUnique({
      where: {
        album_id_user_id: {
          album_id: context.albumId,
          user_id: user.id,
        },
      },
    });
    if (membership) throw new Error("该用户已是此相册成员");
  }

  const token = randomUUID();
  const expiredAt = new Date(Date.now() + INVITE_DURATION_MS);

  return prisma.albumInvite.create({
    data: {
      album_id: context.albumId,
      email,
      role: "member",
      invited_by: context.userId,
      token,
      status: "pending",
      expired_at: expiredAt,
    },
  });
}

export async function acceptAlbumInvite(
  prisma: PrismaClient,
  context: { token: string; userId: string }
) {
  const invite = await prisma.albumInvite.findUnique({
    where: { token: context.token },
  });

  if (!invite) throw new Error("邀请不存在");

  // Already accepted — check if membership exists (idempotent)
  if (invite.status === INVITE_STATUS.ACCEPTED) {
    const existingMember = await prisma.albumMember.findUnique({
      where: {
        album_id_user_id: { album_id: invite.album_id, user_id: context.userId },
      },
    });
    if (existingMember) {
      return { albumId: invite.album_id, alreadyMember: true };
    }
    throw new Error("邀请已失效");
  }

  if (invite.status !== "pending") throw new Error("邀请已失效");

  if (invite.expired_at < new Date()) {
    await prisma.albumInvite.update({
      where: { id: invite.id },
      data: { status: INVITE_STATUS.EXPIRED },
    });
    throw new Error("邀请已过期");
  }

  const user = await prisma.user.findUnique({ where: { id: context.userId } });
  if (!user || user.email !== invite.email) {
    throw new Error("此邀请对应的邮箱与你的账号邮箱不一致");
  }

  // Use transaction to ensure atomicity and avoid duplicate members
  await prisma.$transaction([
    prisma.albumMember.upsert({
      where: {
        album_id_user_id: { album_id: invite.album_id, user_id: context.userId },
      },
      create: {
        album_id: invite.album_id,
        user_id: context.userId,
        role: invite.role,
      },
      update: {}, // No-op if already exists
    }),
    prisma.albumInvite.update({
      where: { id: invite.id },
      data: { status: "accepted" },
    }),
  ]);

  return { albumId: invite.album_id };
}

export async function revokeAlbumInvite(
  prisma: PrismaClient,
  context: { inviteId: string; albumId: string; userId: string }
) {
  await assertAlbumOwner(prisma, context.albumId, context.userId);

  const invite = await prisma.albumInvite.findUnique({ where: { id: context.inviteId } });
  if (!invite || invite.album_id !== context.albumId) throw new Error("邀请不存在");

  if (invite.status !== INVITE_STATUS.PENDING) {
    // Already revoked/accepted/expired — idempotent
    return;
  }

  await prisma.albumInvite.update({
    where: { id: context.inviteId },
    data: { status: INVITE_STATUS.REVOKED },
  });
}

export async function resendAlbumInvite(
  prisma: PrismaClient,
  context: { inviteId: string; albumId: string; userId: string }
) {
  await assertAlbumOwner(prisma, context.albumId, context.userId);

  const invite = await prisma.albumInvite.findUnique({ where: { id: context.inviteId } });
  if (!invite || invite.album_id !== context.albumId) throw new Error("邀请不存在");

  const newToken = randomUUID();
  const newExpiredAt = new Date(Date.now() + INVITE_DURATION_MS);

  // In a transaction: expire old, create new
  const [newInvite] = await prisma.$transaction([
    prisma.albumInvite.create({
      data: {
        album_id: invite.album_id,
        email: invite.email,
        role: invite.role,
        invited_by: invite.invited_by,
        token: newToken,
        status: INVITE_STATUS.PENDING,
        expired_at: newExpiredAt,
      },
    }),
    prisma.albumInvite.update({
      where: { id: invite.id },
      data: { status: INVITE_STATUS.EXPIRED },
    }),
  ]);

  return newInvite;
}

// ── Default Album ──

export async function createDefaultAlbum(
  prisma: PrismaClient,
  userId: string
) {
  const album = await prisma.album.create({
    data: {
      creator_id: userId,
      name: "全部照片",
      description: "所有上传的照片",
      is_default: true,
      is_immutable: true,
    },
  });

  await prisma.albumMember.create({
    data: {
      album_id: album.id,
      user_id: userId,
      role: "owner",
    },
  });

  return album;
}

export async function getUserDefaultAlbumId(
  prisma: PrismaClient,
  userId: string
): Promise<string> {
  const membership = await prisma.albumMember.findFirst({
    where: {
      user_id: userId,
      album: { is_default: true },
    },
    include: { album: true },
  });

  if (!membership) throw new Error("默认相册不存在");
  return membership.album.id;
}
