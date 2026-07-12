import type { PrismaClient } from "@prisma/client";
import { z } from "zod";

export const mapQuerySchema = z.object({
  includeHidden: z.coerce.boolean().optional().default(false),
});

export type MapMediaPoint = {
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
  latitude: number;
  longitude: number;
  takenAt: string | null;
  uploadedAt: string;
  locationHidden: boolean;
  isFavorited: boolean;
  canEditLocation: boolean;
};

export type MapCluster = {
  key: string;
  latitude: number;
  longitude: number;
  count: number;
  items: MapMediaPoint[];
};

type MapMediaRecord = {
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
  latitude: number | null;
  longitude: number | null;
  location_hidden: boolean;
  taken_at: Date | null;
  uploaded_at: Date;
  favorites?: { id: string }[];
};

function canEditLocation(record: MapMediaRecord, userId: string) {
  if (record.uploader_id === userId) return true;
  if (record.album.creator_id === userId) return true;

  for (const linked of record.albumPhotos ?? []) {
    if (linked.album.creator_id === userId) {
      return true;
    }
  }

  return false;
}

function mapMediaPoint(record: MapMediaRecord, userId: string): MapMediaPoint {
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
    latitude: record.latitude ?? 0,
    longitude: record.longitude ?? 0,
    takenAt: record.taken_at?.toISOString() ?? null,
    uploadedAt: record.uploaded_at.toISOString(),
    locationHidden: record.location_hidden,
    isFavorited: !!record.favorites?.length,
    canEditLocation: canEditLocation(record, userId),
  };
}

function getEffectiveDate(item: Pick<MapMediaPoint, "takenAt" | "uploadedAt">) {
  return new Date(item.takenAt ?? item.uploadedAt);
}

function getBucketSize(zoom: number) {
  if (zoom >= 2.25) return 5;
  if (zoom >= 1.75) return 10;
  if (zoom >= 1.25) return 20;
  return 30;
}

export function clusterMapPoints(items: MapMediaPoint[], zoom: number): MapCluster[] {
  const bucketSize = getBucketSize(zoom);
  const buckets = new Map<string, MapMediaPoint[]>();

  const sorted = [...items].sort((a, b) => {
    const delta = getEffectiveDate(b).getTime() - getEffectiveDate(a).getTime();
    if (delta !== 0) return delta;
    return b.id.localeCompare(a.id);
  });

  for (const item of sorted) {
    const bucketLat = Math.round(item.latitude / bucketSize) * bucketSize;
    const bucketLng = Math.round(item.longitude / bucketSize) * bucketSize;
    const key = `${bucketLat}:${bucketLng}`;
    const current = buckets.get(key);
    if (current) {
      current.push(item);
    } else {
      buckets.set(key, [item]);
    }
  }

  return Array.from(buckets.entries())
    .map(([key, bucketItems]) => {
      const avgLat = bucketItems.reduce((sum, item) => sum + item.latitude, 0) / bucketItems.length;
      const avgLng = bucketItems.reduce((sum, item) => sum + item.longitude, 0) / bucketItems.length;
      return {
        key,
        latitude: avgLat,
        longitude: avgLng,
        count: bucketItems.length,
        items: bucketItems,
      };
    })
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.key.localeCompare(b.key);
    });
}

export async function getMapMediaPoints(
  prisma: PrismaClient,
  context: { userId: string; includeHidden?: boolean }
): Promise<MapMediaPoint[]> {
  const records = await prisma.media.findMany({
    where: {
      status: "normal",
      latitude: { not: null },
      longitude: { not: null },
      ...(context.includeHidden ? {} : { location_hidden: false }),
      OR: [
        {
          album: {
            members: {
              some: { user_id: context.userId },
            },
          },
        },
        {
          albumPhotos: {
            some: {
              album: {
                members: {
                  some: { user_id: context.userId },
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
        where: { user_id: context.userId },
        select: { id: true },
      },
    },
    orderBy: [
      { taken_at: "desc" },
      { uploaded_at: "desc" },
      { id: "desc" },
    ],
  });

  return (records as unknown as MapMediaRecord[])
    .filter((record) => record.latitude != null && record.longitude != null)
    .map((record) => mapMediaPoint(record, context.userId));
}
