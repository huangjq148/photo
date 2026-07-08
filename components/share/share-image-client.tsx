"use client";

import ImageViewer from "@/components/ui/image-viewer";
import VideoViewer from "@/components/ui/video-viewer";

type ShareImageClientProps = {
  thumbnailUrl: string;
  previewUrl: string;
  originalUrl: string;
  originalName: string;
  mimeType: string;
  mediaType: string;
  duration: number | null;
};

export function ShareImageClient({ thumbnailUrl, previewUrl, originalUrl, originalName, mimeType, mediaType, duration }: ShareImageClientProps) {
  const isVideo = mediaType === "video" || mimeType.startsWith("video/");

  if (isVideo) {
    return (
      <VideoViewer
        src={thumbnailUrl}
        alt={originalName}
        videoSrc={originalUrl}
        duration={duration ?? undefined}
        imgClassName="h-[68vh] min-h-80 w-full object-cover"
        className="group/img block w-full"
        title={originalName}
      />
    );
  }

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
