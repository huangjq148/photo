"use client";

import React, { useState } from "react";
import { Bookmark, Check, Ellipsis, Heart, Info, Play, Share2, Trash2 } from "lucide-react";
import ImageViewer from "@/components/ui/image-viewer";

export type PhotoGalleryCardItem = {
  id: string;
  originalName: string;
  thumbnailUrl: string;
  previewUrl: string;
  mediaType?: string;
  mimeType: string;
  width: number;
  height: number;
  takenAt: string | null;
  uploadedAt: string;
};

type PhotoGalleryCardProps = {
  photo: PhotoGalleryCardItem;
  selected: boolean;
  waterfall: boolean;
  showTakenAt: boolean;
  onSelect: () => void;
  onFavorite: () => void;
  onDelete: () => void;
  onShare: () => void;
  onSetCover: () => void;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PhotoGalleryCard({
  photo,
  selected,
  waterfall,
  showTakenAt,
  onSelect,
  onFavorite,
  onDelete,
  onShare,
  onSetCover,
}: PhotoGalleryCardProps) {
  const [showInfo, setShowInfo] = useState(false);
  const isVideo = photo.mediaType === "video";

  return (
    <article
      className={`group relative mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] transition hover:border-white/30 ${
        waterfall ? "break-inside-avoid" : ""
      }`}
    >
      <div className="overflow-hidden rounded-t-xl relative">
        <ImageViewer
          src={photo.thumbnailUrl}
          alt={photo.originalName}
          previewSrc={photo.previewUrl}
          imgClassName="aspect-[4/3] w-full object-cover transition duration-300 group-hover/img:scale-[1.02]"
          className="group/img block w-full"
        />

        {/* Media type badge */}
        {photo.mediaType && (
          <div className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-xs font-medium text-white/80">
            {isVideo ? "视频" : "照片"}
          </div>
        )}

        {/* Video play icon */}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="rounded-full bg-black/60 p-2">
              <Play aria-hidden="true" size={20} className="text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Photo info overlay */}
      {showInfo && (
        <div
          className="absolute inset-0 z-20 flex flex-col justify-end bg-gradient-to-t from-black/95 via-black/70 to-black/30 p-4"
          onClick={() => setShowInfo(false)}
        >
          <div className="space-y-2 text-white">
            <p className="text-sm font-bold">{photo.originalName}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-white/70">
              {isVideo && <><span>类型</span><span>视频</span></>}
              <span>尺寸</span>
              <span>
                {photo.width} × {photo.height}
              </span>
              <span>格式</span>
              <span>{photo.mimeType}</span>
              <span>上传时间</span>
              <span>{formatDateTime(photo.uploadedAt)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Taken time badge */}
      {showTakenAt && (photo.takenAt || photo.uploadedAt) && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-md bg-black/55 px-2.5 py-1 backdrop-blur-sm">
          <p className="text-xs font-medium text-white/80">
            {formatDateTime(photo.takenAt || photo.uploadedAt)}
          </p>
        </div>
      )}

      <div className="absolute left-3 top-3 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          type="button"
          onClick={onSelect}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur transition ${
            selected
              ? "border-[var(--accent)] bg-[var(--accent)] text-black"
              : "border-white/35 bg-black/65 text-[var(--text)]"
          }`}
          aria-pressed={selected}
          aria-label={`选择 ${photo.originalName}`}
        >
          <Check
            aria-hidden="true"
            size={18}
            className={selected ? "opacity-100" : "opacity-45"}
          />
        </button>
      </div>

      <div className="absolute right-3 top-3 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
        <div className="group/menu relative">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-black/70 text-white backdrop-blur transition hover:bg-black"
            aria-label="更多操作"
          >
            <Ellipsis aria-hidden="true" size={20} />
          </button>
          <div className="absolute right-0 top-11 hidden min-w-32 overflow-hidden rounded-xl border border-[var(--border)] bg-black/90 p-1 shadow-2xl backdrop-blur group-hover/menu:block group-focus-within/menu:block">
            <button
              type="button"
              onClick={onFavorite}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-white/[0.08]"
            >
              <Heart aria-hidden="true" size={15} />
              收藏
            </button>
            <button
              type="button"
              onClick={onShare}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-white/[0.08]"
            >
              <Share2 aria-hidden="true" size={15} />
              分享
            </button>
            <button
              type="button"
              onClick={onSetCover}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--film)] hover:bg-white/[0.08]"
            >
              <Bookmark aria-hidden="true" size={15} />
              设为封面
            </button>
            <button
              type="button"
              onClick={() => setShowInfo(true)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-white/[0.08]"
            >
              <Info aria-hidden="true" size={15} />
              {isVideo ? "媒体信息" : "照片信息"}
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--danger)] hover:bg-white/[0.08]"
            >
              <Trash2 aria-hidden="true" size={15} />
              删除
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
