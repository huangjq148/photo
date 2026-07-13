import type { PrismaClient } from "@prisma/client";

export type AdminPhotoReferenceDetail = {
  label: string;
  value: string;
};

export type AdminPhotoReferenceItem = {
  id: string;
  kind: "cover" | "album-photo" | "favorite" | "share";
  kindLabel: string;
  title: string;
  subtitle: string;
  detailItems: AdminPhotoReferenceDetail[];
};

type UserSummary = {
  id: string;
  email: string;
  nickname: string;
};

type AlbumSummary = {
  id: string;
  name: string;
  description: string | null;
  is_child_album: boolean;
  child_birth_date: Date | null;
  is_default: boolean;
  is_immutable: boolean;
  created_at: Date;
  updated_at: Date;
  creator: UserSummary;
};

type CoverAlbumSummary = AlbumSummary & {
  cover_photo_id: string | null;
};

type AlbumPhotoSummary = {
  photo_id: string;
  added_at: Date;
  album: AlbumSummary;
  addedBy: UserSummary;
};

type FavoriteSummary = {
  photo_id: string;
  created_at: Date;
  user: UserSummary;
};

type PhotoShareSummary = {
  photo_id: string;
  token: string;
  created_at: Date;
  expires_at: Date | null;
  revoked_at: Date | null;
  creator: UserSummary;
};

function formatDate(value: Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatBool(value: boolean) {
  return value ? "是" : "否";
}

function formatUser(user: UserSummary) {
  return `${user.nickname} · ${user.email}`;
}

function pushReference(
  map: Map<string, AdminPhotoReferenceItem[]>,
  mediaId: string,
  item: AdminPhotoReferenceItem
) {
  const current = map.get(mediaId) ?? [];
  current.push(item);
  map.set(mediaId, current);
}

export async function loadAdminPhotoReferences(prisma: PrismaClient, mediaIds: string[]) {
  const uniqueIds = Array.from(new Set(mediaIds.filter(Boolean)));
  const referencesByMediaId = new Map<string, AdminPhotoReferenceItem[]>();

  if (uniqueIds.length === 0) {
    return referencesByMediaId;
  }

  const [coverAlbums, albumPhotos, favorites, shares] = await Promise.all([
    prisma.album.findMany({
      where: { cover_photo_id: { in: uniqueIds } },
      select: {
        id: true,
        name: true,
        description: true,
        is_child_album: true,
        child_birth_date: true,
        is_default: true,
        is_immutable: true,
        created_at: true,
        updated_at: true,
        creator: {
          select: {
            id: true,
            email: true,
            nickname: true,
          },
        },
        cover_photo_id: true,
      },
    }) as Promise<CoverAlbumSummary[]>,
    prisma.albumPhoto.findMany({
      where: { photo_id: { in: uniqueIds } },
      select: {
        photo_id: true,
        added_at: true,
        album: {
          select: {
            id: true,
            name: true,
            description: true,
            is_child_album: true,
            child_birth_date: true,
            is_default: true,
            is_immutable: true,
            created_at: true,
            updated_at: true,
            creator: {
              select: {
                id: true,
                email: true,
                nickname: true,
              },
            },
          },
        },
        addedBy: {
          select: {
            id: true,
            email: true,
            nickname: true,
          },
        },
      },
    }) as Promise<AlbumPhotoSummary[]>,
    prisma.favorite.findMany({
      where: { photo_id: { in: uniqueIds } },
      select: {
        photo_id: true,
        created_at: true,
        user: {
          select: {
            id: true,
            email: true,
            nickname: true,
          },
        },
      },
    }) as Promise<FavoriteSummary[]>,
    prisma.photoShare.findMany({
      where: { photo_id: { in: uniqueIds } },
      select: {
        photo_id: true,
        token: true,
        created_at: true,
        expires_at: true,
        revoked_at: true,
        creator: {
          select: {
            id: true,
            email: true,
            nickname: true,
          },
        },
      },
    }) as Promise<PhotoShareSummary[]>,
  ]);

  for (const album of coverAlbums) {
    if (!album.cover_photo_id) continue;

    pushReference(referencesByMediaId, album.cover_photo_id, {
      id: `cover-${album.id}`,
      kind: "cover",
      kindLabel: "封面",
      title: album.name,
      subtitle: `相册封面 · ${album.id}`,
      detailItems: [
        { label: "相册名称", value: album.name },
        { label: "相册 ID", value: album.id },
        { label: "相册描述", value: album.description?.trim() || "—" },
        { label: "是否子相册", value: formatBool(album.is_child_album) },
        { label: "是否默认相册", value: formatBool(album.is_default) },
        { label: "是否不可变更", value: formatBool(album.is_immutable) },
        { label: "相册生日", value: formatDate(album.child_birth_date) },
        { label: "创建者", value: formatUser(album.creator) },
        { label: "创建时间", value: formatDate(album.created_at) },
        { label: "更新时间", value: formatDate(album.updated_at) },
      ],
    });
  }

  for (const item of albumPhotos) {
    pushReference(referencesByMediaId, item.photo_id, {
      id: `album-photo-${item.album.id}-${item.added_at.getTime()}`,
      kind: "album-photo",
      kindLabel: "相册引用",
      title: item.album.name,
      subtitle: `加入相册 · ${item.album.id}`,
      detailItems: [
        { label: "相册名称", value: item.album.name },
        { label: "相册 ID", value: item.album.id },
        { label: "相册描述", value: item.album.description?.trim() || "—" },
        { label: "是否子相册", value: formatBool(item.album.is_child_album) },
        { label: "是否默认相册", value: formatBool(item.album.is_default) },
        { label: "是否不可变更", value: formatBool(item.album.is_immutable) },
        { label: "相册生日", value: formatDate(item.album.child_birth_date) },
        { label: "相册创建者", value: formatUser(item.album.creator) },
        { label: "相册创建时间", value: formatDate(item.album.created_at) },
        { label: "相册更新时间", value: formatDate(item.album.updated_at) },
        { label: "添加人", value: formatUser(item.addedBy) },
        { label: "添加时间", value: formatDate(item.added_at) },
      ],
    });
  }

  for (const item of favorites) {
    pushReference(referencesByMediaId, item.photo_id, {
      id: `favorite-${item.user.id}-${item.created_at.getTime()}`,
      kind: "favorite",
      kindLabel: "收藏",
      title: item.user.nickname,
      subtitle: `收藏记录 · ${item.user.email}`,
      detailItems: [
        { label: "用户昵称", value: item.user.nickname },
        { label: "用户邮箱", value: item.user.email },
        { label: "用户 ID", value: item.user.id },
        { label: "收藏时间", value: formatDate(item.created_at) },
      ],
    });
  }

  for (const item of shares) {
    pushReference(referencesByMediaId, item.photo_id, {
      id: `share-${item.token}`,
      kind: "share",
      kindLabel: "分享",
      title: item.token,
      subtitle: `分享链接 · ${item.creator.email}`,
      detailItems: [
        { label: "分享 token", value: item.token },
        { label: "创建者", value: formatUser(item.creator) },
        { label: "创建时间", value: formatDate(item.created_at) },
        { label: "过期时间", value: formatDate(item.expires_at) },
        { label: "撤销时间", value: formatDate(item.revoked_at) },
      ],
    });
  }

  return referencesByMediaId;
}
