import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { assertAlbumMembership, assertAlbumOwner } from "@/lib/membership";

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
  photoCount: number;
  memberCount: number;
  role: string;
  updatedAt: Date;
};

export type AlbumDetail = {
  id: string;
  creatorId: string;
  name: string;
  description: string | null;
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

export type AlbumPhotoItem = {
  id: string;
  originalName: string;
  thumbnailUrl: string;
  previewUrl: string;
  mimeType: string;
  width: number;
  height: number;
  takenAt: Date | null;
  uploadedAt: Date;
};

export type AlbumMemberItem = {
  userId: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  role: string;
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
              photos: true,
              members: true,
            },
          },
          coverPhoto: {
            select: { thumbnail_url: true },
          },
          photos: {
            take: 1,
            orderBy: { added_at: "desc" },
            include: {
              photo: {
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
    lastPhotoUrl: m.album.photos[0]?.photo.thumbnail_url ?? null,
    isDefault: m.album.is_default,
    isImmutable: m.album.is_immutable,
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
        select: { photos: true, members: true },
      },
    },
  });

  if (!album) throw new Error("相册不存在");

  return {
    id: album.id,
    creatorId: album.creator_id,
    name: album.name,
    description: album.description,
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
  context: { albumId: string; userId: string; name?: string; description?: string }
) {
  const album = await prisma.album.findUnique({ where: { id: context.albumId } });
  if (!album) throw new Error("相册不存在");
  if (album.is_immutable) throw new Error("此相册不可编辑");

  await assertAlbumMembership(prisma, context.albumId, context.userId);

  const data: Record<string, unknown> = {};
  if (context.name !== undefined) {
    if (!context.name.trim()) throw new Error("相册名不能为空");
    data.name = context.name.trim();
  }
  if (context.description !== undefined) {
    data.description = context.description.trim() || null;
  }

  return prisma.album.update({
    where: { id: context.albumId },
    data,
  });
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
  await assertAlbumMembership(prisma, context.albumId, context.userId);

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
    page: number;
    pageSize: number;
    keyword?: string;
  }
) {
  await assertAlbumMembership(prisma, context.albumId, context.userId);

  const page = Math.max(1, Math.floor(context.page));
  const pageSize = Math.min(Math.max(Math.floor(context.pageSize), 1), 50);
  const keyword = context.keyword?.trim();

  const where: Record<string, unknown> = {
    album_id: context.albumId,
  };

  if (keyword) {
    where.photo = {
      status: "normal",
      OR: [
        { original_name: { contains: keyword, mode: "insensitive" } },
        { file_name: { contains: keyword, mode: "insensitive" } },
      ],
    };
  } else {
    where.photo = {
      status: "normal",
    };
  }

  const [total, refs] = await Promise.all([
    prisma.albumPhoto.count({ where }),
    prisma.albumPhoto.findMany({
      where,
      include: { photo: true },
      orderBy: { added_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    page,
    pageSize,
    total,
    items: refs.map((ref) => ({
      id: ref.photo.id,
      originalName: ref.photo.original_name,
      thumbnailUrl: ref.photo.thumbnail_url,
      previewUrl: ref.photo.preview_url,
      mimeType: ref.photo.mime_type,
      width: ref.photo.width,
      height: ref.photo.height,
      takenAt: ref.photo.taken_at,
      uploadedAt: ref.photo.uploaded_at,
    })),
  };
}

export async function addPhotosToAlbum(
  prisma: PrismaClient,
  context: { albumId: string; userId: string; photoIds: string[] }
) {
  const album = await prisma.album.findUnique({ where: { id: context.albumId } });
  if (!album) throw new Error("相册不存在");

  await assertAlbumMembership(prisma, context.albumId, context.userId);

  for (const photoId of context.photoIds) {
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
  }

  await prisma.album.update({
    where: { id: context.albumId },
    data: { updated_at: new Date() },
  });
}

export async function removePhotoFromAlbum(
  prisma: PrismaClient,
  context: { albumId: string; userId: string; photoId: string }
) {
  const album = await prisma.album.findUnique({ where: { id: context.albumId } });
  if (!album) throw new Error("相册不存在");

  await assertAlbumMembership(prisma, context.albumId, context.userId);

  if (album.cover_photo_id === context.photoId) {
    await prisma.album.update({
      where: { id: context.albumId },
      data: { cover_photo_id: null },
    });
  }

  await prisma.albumPhoto.deleteMany({
    where: {
      album_id: context.albumId,
      photo_id: context.photoId,
    },
  });

  await prisma.album.update({
    where: { id: context.albumId },
    data: { updated_at: new Date() },
  });
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
    joinedAt: m.joined_at,
  }));
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
  await assertAlbumMembership(prisma, context.albumId, context.userId);

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
    joinedAt: member.joined_at,
  };
}

// ── Invites ──

export async function getAlbumInvites(
  prisma: PrismaClient,
  context: { albumId: string; userId: string }
): Promise<AlbumInviteItem[]> {
  await assertAlbumMembership(prisma, context.albumId, context.userId);

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
  await assertAlbumMembership(prisma, context.albumId, context.userId);

  const email = context.email.trim().toLowerCase();

  const existing = await prisma.albumInvite.findFirst({
    where: {
      album_id: context.albumId,
      email,
      status: "pending",
    },
  });

  if (existing) {
    throw new Error("此邮箱已有待处理的邀请");
  }

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
  const expiredAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

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
  if (invite.status !== "pending") throw new Error("邀请已失效");
  if (invite.expired_at < new Date()) {
    await prisma.albumInvite.update({
      where: { id: invite.id },
      data: { status: "expired" },
    });
    throw new Error("邀请已过期");
  }

  const user = await prisma.user.findUnique({ where: { id: context.userId } });
  if (!user || user.email !== invite.email) {
    throw new Error("此邀请对应的邮箱与你的账号邮箱不一致");
  }

  await prisma.$transaction([
    prisma.albumMember.create({
      data: {
        album_id: invite.album_id,
        user_id: context.userId,
        role: invite.role,
      },
    }),
    prisma.albumInvite.update({
      where: { id: invite.id },
      data: { status: "accepted" },
    }),
  ]);

  return { albumId: invite.album_id };
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
