import type { PrismaClient } from "@prisma/client";

export type AdminUserListQuery = {
  keyword?: string;
  page: number;
  pageSize: number;
  sortBy?: "createdAt" | "storageUsed" | "uploads";
  sortOrder?: "asc" | "desc";
};

export type AdminUserListItem = {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  storageLimit: string;
  storageUsed: string;
  createdAt: string;
  uploadCount: number;
  albumCount: number;
  membershipCount: number;
};

type UserRecord = {
  id: string;
  email: string;
  nickname: string;
  avatar_url: string | null;
  storage_limit: bigint;
  storage_used: bigint;
  created_at: Date;
  _count: {
    uploads: number;
    createdAlbums: number;
    albumMemberships: number;
  };
};

function clamp(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

export async function listAdminUsers(prisma: PrismaClient, query: AdminUserListQuery) {
  const keyword = query.keyword?.trim();
  const users = (await prisma.user.findMany({
    where: keyword
      ? {
          OR: [
            { email: { contains: keyword, mode: "insensitive" } },
            { nickname: { contains: keyword, mode: "insensitive" } },
          ],
        }
      : undefined,
    select: {
      id: true,
      email: true,
      nickname: true,
      avatar_url: true,
      storage_limit: true,
      storage_used: true,
      created_at: true,
      _count: {
        select: {
          uploads: true,
          createdAlbums: true,
          albumMemberships: true,
        },
      },
    },
  })) as UserRecord[];

  const order = query.sortOrder === "asc" ? 1 : -1;
  const sorted = [...users].sort((a, b) => {
    let comparison = 0;
    switch (query.sortBy ?? "createdAt") {
      case "storageUsed":
        comparison = Number(a.storage_used - b.storage_used);
        break;
      case "uploads":
        comparison = a._count.uploads - b._count.uploads;
        break;
      case "createdAt":
      default:
        comparison = a.created_at.getTime() - b.created_at.getTime();
        break;
    }
    return (comparison || a.email.localeCompare(b.email)) * order;
  });

  const page = clamp(query.page);
  const pageSize = clamp(query.pageSize);
  const total = sorted.length;
  const start = (page - 1) * pageSize;

  return {
    items: sorted.slice(start, start + pageSize).map((user) => ({
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatar_url,
      storageLimit: user.storage_limit.toString(),
      storageUsed: user.storage_used.toString(),
      createdAt: user.created_at.toISOString(),
      uploadCount: user._count.uploads,
      albumCount: user._count.createdAlbums,
      membershipCount: user._count.albumMemberships,
    } satisfies AdminUserListItem)),
    page,
    pageSize,
    total,
  };
}
