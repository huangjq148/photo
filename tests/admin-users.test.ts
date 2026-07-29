import { describe, expect, it, vi } from "vitest";
import { listAdminUsers } from "@/lib/admin/users";

describe("listAdminUsers", () => {
  it("filters, sorts, and paginates users without leaking password fields", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "u-1",
        email: "alice@example.com",
        nickname: "Alice",
        avatar_url: null,
        storage_limit: BigInt(1000),
        storage_used: BigInt(800),
        created_at: new Date("2026-07-13T00:00:00.000Z"),
        _count: { uploads: 8, createdAlbums: 2, albumMemberships: 3 },
      },
      {
        id: "u-2",
        email: "bob@example.com",
        nickname: "Bob",
        avatar_url: null,
        storage_limit: BigInt(1000),
        storage_used: BigInt(100),
        created_at: new Date("2026-07-12T00:00:00.000Z"),
        _count: { uploads: 1, createdAlbums: 1, albumMemberships: 1 },
      },
    ]);
    const prisma = {
      user: {
        findMany,
      },
    } as never;

    const result = await listAdminUsers(prisma, {
      keyword: "alice",
      page: 1,
      pageSize: 1,
      sortBy: "storageUsed",
      sortOrder: "desc",
    });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [{ email: { contains: "alice", mode: "insensitive" } }, { nickname: { contains: "alice", mode: "insensitive" } }] },
    }));
    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ id: "u-1", storageUsed: "800", uploadCount: 8 });
    expect(result.items[0]).not.toHaveProperty("password_hash");
  });
});
