"use client";

import React, { useEffect, useState } from "react";
import { Bookmark, Check, Ellipsis, Heart, Info, Share2, Trash2 } from "lucide-react";
import ImageViewer, { type ImageViewerNavigationItem } from "@/components/ui/image-viewer";

export type PhotoGalleryCardItem = {
  id: string;
  originalName: string;
  thumbnailUrl: string;
  previewUrl: string;
  originalUrl: string;
  mimeType: string;
  mediaType: string;
  duration: number | null;
  width: number;
  height: number;
  takenAt: string | null;
  uploadedAt: string;
  isFavorited: boolean;
};

type PhotoGalleryCardProps = {
  photo: PhotoGalleryCardItem;
  selected: boolean;
  waterfall: boolean;
  showTakenAt: boolean;
  /** 用于全屏预览时左右切换的同组照片 */
  navigableItems?: ImageViewerNavigationItem[];
  onSelect: () => void;
  onFavorite: () => Promise<boolean> | boolean;
  onDelete: () => void;
  onShare: () => void;
  onSetCover: () => void;
};

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

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
  navigableItems,
  onSelect,
  onFavorite,
  onDelete,
  onShare,
  onSetCover,
}: PhotoGalleryCardProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [favoriteState, setFavoriteState] = useState(photo.isFavorited);
  const isVideo = photo.mediaType === "video" || photo.mimeType.startsWith("video/");
  const isGif = photo.mimeType === "image/gif";
  const favoriteLabel = favoriteState ? "取消收藏" : "收藏";

  useEffect(() => {
    setFavoriteState(photo.isFavorited);
  }, [photo.isFavorited]);

  return (
    <article
      className={`group relative mb-4 rounded-2xl noir-glass-panel transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] ${
        waterfall ? "break-inside-avoid" : ""
      }`}
    >
      <div className="overflow-hidden rounded-t-xl">
        <ImageViewer
          src={photo.thumbnailUrl}
          alt={photo.originalName}
          {...(isVideo
            ? { videoSrc: photo.originalUrl, mediaType: "video" as const }
            : { previewSrc: isGif ? photo.originalUrl : photo.previewUrl })}
          items={navigableItems}
          initialItemId={photo.id}
          imgClassName="aspect-[4/3] w-full object-cover transition duration-300 group-hover/img:scale-[1.02]"
          className="group/img block w-full"
        />
      </div>

      {/* Media info overlay */}
      {showInfo && (
        <div
          className="absolute inset-0 z-20 flex flex-col justify-end bg-gradient-to-t from-black/92 via-black/68 to-black/26 p-4"
          onClick={() => setShowInfo(false)}
        >
          <div className="space-y-2 text-white">
            <p className="text-sm font-bold">{photo.originalName}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-white/70">
              <span>尺寸</span>
              <span>
                {photo.width} × {photo.height}
              </span>
              <span>格式</span>
              <span>{photo.mimeType}</span>
              {isVideo && photo.duration != null && photo.duration > 0 ? (
                <>
                  <span>时长</span>
                  <span>{formatDuration(photo.duration)}</span>
                </>
              ) : null}
              <span>上传时间</span>
              <span>{formatDateTime(photo.uploadedAt)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Taken time badge */}
      {showTakenAt && (photo.takenAt || photo.uploadedAt) && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-md noir-glass-chip px-2.5 py-1">
          <p className="text-xs font-medium text-white/80">
            {formatDateTime(photo.takenAt || photo.uploadedAt)}
          </p>
        </div>
      )}

      {photo.isFavorited && (
        <div className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-md bg-blue-500/90 px-2.5 py-1 text-xs font-medium text-white shadow-lg backdrop-blur-sm">
          已收藏
        </div>
      )}

      <div className="absolute left-3 top-3 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          type="button"
          onClick={onSelect}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur transition ${
            selected
              ? "border-blue-500 bg-blue-500 text-white"
              : "noir-glass-chip text-[var(--text)]"
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-full noir-glass-chip text-white transition hover:border-[var(--border-strong)]"
            aria-label="更多操作"
          >
            <Ellipsis aria-hidden="true" size={20} />
          </button>
          <div className="absolute right-0 top-11 hidden min-w-32 overflow-hidden rounded-xl noir-glass-panel-strong p-1 shadow-2xl group-hover/menu:block group-focus-within/menu:block">
            <button
              type="button"
              onClick={async () => {
                const nextFavoriteState = !favoriteState;
                setFavoriteState(nextFavoriteState);

                const ok = await onFavorite();
                if (!ok) {
                  setFavoriteState(!nextFavoriteState);
                }
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-white/[0.08]"
            >
              <Heart aria-hidden="true" size={15} />
              {favoriteLabel}
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
              媒体信息
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
