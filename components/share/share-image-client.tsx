"use client";

import ImageViewer from "@/components/ui/image-viewer";

type ShareImageClientProps = {
  thumbnailUrl: string;
  previewUrl: string;
  originalName: string;
};

export function ShareImageClient({ thumbnailUrl, previewUrl, originalName }: ShareImageClientProps) {
  return (
    <ImageViewer
      src={thumbnailUrl}
      alt={originalName}
      previewSrc={previewUrl}
      imgClassName="h-[68vh] min-h-80 w-full object-cover"
      className="group/img block w-full"
      title={originalName}
    />
  );
}
