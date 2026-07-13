function encodePathSegments(path: string) {
  return path.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}

export function extractAdminStorageFileName(url: string) {
  const match = url.match(/^\/api\/files\/(?:originals|previews|thumbnails)\/(.+)$/);
  return match?.[1] ?? null;
}

export function buildAdminStorageFileUrl(variant: "originals" | "previews" | "thumbnails", fileName: string) {
  return `/api/admin/storage/${variant}/${encodePathSegments(fileName)}`;
}
