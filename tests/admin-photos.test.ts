import { describe, expect, it, vi } from "vitest";
import { listAdminPhotos } from "@/lib/admin/photos";

describe("listAdminPhotos", () => {
  it("searches, sorts, and paginates photo records", async () => {
    const prisma = {
      media: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "m-1",
            display_name: "Alpha",
            original_name: "alpha.jpg",
            thumbnail_url: "/thumb/alpha.jpg",
            preview_url: "/preview/alpha.jpg",
            original_url: "/original/alpha.jpg",
            uploaded_at: new Date("2026-07-13T00:00:00.000Z"),
            uploader: { email: "alice@example.com" },
          },
          {
            id: "m-2",
            display_name: null,
            original_name: "Beta.jpg",
            thumbnail_url: "/thumb/beta.jpg",
            preview_url: "/preview/beta.jpg",
            original_url: "/original/beta.jpg",
            uploaded_at: new Date("2026-07-12T00:00:00.000Z"),
            uploader: { email: "bob@example.com" },
          },
        ]),
      },
      album: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "album-1",
            name: "Alpha Album",
            description: "alpha description",
            is_child_album: false,
            child_birth_date: null,
            is_default: false,
            is_immutable: false,
            created_at: new Date("2026-07-10T00:00:00.000Z"),
            updated_at: new Date("2026-07-11T00:00:00.000Z"),
            creator: { id: "u-1", email: "owner@example.com", nickname: "Owner" },
            cover_photo_id: "m-1",
          },
        ]),
      },
      albumPhoto: {
        findMany: vi.fn().mockResolvedValue([
          {
            photo_id: "m-1",
            added_at: new Date("2026-07-12T00:00:00.000Z"),
            album: {
              id: "album-2",
              name: "Beta Album",
              description: null,
              is_child_album: false,
              child_birth_date: null,
              is_default: true,
              is_immutable: false,
              created_at: new Date("2026-07-09T00:00:00.000Z"),
              updated_at: new Date("2026-07-10T00:00:00.000Z"),
              creator: { id: "u-2", email: "album@example.com", nickname: "Album Owner" },
            },
            addedBy: { id: "u-3", email: "adder@example.com", nickname: "Adder" },
          },
          {
            photo_id: "m-1",
            added_at: new Date("2026-07-13T00:00:00.000Z"),
            album: {
              id: "album-3",
              name: "Gamma Album",
              description: null,
              is_child_album: true,
              child_birth_date: null,
              is_default: false,
              is_immutable: true,
              created_at: new Date("2026-07-08T00:00:00.000Z"),
              updated_at: new Date("2026-07-09T00:00:00.000Z"),
              creator: { id: "u-4", email: "gamma@example.com", nickname: "Gamma Owner" },
            },
            addedBy: { id: "u-5", email: "adder2@example.com", nickname: "Adder Two" },
          },
        ]),
      },
      favorite: {
        findMany: vi.fn().mockResolvedValue([
          { photo_id: "m-2", created_at: new Date("2026-07-13T01:00:00.000Z"), user: { id: "u-6", email: "fav@example.com", nickname: "Fav User" } },
        ]),
      },
      photoShare: {
        findMany: vi.fn().mockResolvedValue([
          {
            photo_id: "m-1",
            token: "share-token",
            created_at: new Date("2026-07-13T02:00:00.000Z"),
            expires_at: null,
            revoked_at: null,
            creator: { id: "u-7", email: "share@example.com", nickname: "Share User" },
          },
        ]),
      },
    } as never;

    const result = await listAdminPhotos(prisma, {
      keyword: "a",
      page: 1,
      pageSize: 10,
      sortBy: "referenceCount",
      sortOrder: "desc",
    });

    expect(result.total).toBe(2);
    expect(result.items[0]?.id).toBe("m-1");
    expect(result.items[0]?.referenceCount).toBe(4);
    expect(result.items[0]?.references).toHaveLength(4);
    expect(result.items[1]?.referenceCount).toBe(1);
  });
});
