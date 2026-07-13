import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { deleteAdminFile, listAdminFiles } from "@/lib/admin/files";

function createPrismaMock({ media, albumPhotos = [], favorites = [], shares = [], coverAlbums = [] }: {
  media: Array<Record<string, unknown>>;
  albumPhotos?: Array<Record<string, unknown>>;
  favorites?: Array<Record<string, unknown>>;
  shares?: Array<Record<string, unknown>>;
  coverAlbums?: Array<Record<string, unknown>>;
}) {
  return {
    media: {
      findMany: vi.fn().mockResolvedValue(media),
    },
    album: {
      findMany: vi.fn().mockResolvedValue(coverAlbums),
    },
    albumPhoto: {
      findMany: vi.fn().mockResolvedValue(albumPhotos),
    },
    favorite: {
      findMany: vi.fn().mockResolvedValue(favorites),
    },
    photoShare: {
      findMany: vi.fn().mockResolvedValue(shares),
    },
  } as never;
}

function createMediaReferenceFixture(photoId: string) {
  return {
    photo_id: photoId,
    added_at: new Date("2026-01-02T00:00:00.000Z"),
    album: {
      id: "album-1",
      name: "示例相册",
      description: "示例描述",
      is_child_album: false,
      child_birth_date: null,
      is_default: false,
      is_immutable: false,
      created_at: new Date("2026-01-01T00:00:00.000Z"),
      updated_at: new Date("2026-01-03T00:00:00.000Z"),
      creator: {
        id: "user-1",
        email: "creator@example.com",
        nickname: "Creator",
      },
    },
    addedBy: {
      id: "user-2",
      email: "adder@example.com",
      nickname: "Adder",
    },
  };
}

describe("listAdminFiles", () => {
  it("lists recursive files with reference counts", async () => {
    const root = mkdtempSync(join(tmpdir(), "admin-files-"));
    try {
      mkdirSync(join(root, "storage", "originals"), { recursive: true });
      mkdirSync(join(root, "storage", "previews"), { recursive: true });
      writeFileSync(join(root, "storage", "originals", "a.jpg"), "a");
      writeFileSync(join(root, "storage", "previews", "a.jpg"), "a");

      const prisma = createPrismaMock({
        media: [
          {
            id: "media-1",
            storage_path: "a.jpg",
            media_type: "image",
            original_url: "/api/files/originals/a.jpg",
            preview_url: "/api/files/previews/a.jpg",
            thumbnail_url: "/api/files/thumbnails/a.jpg",
            original_name: "a.jpg",
            uploaded_at: new Date("2026-01-01T00:00:00.000Z"),
          },
        ],
        albumPhotos: [createMediaReferenceFixture("media-1")],
      });

      const result = await listAdminFiles(prisma, root, {
        keyword: "a",
        page: 1,
        pageSize: 10,
        sortBy: "relativePath",
        sortOrder: "asc",
      });

      expect(result.total).toBe(1);
      expect(result.items[0]?.relativePath).toBe("storage/originals/a.jpg");
      expect(result.items[0]?.referenceCount).toBe(1);
      expect(result.items[0]?.fileCount).toBe(2);
      expect(result.items[0]?.references).toHaveLength(1);
      expect(result.items[0]?.previewUrl).toBe("/api/admin/storage/previews/a.jpg");
      expect(result.items[0]?.thumbnailUrl).toBe("/api/admin/storage/thumbnails/a.jpg");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("refuses to delete referenced files", async () => {
    const root = mkdtempSync(join(tmpdir(), "admin-files-delete-"));
    try {
      mkdirSync(join(root, "storage", "originals"), { recursive: true });
      writeFileSync(join(root, "storage", "originals", "a.jpg"), "a");

      const prisma = createPrismaMock({
        media: [
          {
            id: "media-1",
            storage_path: "a.jpg",
            media_type: "image",
            original_url: "/api/files/originals/a.jpg",
            preview_url: "/api/files/previews/a.jpg",
            thumbnail_url: "/api/files/thumbnails/a.jpg",
            original_name: "a.jpg",
            uploaded_at: new Date("2026-01-01T00:00:00.000Z"),
          },
        ],
        albumPhotos: [createMediaReferenceFixture("media-1")],
      });

      await expect(deleteAdminFile(prisma, root, "storage/originals/a.jpg")).rejects.toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
