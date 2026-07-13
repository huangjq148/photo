import { basename, extname } from "node:path";

type AdminPhotoReferenceSources = {
  coverPhotoIds: string[];
  albumPhotoIds: string[];
  favoritePhotoIds: string[];
  sharePhotoIds: string[];
};

type AdminMediaFileRecord = {
  storage_path: string;
  media_type: "image" | "video";
  original_url: string;
  preview_url: string;
  thumbnail_url: string;
};

function increment(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function normalizeLocalFileUrl(url: string, storageRootName = "storage") {
  if (!url.startsWith("/api/files/")) {
    return null;
  }

  const parts = url.split("/").filter(Boolean);
  const variant = parts[2];
  const fileName = parts.slice(3).join("/");

  if (!fileName) {
    return null;
  }

  if (variant !== "originals" && variant !== "previews" && variant !== "thumbnails") {
    return null;
  }

  return `${storageRootName}/${variant}/${fileName}`;
}

function getFileNames(media: AdminMediaFileRecord) {
  const baseName = basename(media.storage_path, extname(media.storage_path));

  if (media.media_type === "video") {
    return {
      original: media.storage_path,
      preview: `${baseName}_preview.jpg`,
      thumbnail: `${baseName}_thumb.jpg`,
    };
  }

  return {
    original: media.storage_path,
    preview: media.storage_path,
    thumbnail: media.storage_path,
  };
}

export function buildAdminPhotoReferenceCountMap({
  coverPhotoIds,
  albumPhotoIds,
  favoritePhotoIds,
  sharePhotoIds,
}: AdminPhotoReferenceSources) {
  const counts = new Map<string, number>();

  for (const id of coverPhotoIds) increment(counts, id);
  for (const id of albumPhotoIds) increment(counts, id);
  for (const id of favoritePhotoIds) increment(counts, id);
  for (const id of sharePhotoIds) increment(counts, id);

  return counts;
}

export function resolveAdminFileRelativePaths(media: AdminMediaFileRecord, storageRootName = "storage") {
  const names = getFileNames(media);

  return [
    `${storageRootName}/originals/${names.original}`,
    normalizeLocalFileUrl(media.original_url, storageRootName) ?? `${storageRootName}/originals/${names.original}`,
    normalizeLocalFileUrl(media.preview_url, storageRootName) ?? `${storageRootName}/previews/${names.preview}`,
    normalizeLocalFileUrl(media.thumbnail_url, storageRootName) ?? `${storageRootName}/thumbnails/${names.thumbnail}`,
  ];
}

export function buildAdminFileReferenceCountMap(medias: AdminMediaFileRecord[], storageRootName = "storage") {
  const counts = new Map<string, number>();

  for (const media of medias) {
    for (const relativePath of new Set(resolveAdminFileRelativePaths(media, storageRootName))) {
      increment(counts, relativePath);
    }
  }

  return counts;
}
