import type { PrismaClient } from "@prisma/client";

export async function assertAlbumMembership(
  prisma: PrismaClient,
  albumId: string,
  userId: string
) {
  const membership = await prisma.albumMember.findUnique({
    where: {
      album_id_user_id: {
        album_id: albumId,
        user_id: userId,
      },
    },
  });

  if (!membership) {
    throw new Error("你不在这个相册中");
  }

  return membership;
}

export async function assertAlbumOwner(
  prisma: PrismaClient,
  albumId: string,
  userId: string
) {
  const membership = await assertAlbumMembership(prisma, albumId, userId);

  if (membership.role !== "owner") {
    throw new Error("只有相册拥有者可以执行此操作");
  }

  return membership;
}

export async function assertCanUpload(
  prisma: PrismaClient,
  albumId: string,
  userId: string
) {
  const membership = await assertAlbumMembership(prisma, albumId, userId);

  // Owner can always upload
  if (membership.role === "owner") return membership;

  if (!membership.can_upload) {
    throw new Error("你没有上传权限");
  }

  return membership;
}

export async function assertCanDelete(
  prisma: PrismaClient,
  albumId: string,
  userId: string
) {
  const membership = await assertAlbumMembership(prisma, albumId, userId);

  // Owner can always delete
  if (membership.role === "owner") return membership;

  if (!membership.can_delete) {
    throw new Error("你没有删除权限");
  }

  return membership;
}
