import type { PrismaClient } from "@prisma/client";
import { loadAdminPhotoReferences, type AdminPhotoReferenceItem } from "@/lib/admin/photo-references";
import { buildAdminStorageFileUrl, extractAdminStorageFileName } from "@/lib/admin/storage-urls";
import { buildAdminPhotoReferenceCountMap } from "@/lib/admin/reference-counts";

export type AdminPhotoListQuery = {
  keyword?: string;
  page: number;
  pageSize: number;
  sortBy?: "uploadedAt" | "photoName" | "referenceCount";
  sortOrder?: "asc" | "desc";
};

export type AdminPhotoListItem = {
  id: string;
  photoName: string;
  thumbnailUrl: string;
  previewUrl: string;
  originalUrl: string;
  uploaderEmail: string;
  uploadedAt: string;
  referenceCount: number;
  references: AdminPhotoReferenceItem[];
};

type MediaRecord = {
  id: string;
  display_name: string | null;
  original_name: string;
  thumbnail_url: string;
  preview_url: string;
  original_url: string;
  uploaded_at: Date;
  uploader: { email: string };
};

function clamp(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

function compareStrings(a: string, b: string) {
  return a.localeCompare(b, "zh-Hans-CN");
}

function getPhotoName(media: Pick<MediaRecord, "display_name" | "original_name">) {
  return media.display_name?.trim() || media.original_name;
}

export async function listAdminPhotos(prisma: PrismaClient, query: AdminPhotoListQuery) {
  const medias = (await prisma.media.findMany({
    where: { media_type: "image" },
    select: {
      id: true,
      display_name: true,
      original_name: true,
      thumbnail_url: true,
      preview_url: true,
      original_url: true,
      uploaded_at: true,
      uploader: { select: { email: true } },
    },
  })) as MediaRecord[];

  const ids = medias.map((media) => media.id);
  const [coverAlbums, albumPhotos, favorites, shares] = await Promise.all([
    prisma.album.findMany({
      where: { cover_photo_id: { in: ids } },
      select: { cover_photo_id: true },
    }),
    prisma.albumPhoto.findMany({
      where: { photo_id: { in: ids } },
      select: { photo_id: true },
    }),
    prisma.favorite.findMany({
      where: { photo_id: { in: ids } },
      select: { photo_id: true },
    }),
    prisma.photoShare.findMany({
      where: { photo_id: { in: ids } },
      select: { photo_id: true },
    }),
  ]);

  const counts = buildAdminPhotoReferenceCountMap({
    coverPhotoIds: coverAlbums.map((item) => item.cover_photo_id).filter((value): value is string => Boolean(value)),
    albumPhotoIds: albumPhotos.map((item) => item.photo_id),
    favoritePhotoIds: favorites.map((item) => item.photo_id),
    sharePhotoIds: shares.map((item) => item.photo_id),
  });
  const referencesByMediaId = await loadAdminPhotoReferences(prisma, ids);

  const keyword = query.keyword?.trim().toLowerCase() ?? "";
  const filtered = keyword
    ? medias.filter((media) => {
        const photoName = getPhotoName(media).toLowerCase();
        return (
          photoName.includes(keyword) ||
          media.uploader.email.toLowerCase().includes(keyword)
        );
      })
    : medias;

  const sorted = [...filtered].sort((a, b) => {
    const order = query.sortOrder === "asc" ? 1 : -1;
    const aName = getPhotoName(a);
    const bName = getPhotoName(b);
    const aCount = counts.get(a.id) ?? 0;
    const bCount = counts.get(b.id) ?? 0;

    let comparison = 0;
    switch (query.sortBy ?? "uploadedAt") {
      case "photoName":
        comparison = compareStrings(aName, bName);
        break;
      case "referenceCount":
        comparison = aCount - bCount;
        break;
      case "uploadedAt":
      default:
        comparison = a.uploaded_at.getTime() - b.uploaded_at.getTime();
        break;
    }

    if (comparison !== 0) {
      return comparison * order;
    }

    return compareStrings(a.id, b.id);
  });

  const page = clamp(query.page);
  const pageSize = clamp(query.pageSize);
  const total = sorted.length;
  const start = (page - 1) * pageSize;
  const items = sorted.slice(start, start + pageSize).map((media) => {
    const originalFileName = extractAdminStorageFileName(media.original_url) ?? media.original_name;
    const previewFileName = extractAdminStorageFileName(media.preview_url) ?? originalFileName;
    const thumbnailFileName = extractAdminStorageFileName(media.thumbnail_url) ?? originalFileName;

    return {
      id: media.id,
      photoName: getPhotoName(media),
      thumbnailUrl: buildAdminStorageFileUrl("thumbnails", thumbnailFileName),
      previewUrl: buildAdminStorageFileUrl("previews", previewFileName),
      originalUrl: buildAdminStorageFileUrl("originals", originalFileName),
      uploaderEmail: media.uploader.email,
      uploadedAt: media.uploaded_at.toISOString(),
      referenceCount: counts.get(media.id) ?? 0,
      references: referencesByMediaId.get(media.id) ?? [],
    } satisfies AdminPhotoListItem;
  });

  return {
    items,
    page,
    pageSize,
    total,
  };
}
