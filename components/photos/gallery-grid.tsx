"use client";

import type { ReactNode } from "react";
import type { PhotoSize } from "@/components/photos/photo-gallery-size-control";

type GalleryGridProps = {
  photoSize: PhotoSize;
  waterfall?: boolean;
  className?: string;
  children: ReactNode;
};

const gridClasses: Record<PhotoSize, string> = {
  small: "grid gap-3 grid-cols-3 sm:grid-cols-4 xl:grid-cols-5",
  medium: "grid gap-4 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4",
  large: "grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
};

const waterfallClasses: Record<PhotoSize, string> = {
  small: "columns-3 gap-3 sm:columns-4 xl:columns-5",
  medium: "columns-2 gap-4 sm:columns-3 xl:columns-4",
  large: "columns-1 gap-5 sm:columns-2 xl:columns-3",
};

export function GalleryGrid({ photoSize, waterfall = false, className = "", children }: GalleryGridProps) {
  const layoutClass = waterfall ? waterfallClasses[photoSize] : gridClasses[photoSize];

  return <div className={`${layoutClass} ${className}`.trim()}>{children}</div>;
}
