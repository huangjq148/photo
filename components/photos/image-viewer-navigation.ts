import type { ImageViewerNavigationItem } from "@/components/ui/image-viewer";
import { resolveDisplayName } from "@/lib/media/display-name";

export type MediaNavigationSource = {
  id: string;
  thumbnailUrl: string;
  previewUrl: string;
  originalUrl: string;
  displayName?: string | null;
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
  return items
    .filter((item) => isImageMedia(item) || isVideoMedia(item))
    .map((item) => {
      const mediaType: "image" | "video" = isVideoMedia(item) ? "video" : "image";
      const displayName = resolveDisplayName(item.displayName, item.originalName);
      const baseItem: Omit<ImageViewerNavigationItem, "previewSrc" | "videoSrc"> = {
        id: item.id,
        mediaType,
        src: item.thumbnailUrl,
        alt: displayName,
        title: displayName,
      };

      return mediaType === "video"
        ? {
            ...baseItem,
            videoSrc: item.originalUrl,
          }
        : {
            ...baseItem,
            previewSrc: item.mimeType === "image/gif" ? item.originalUrl : item.previewUrl,
          };
    });
}

export const buildImageViewerNavigationItems = buildMediaViewerNavigationItems;
