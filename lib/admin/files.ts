import type { PrismaClient } from "@prisma/client";
import { extname } from "node:path";
import {
  deleteAdminDataFile,
  listAdminDataFiles,
  resolveAdminDataRelativePath,
} from "@/lib/admin/file-tree";
import { buildAdminPhotoReferenceCountMap } from "@/lib/admin/reference-counts";
import { buildAdminFileReferenceCountMap, resolveAdminFileRelativePaths } from "@/lib/admin/reference-counts";
import { loadAdminPhotoReferences, type AdminPhotoReferenceItem } from "@/lib/admin/photo-references";
import { buildAdminStorageFileUrl, extractAdminStorageFileName } from "@/lib/admin/storage-urls";

export type AdminFileListQuery = {
  keyword?: string;
  page: number;
  pageSize: number;
  sortBy?: "fileName" | "relativePath" | "size" | "referenceCount" | "lastModifiedAt";
  sortOrder?: "asc" | "desc";
};

export type AdminFileListItem = {
  fileName: string;
  relativePath: string;
  fileType: string;
  previewUrl: string | null;
  thumbnailUrl: string | null;
  size: number;
  lastModifiedAt: string;
  referenceCount: number;
  fileCount: number;
  references: AdminPhotoReferenceItem[];
  canDelete: boolean;
};

type MediaRecord = {
  id: string;
  storage_path: string;
  media_type: "image" | "video";
  original_url: string;
  preview_url: string;
  thumbnail_url: string;
  original_name: string;
  uploaded_at: Date;
};

function clamp(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

function compareStrings(a: string, b: string) {
  return a.localeCompare(b, "zh-Hans-CN");
}

function inferFileType(fileName: string) {
  const ext = extname(fileName).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".heic", ".bmp", ".tif", ".tiff"].includes(ext)) {
    return "image";
  }
  if ([".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv"].includes(ext)) {
    return "video";
  }
  if ([".txt", ".md", ".json", ".csv"].includes(ext)) {
    return "text";
  }
  return "未知";
}

function buildAdminFilePreviewUrlMap(medias: MediaRecord[], storageRootName = "storage") {
  const map = new Map<string, { previewUrl: string; thumbnailUrl: string }>();

  for (const media of medias) {
    const [originalPath, previewPath, thumbnailPath] = resolveAdminFileRelativePaths(media, storageRootName);
    const originalFileName = extractAdminStorageFileName(media.original_url) ?? media.storage_path;
    const previewFileName = extractAdminStorageFileName(media.preview_url) ?? originalFileName;
    const thumbnailFileName = extractAdminStorageFileName(media.thumbnail_url) ?? originalFileName;
    const previewUrl = buildAdminStorageFileUrl("previews", previewFileName);
    const thumbnailUrl = buildAdminStorageFileUrl("thumbnails", thumbnailFileName);
    map.set(originalPath, { previewUrl, thumbnailUrl });
    map.set(previewPath, { previewUrl, thumbnailUrl });
    map.set(thumbnailPath, { previewUrl, thumbnailUrl });
  }

  return map;
}

function getMediaFileRows(
  files: Awaited<ReturnType<typeof listAdminDataFiles>>,
  medias: MediaRecord[],
  storageRootName: string,
  referencesByMediaId: Map<string, AdminPhotoReferenceItem[]>,
  rawReferenceCounts: Map<string, number>
) {
  const fileMap = new Map(files.map((file) => [file.relativePath, file]));
  const consumed = new Set<string>();
  const rows: Array<Omit<AdminFileListItem, "lastModifiedAt"> & { lastModifiedAt: Date; searchText: string }> = [];

  for (const media of medias) {
    const paths = Array.from(new Set(resolveAdminFileRelativePaths(media, storageRootName)));
    const existingPaths = paths.filter((path) => fileMap.has(path));

    if (existingPaths.length === 0) {
      continue;
    }

    existingPaths.forEach((path) => consumed.add(path));

    const existingFiles = existingPaths.map((path) => fileMap.get(path)!);
    const references = referencesByMediaId.get(media.id) ?? [];
    const referenceCount = references.length;
    const representativePath = existingPaths.find((path) => path.includes("/originals/")) ?? existingPaths[0];
    const originalFileName = extractAdminStorageFileName(media.original_url) ?? media.original_name;
    const previewFileName = extractAdminStorageFileName(media.preview_url) ?? originalFileName;
    const thumbnailFileName = extractAdminStorageFileName(media.thumbnail_url) ?? originalFileName;
    const fileType = inferFileType(media.original_name);

    rows.push({
      fileName: media.original_name,
      relativePath: representativePath,
      fileType,
      previewUrl: buildAdminStorageFileUrl("previews", previewFileName),
      thumbnailUrl: buildAdminStorageFileUrl("thumbnails", thumbnailFileName),
      size: existingFiles.reduce((sum, file) => sum + file.size, 0),
      lastModifiedAt: existingFiles.reduce((latest, file) => (file.lastModifiedAt > latest ? file.lastModifiedAt : latest), existingFiles[0].lastModifiedAt),
      referenceCount,
      fileCount: existingFiles.length,
      references,
      canDelete: referenceCount === 0,
      searchText: [media.original_name, representativePath, ...existingPaths].join(" ").toLowerCase(),
    });
  }

  for (const file of files) {
    if (consumed.has(file.relativePath)) {
      continue;
    }

    const fileType = inferFileType(file.fileName);
    rows.push({
      fileName: file.fileName,
      relativePath: file.relativePath,
      fileType,
      previewUrl: null,
      thumbnailUrl: null,
      size: file.size,
      lastModifiedAt: file.lastModifiedAt,
      referenceCount: rawReferenceCounts.get(file.relativePath) ?? 0,
      fileCount: 1,
      references: [],
      canDelete: (rawReferenceCounts.get(file.relativePath) ?? 0) === 0,
      searchText: `${file.fileName} ${file.relativePath}`.toLowerCase(),
    });
  }

  return rows;
}

export async function listAdminFiles(
  prisma: PrismaClient,
  dataRoot: string,
  query: AdminFileListQuery,
  storageRootName = "storage"
) {
  const [files, medias] = await Promise.all([
    listAdminDataFiles(dataRoot),
    prisma.media.findMany({
      select: {
        id: true,
        storage_path: true,
        media_type: true,
        original_url: true,
        preview_url: true,
        thumbnail_url: true,
        original_name: true,
        uploaded_at: true,
      },
    }) as Promise<MediaRecord[]>,
  ]);
  const mediaIds = medias.map((media) => media.id);
  const referencesByMediaId = await loadAdminPhotoReferences(prisma, mediaIds);
  const rawReferenceCounts = buildAdminFileReferenceCountMap(medias, storageRootName);
  const previewUrls = buildAdminFilePreviewUrlMap(medias, storageRootName);
  const rows = getMediaFileRows(files, medias, storageRootName, referencesByMediaId, rawReferenceCounts);
  const keyword = query.keyword?.trim().toLowerCase() ?? "";
  const filtered = keyword
    ? rows.filter((row) => row.searchText.includes(keyword))
    : rows;

  const sorted = [...filtered].sort((a, b) => {
    const order = query.sortOrder === "asc" ? 1 : -1;
    const aCount = a.referenceCount;
    const bCount = b.referenceCount;

    let comparison = 0;
    switch (query.sortBy ?? "relativePath") {
      case "fileName":
        comparison = compareStrings(a.fileName, b.fileName);
        break;
      case "size":
        comparison = a.size - b.size;
        break;
      case "referenceCount":
        comparison = aCount - bCount;
        break;
      case "lastModifiedAt":
        comparison = a.lastModifiedAt.getTime() - b.lastModifiedAt.getTime();
        break;
      case "relativePath":
      default:
        comparison = compareStrings(a.relativePath, b.relativePath);
        break;
    }

    if (comparison !== 0) {
      return comparison * order;
    }

    return compareStrings(a.relativePath, b.relativePath);
  });

  const page = clamp(query.page);
  const pageSize = clamp(query.pageSize);
  const total = sorted.length;
  const start = (page - 1) * pageSize;
  const items = sorted.slice(start, start + pageSize).map((file) => {
    const previews = previewUrls.get(file.relativePath) ?? null;
    return {
      fileName: file.fileName,
      relativePath: file.relativePath,
      fileType: file.fileType,
      previewUrl: file.previewUrl ?? (file.fileType === "image" ? previews?.previewUrl ?? null : null),
      thumbnailUrl: file.thumbnailUrl ?? (file.fileType === "image" ? previews?.thumbnailUrl ?? null : null),
      size: file.size,
      lastModifiedAt: file.lastModifiedAt.toISOString(),
      referenceCount: file.referenceCount,
      fileCount: file.fileCount,
      references: file.references,
      canDelete: file.referenceCount === 0,
    } satisfies AdminFileListItem;
  });

  return {
    items,
    page,
    pageSize,
    total,
  };
}

export async function deleteAdminFile(
  prisma: PrismaClient,
  dataRoot: string,
  candidatePath: string,
  storageRootName = "storage"
) {
  const relativePath = resolveAdminDataRelativePath(dataRoot, candidatePath);
  const medias = (await prisma.media.findMany({
    select: {
      id: true,
      storage_path: true,
      media_type: true,
      original_url: true,
      preview_url: true,
      thumbnail_url: true,
      original_name: true,
      uploaded_at: true,
    },
  })) as MediaRecord[];

  const mediaIds = medias.map((media) => media.id);
  const [coverAlbums, albumPhotos, favorites, shares] = await Promise.all([
    prisma.album.findMany({
      where: { cover_photo_id: { in: mediaIds } },
      select: { cover_photo_id: true },
    }),
    prisma.albumPhoto.findMany({
      where: { photo_id: { in: mediaIds } },
      select: { photo_id: true },
    }),
    prisma.favorite.findMany({
      where: { photo_id: { in: mediaIds } },
      select: { photo_id: true },
    }),
    prisma.photoShare.findMany({
      where: { photo_id: { in: mediaIds } },
      select: { photo_id: true },
    }),
  ]);
  const mediaReferenceCounts = buildAdminPhotoReferenceCountMap({
    coverPhotoIds: coverAlbums.map((item) => item.cover_photo_id).filter((value): value is string => Boolean(value)),
    albumPhotoIds: albumPhotos.map((item) => item.photo_id),
    favoritePhotoIds: favorites.map((item) => item.photo_id),
    sharePhotoIds: shares.map((item) => item.photo_id),
  });
  const mediaPathMap = new Map(
    medias.flatMap((media) => Array.from(new Set(resolveAdminFileRelativePaths(media, storageRootName))).map((path) => [path, media] as const))
  );
  const matchedMedia = mediaPathMap.get(relativePath) ?? null;

  if (matchedMedia) {
    const referenceCount = mediaReferenceCounts.get(matchedMedia.id) ?? 0;
    if (referenceCount > 0) {
      throw new Error("文件仍被引用，无法删除");
    }

    const deleteTargets = Array.from(new Set(resolveAdminFileRelativePaths(matchedMedia, storageRootName)));
    for (const target of deleteTargets) {
      await deleteAdminDataFile(dataRoot, target);
    }
    return { relativePath };
  }

  const referenceCounts = buildAdminFileReferenceCountMap(medias, storageRootName);
  const referenceCount = referenceCounts.get(relativePath) ?? 0;
  if (referenceCount > 0) {
    throw new Error("文件仍被引用，无法删除");
  }

  await deleteAdminDataFile(dataRoot, relativePath);
  return { relativePath };
}
