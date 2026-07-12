import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { formatChildAgeLabel } from "@/lib/media/child-age";

export type MemoryPhotoItem = {
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
  takenAt: string | null;
  uploadedAt: string;
  effectiveAt: string;
  isFavorited: boolean;
};

export type OnThisDayMemory = {
  title: string;
  items: MemoryPhotoItem[];
};

export type ChildMonthlyReport = {
  albumId: string;
  albumName: string;
  childBirthDate: string;
  childAgeLabel: string | null;
  monthLabel: string;
  photoCount: number;
  items: MemoryPhotoItem[];
};

export type AnnualHighlight = {
  year: number;
  items: MemoryPhotoItem[];
};

export type MemoryDashboard = {
  onThisDay: OnThisDayMemory;
  childReports: ChildMonthlyReport[];
  annualHighlights: AnnualHighlight[];
};

type MemoryRow = {
  id: string;
  albumId: string;
  albumName: string;
  displayName: string | null;
  originalName: string;
  thumbnailUrl: string;
  previewUrl: string;
  originalUrl: string;
  mimeType: string;
  mediaType: "image" | "video";
  takenAt: Date | null;
  uploadedAt: Date;
  effectiveAt: Date;
  isFavorited: boolean;
};

function mapRow(row: MemoryRow): MemoryPhotoItem {
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
    takenAt: row.takenAt?.toISOString() ?? null,
    uploadedAt: row.uploadedAt.toISOString(),
    effectiveAt: row.effectiveAt.toISOString(),
    isFavorited: row.isFavorited,
  };
}

function accessibleMediaFilter(userId: string) {
  return Prisma.sql`
    (
      EXISTS (
        SELECT 1
        FROM "AlbumMember" am
        WHERE am.album_id = m.album_id
          AND am.user_id = ${userId}::uuid
      )
      OR EXISTS (
        SELECT 1
        FROM "AlbumPhoto" ap
        INNER JOIN "AlbumMember" am2 ON am2.album_id = ap.album_id
        WHERE ap.photo_id = m.id
          AND am2.user_id = ${userId}::uuid
      )
    )
  `;
}

async function loadMediaRows(
  prisma: PrismaClient,
  userId: string,
  whereSql: Prisma.Sql,
  limit: number
): Promise<MemoryPhotoItem[]> {
  const rows = await prisma.$queryRaw<MemoryRow[]>(Prisma.sql`
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
      m.taken_at AS "takenAt",
      m.uploaded_at AS "uploadedAt",
      COALESCE(m.taken_at, m.uploaded_at) AS "effectiveAt",
      EXISTS (
        SELECT 1
        FROM "Favorite" f
        WHERE f.photo_id = m.id
          AND f.user_id = ${userId}::uuid
      ) AS "isFavorited"
    FROM "Media" m
    INNER JOIN "Album" a ON a.id = m.album_id
    WHERE m.status = 'normal'
      AND ${accessibleMediaFilter(userId)}
      AND ${whereSql}
    ORDER BY COALESCE(m.taken_at, m.uploaded_at) DESC, m.id DESC
    LIMIT ${limit}
  `);

  return rows.map(mapRow);
}

function formatMonthLabel(date: Date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

export async function getMemoryDashboard(prisma: PrismaClient, userId: string, now = new Date()): Promise<MemoryDashboard> {
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const year = now.getFullYear();
  const monthStart = new Date(year, now.getMonth(), 1);
  const yearStart = new Date(year, 0, 1);

  const [onThisDayItems, childAlbums, annualItems] = await Promise.all([
    loadMediaRows(
      prisma,
      userId,
      Prisma.sql`
        m.taken_at IS NOT NULL
        AND EXTRACT(MONTH FROM m.taken_at) = ${month}
        AND EXTRACT(DAY FROM m.taken_at) = ${day}
      `,
      12
    ),
    prisma.album.findMany({
      where: {
        is_child_album: true,
        members: { some: { user_id: userId } },
      },
      select: {
        id: true,
        name: true,
        child_birth_date: true,
      },
      orderBy: { updated_at: "desc" },
    }),
    loadMediaRows(
      prisma,
      userId,
      Prisma.sql`
        COALESCE(m.taken_at, m.uploaded_at) >= ${yearStart}
      `,
      12
    ),
  ]);

  const childReports: ChildMonthlyReport[] = await Promise.all(
    childAlbums.map(async (album) => {
      const items = await loadMediaRows(
        prisma,
        userId,
        Prisma.sql`
          m.album_id = ${album.id}::uuid
          AND COALESCE(m.taken_at, m.uploaded_at) >= ${monthStart}
        `,
        6
      );

      return {
        albumId: album.id,
        albumName: album.name,
        childBirthDate: album.child_birth_date ? album.child_birth_date.toISOString() : "",
        childAgeLabel: album.child_birth_date ? formatChildAgeLabel(now, album.child_birth_date) : null,
        monthLabel: formatMonthLabel(now),
        photoCount: items.length,
        items,
      };
    })
  );

  const annualHighlightsByYear = new Map<number, MemoryPhotoItem[]>();
  for (const item of annualItems) {
    const date = new Date(item.effectiveAt);
    const bucket = annualHighlightsByYear.get(date.getFullYear());
    if (bucket) {
      bucket.push(item);
    } else {
      annualHighlightsByYear.set(date.getFullYear(), [item]);
    }
  }

  const annualHighlights = Array.from(annualHighlightsByYear.entries())
    .map(([yearKey, items]) => ({
      year: yearKey,
      items: items.slice(0, 8),
    }))
    .sort((a, b) => b.year - a.year)
    .slice(0, 3);

  return {
    onThisDay: {
      title: `${month}月${day}日 · 往年今日`,
      items: onThisDayItems,
    },
    childReports,
    annualHighlights,
  };
}
