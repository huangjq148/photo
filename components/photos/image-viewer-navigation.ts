import type { ImageViewerNavigationItem } from "@/components/ui/image-viewer";

export type MediaNavigationSource = {
  id: string;
  thumbnailUrl: string;
  previewUrl: string;
  originalUrl: string;
  originalName: string;
  mimeType: string;
  mediaType: string;
};

export function isImageMedia(item: Pick<MediaNavigationSource, "mediaType" | "mimeType">): boolean {
  return item.mediaType === "image" && !item.mimeType.startsWith("video/");
}

export function isVideoMedia(item: Pick<MediaNavigationSource, "mediaType" | "mimeType">): boolean {
  return item.mediaType === "video" || item.mimeType.startsWith("video/");
}

export function buildMediaViewerNavigationItems(items: MediaNavigationSource[]): ImageViewerNavigationItem[] {
  return items.filter((item) => isImageMedia(item) || isVideoMedia(item)).map((item) => ({
    id: item.id,
    mediaType: isVideoMedia(item) ? "video" : "image",
    src: item.thumbnailUrl,
    previewSrc: isImageMedia(item)
      ? (item.mimeType === "image/gif" ? item.originalUrl : item.previewUrl)
      : undefined,
    videoSrc: isVideoMedia(item) ? item.originalUrl : undefined,
    alt: item.originalName,
    title: item.originalName,
  }));
}

export const buildImageViewerNavigationItems = buildMediaViewerNavigationItems;
