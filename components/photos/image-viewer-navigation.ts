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

export function buildImageViewerNavigationItems(items: MediaNavigationSource[]): ImageViewerNavigationItem[] {
  return items.filter(isImageMedia).map((item) => ({
    id: item.id,
    src: item.thumbnailUrl,
    previewSrc: item.mimeType === "image/gif" ? item.originalUrl : item.previewUrl,
    alt: item.originalName,
    title: item.originalName,
  }));
}
