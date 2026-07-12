import type { PrismaClient } from "@prisma/client";
import { z } from "zod";

export const duplicateQuerySchema = z.object({
  includeDeleted: z.coerce.boolean().optional().default(false),
});

export type DuplicateMediaItem = {
  id: string;
  albumId: string;
  albumName: string;
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
  sizeBytes: string;
  checksum: string;
  takenAt: string | null;
  uploadedAt: string;
  isFavorited: boolean;
  canDelete: boolean;
};

export type DuplicateGroup = {
  checksum: string;
  items: DuplicateMediaItem[];
  totalSizeBytes: string;
  potentialSaveBytes: string;
  suggestedKeeperId: string;
};

type DuplicateMediaRecord = {
  id: string;
  album_id: string;
  uploader_id: string;
  album: {
    name: string;
    creator_id: string;
  };
  albumPhotos?: {
    album: {
      creator_id: string;
    };
  }[];
  display_name: string | null;
  original_name: string;
  thumbnail_url: string;
  preview_url: string;
  original_url: string;
  mime_type: string;
  media_type: "image" | "video";
  duration_seconds: number | null;
  width: number;
  height: number;
  size: bigint;
  checksum: string | null;
  taken_at: Date | null;
  uploaded_at: Date;
  favorites?: { id: string }[];
};

function getEffectiveDate(item: Pick<DuplicateMediaItem, "takenAt" | "uploadedAt">) {
  return new Date(item.takenAt ?? item.uploadedAt);
}

function isManageable(record: DuplicateMediaRecord, userId: string) {
  if (record.uploader_id === userId) return true;
  if (record.album.creator_id === userId) return true;

  for (const linked of record.albumPhotos ?? []) {
    if (linked.album.creator_id === userId) {
      return true;
    }
  }

  return false;
}

function mapDuplicateItem(record: DuplicateMediaRecord, userId: string): DuplicateMediaItem {
  const checksum = record.checksum ?? "";
  return {
    id: record.id,
    albumId: record.album_id,
    albumName: record.album.name,
    displayName: record.display_name,
    originalName: record.original_name,
    thumbnailUrl: record.thumbnail_url,
    previewUrl: record.preview_url,
    originalUrl: record.original_url,
    mimeType: record.mime_type,
    mediaType: record.media_type,
    duration: record.duration_seconds,
    width: record.width,
    height: record.height,
    sizeBytes: record.size.toString(),
    checksum,
    takenAt: record.taken_at?.toISOString() ?? null,
    uploadedAt: record.uploaded_at.toISOString(),
    isFavorited: !!record.favorites?.length,
    canDelete: isManageable(record, userId),
  };
}

export function groupDuplicateMediaItems(items: DuplicateMediaItem[]): DuplicateGroup[] {
  const grouped = new Map<string, DuplicateMediaItem[]>();

  const sortedItems = [...items].sort((a, b) => {
    const delta = getEffectiveDate(b).getTime() - getEffectiveDate(a).getTime();
    if (delta !== 0) return delta;
    return b.id.localeCompare(a.id);
  });

  for (const item of sortedItems) {
    const group = grouped.get(item.checksum);
    if (group) {
      group.push(item);
    } else {
      grouped.set(item.checksum, [item]);
    }
  }

  const groups = Array.from(grouped.entries())
    .filter(([, group]) => group.length > 1)
    .map(([checksum, group]) => {
      const byRetentionPreference = [...group].sort((a, b) => {
        const delta = getEffectiveDate(a).getTime() - getEffectiveDate(b).getTime();
        if (delta !== 0) return delta;
        return a.id.localeCompare(b.id);
      });

      const totalSize = group.reduce((sum, item) => sum + BigInt(item.sizeBytes), 0n);
      const keeper = byRetentionPreference[0] ?? group[0];
      const keeperSize = keeper ? BigInt(keeper.sizeBytes) : 0n;

      return {
        checksum,
        items: group,
        totalSizeBytes: totalSize.toString(),
        potentialSaveBytes: (totalSize - keeperSize).toString(),
        suggestedKeeperId: keeper?.id ?? group[0]!.id,
      };
    });

  return groups.sort((a, b) => {
    const aDate = getEffectiveDate(a.items[0]!);
    const bDate = getEffectiveDate(b.items[0]!);
    const delta = bDate.getTime() - aDate.getTime();
    if (delta !== 0) return delta;
    return b.checksum.localeCompare(a.checksum);
  });
}

export async function getDuplicateMediaGroups(prisma: PrismaClient, userId: string) {
  const records = await prisma.media.findMany({
    where: {
      status: "normal",
      checksum: { not: null },
      OR: [
        {
          album: {
            members: {
              some: { user_id: userId },
            },
          },
        },
        {
          albumPhotos: {
            some: {
              album: {
                members: {
                  some: { user_id: userId },
                },
              },
            },
          },
        },
      ],
    },
    include: {
      album: {
        select: {
          name: true,
          creator_id: true,
        },
      },
      albumPhotos: {
        select: {
          album: {
            select: {
              creator_id: true,
            },
          },
        },
      },
      favorites: {
        where: { user_id: userId },
        select: { id: true },
      },
    },
    orderBy: [
      { taken_at: "desc" },
      { uploaded_at: "desc" },
      { id: "desc" },
    ],
  });

  return groupDuplicateMediaItems(
    (records as unknown as DuplicateMediaRecord[])
      .filter((record) => !!record.checksum)
      .map((record) => mapDuplicateItem(record, userId))
  );
}
