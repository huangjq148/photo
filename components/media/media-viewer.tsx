"use client";

import React from "react";
import ImageViewer from "@/components/ui/image-viewer";

type MediaViewerProps = {
  id: string;
  mediaType: string;
  previewUrl: string;
  posterUrl: string | null;
  playbackUrl: string | null;
  originalName: string;
  width: number;
  height: number;
  durationSeconds: number | null;
  processingStatus: string;
  interactiveImagePreview?: boolean;
};

export function MediaViewer({
  id,
  mediaType,
  previewUrl,
  posterUrl,
  playbackUrl,
  originalName,
  processingStatus,
  interactiveImagePreview = true,
}: MediaViewerProps) {
  if (mediaType === "image") {
    if (!interactiveImagePreview) {
      return (
        <img
          src={previewUrl}
          alt={originalName}
          draggable={false}
          className="max-h-[70vh] w-full object-contain"
        />
      );
    }

    return (
      <ImageViewer
        src={previewUrl}
        alt={originalName}
        previewSrc={previewUrl}
        imgClassName="max-h-[70vh] w-full object-contain"
        className="group/img block w-full"
        title={originalName}
      />
    );
  }

  // Video
  if (processingStatus === "normal" && playbackUrl) {
    return (
      <div className="relative bg-black">
        <video
          controls
          playsInline
          preload="metadata"
          poster={posterUrl ?? undefined}
          className="max-h-[70vh] w-full"
        >
          <source src={playbackUrl} type="video/mp4" />
          您的浏览器不支持视频播放。
        </video>
      </div>
    );
  }

  if (processingStatus === "pending" || processingStatus === "processing") {
    return (
      <div className="flex aspect-video w-full items-center justify-center bg-[#0b0b0b]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-12 w-12 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          <p className="text-sm text-[var(--muted)]">视频正在处理，暂不可播放</p>
        </div>
      </div>
    );
  }

  // Failed — show download link for authenticated users
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 bg-[#0b0b0b]">
      <p className="text-sm text-[var(--muted)]">视频处理失败，暂不可在线播放</p>
      <a
        href={`/api/media/${id}/download`}
        className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-sm font-bold text-[var(--text)] transition hover:bg-white/[0.08]"
      >
        下载原文件
      </a>
    </div>
  );
}
