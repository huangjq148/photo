"use client";

import React from "react";
import ImageViewer, { type ImageViewerNavigationItem } from "@/components/ui/image-viewer";
import type { MemoryPhotoItem } from "@/lib/memory/dashboard";
import { resolveDisplayName } from "@/lib/media/display-name";

export function MemoryImageViewer({
  photo,
  navigationItems,
  className,
  imgClassName,
}: {
  photo: MemoryPhotoItem;
  navigationItems: ImageViewerNavigationItem[];
  className: string;
  imgClassName: string;
}) {
  const title = resolveDisplayName(photo.displayName, photo.originalName);
  const navigationItem = navigationItems.find((item) => item.id === photo.id);
  const mediaType = navigationItem?.mediaType ?? "image";

  return (
    <ImageViewer
      src={photo.thumbnailUrl}
      alt={title}
      title={title}
      mediaType={mediaType}
      previewSrc={navigationItem?.previewSrc}
      videoSrc={navigationItem?.videoSrc}
      items={navigationItems}
      initialItemId={photo.id}
      className={className}
      imgClassName={imgClassName}
    />
  );
}
