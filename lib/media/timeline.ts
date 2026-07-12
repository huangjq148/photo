import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";

const timelineCursorSchema = z.object({
  effectiveAt: z.string().datetime(),
  id: z.string().uuid(),
});

export const timelineQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(50).default(24),
});

export type TimelineQuery = z.infer<typeof timelineQuerySchema>;
export type TimelineCursor = z.infer<typeof timelineCursorSchema>;

export type TimelineGroupMode = "day" | "month" | "year";

export type TimelinePhotoItem = {
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
  takenAt: string | null;
  uploadedAt: string;
  effectiveAt: string;
  isFavorited: boolean;
};

export type TimelinePage = {
  items: TimelinePhotoItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

type TimelineRow = {
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
  takenAt: Date | null;
  uploadedAt: Date;
  effectiveAt: Date;
  isFavorited: boolean;
};

function clampPageSize(value: number) {
  return Math.min(Math.max(Math.floor(value), 1), 50);
}

export function encodeTimelineCursor(cursor: TimelineCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeTimelineCursor(cursor: string): TimelineCursor {
  const raw = Buffer.from(cursor, "base64url").toString("utf8");
  return timelineCursorSchema.parse(JSON.parse(raw));
}

export function getTimelineEffectiveDate(item: Pick<TimelinePhotoItem, "takenAt" | "uploadedAt">) {
  return new Date(item.takenAt ?? item.uploadedAt);
}

export function formatTimelineGroupLabel(date: Date, mode: TimelineGroupMode) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if (mode === "year") {
    return `${year}年`;
  }

  if (mode === "month") {
    return `${year}年${month}月`;
  }

  return `${year}年${month}月${day}日`;
}

export function groupTimelinePhotos(items: TimelinePhotoItem[], mode: TimelineGroupMode) {
  const groups = new Map<string, TimelinePhotoItem[]>();
  const sorted = [...items].sort((a, b) => {
    const delta = getTimelineEffectiveDate(b).getTime() - getTimelineEffectiveDate(a).getTime();
    if (delta !== 0) return delta;
    return b.id.localeCompare(a.id);
  });

  for (const item of sorted) {
    const key = formatTimelineGroupLabel(getTimelineEffectiveDate(item), mode);
    const group = groups.get(key);
    if (group) {
      group.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  return groups;
}

function mapTimelineRow(row: TimelineRow): TimelinePhotoItem {
  return {
    id: row.id,
    albumId: row.albumId,
    albumName: row.albumName,
    displayName: row.displayName,
    originalName: row.originalName,
    thumbnailUrl: row.thumbnailUrl,
    previewUrl: row.previewUrl,
    originalUrl: row.originalUrl,
    mimeType: row.mimeType,
    mediaType: row.mediaType,
    duration: row.duration,
    width: row.width,
    height: row.height,
    takenAt: row.takenAt?.toISOString() ?? null,
    uploadedAt: row.uploadedAt.toISOString(),
    effectiveAt: row.effectiveAt.toISOString(),
    isFavorited: row.isFavorited,
  };
}

export async function getTimelinePhotos(
  prisma: PrismaClient,
  context: {
    userId: string;
    cursor?: string;
    pageSize?: number;
  }
): Promise<TimelinePage> {
  const pageSize = clampPageSize(context.pageSize ?? 24);
  const parsedCursor = context.cursor ? decodeTimelineCursor(context.cursor) : null;
  const cursorFilter = parsedCursor
    ? Prisma.sql`
        AND (COALESCE(m.taken_at, m.uploaded_at), m.id) < (${new Date(parsedCursor.effectiveAt)}, ${parsedCursor.id}::uuid)
      `
    : Prisma.empty;

  const rows = await prisma.$queryRaw<TimelineRow[]>(Prisma.sql`
    SELECT
      m.id,
      m.album_id AS "albumId",
      a.name AS "albumName",
      m.display_name AS "displayName",
      m.original_name AS "originalName",
      m.thumbnail_url AS "thumbnailUrl",
      m.preview_url AS "previewUrl",
      m.original_url AS "originalUrl",
      m.mime_type AS "mimeType",
      m.media_type AS "mediaType",
      m.duration_seconds AS "duration",
      m.width,
      m.height,
      m.taken_at AS "takenAt",
      m.uploaded_at AS "uploadedAt",
      COALESCE(m.taken_at, m.uploaded_at) AS "effectiveAt",
      EXISTS (
        SELECT 1
        FROM "Favorite" f
        WHERE f.photo_id = m.id
          AND f.user_id = ${context.userId}::uuid
      ) AS "isFavorited"
    FROM "Media" m
    INNER JOIN "Album" a ON a.id = m.album_id
    WHERE m.status = 'normal'
      AND EXISTS (
        SELECT 1
        FROM "AlbumMember" am
        WHERE am.album_id = m.album_id
          AND am.user_id = ${context.userId}::uuid
      )
      ${cursorFilter}
    ORDER BY COALESCE(m.taken_at, m.uploaded_at) DESC, m.id DESC
    LIMIT ${pageSize + 1}
  `);

  const hasMore = rows.length > pageSize;
  const items = rows.slice(0, pageSize).map(mapTimelineRow);
  const lastItem = items[items.length - 1];

  return {
    items,
    hasMore,
    nextCursor:
      hasMore && lastItem
        ? encodeTimelineCursor({
            effectiveAt: lastItem.effectiveAt,
            id: lastItem.id,
          })
        : null,
  };
}
