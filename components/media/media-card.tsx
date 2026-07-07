"use client";

import React, { useState } from "react";
import { Bookmark, Check, Ellipsis, Heart, Info, Play, Share2, Trash2 } from "lucide-react";
import ImageViewer from "@/components/ui/image-viewer";

export type MediaCardItem = {
  id: string;
  mediaType: string;
  originalName: string;
  thumbnailUrl: string;
  posterUrl: string | null;
  previewUrl: string;
  playbackUrl: string | null;
  mimeType: string;
  width: number;
  height: number;
  durationSeconds: number | null;
  processingStatus: string;
  takenAt: string | null;
  uploadedAt: string;
};

export type MediaCardActions = {
  selected?: boolean;
  onSelect?: () => void;
  onFavorite?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  onSetCover?: () => void;
  onInfo?: () => void;
};

type MediaCardProps = {
  media: MediaCardItem;
  actions?: MediaCardActions;
};

function formatDuration(seconds: number | null): string | null {
  if (seconds === null || seconds === undefined) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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

function getProcessingLabel(status: string): string | null {
  switch (status) {
    case "pending":
    case "processing":
      return "处理中";
    case "failed":
      return "暂不可播放";
    default:
      return null;
  }
}

export function MediaCard({ media, actions }: MediaCardProps) {
  const [showInfo, setShowInfo] = useState(false);
  const isVideo = media.mediaType === "video";
  const imgSrc = isVideo ? (media.posterUrl || media.thumbnailUrl || "") : (media.thumbnailUrl || media.previewUrl || "");
  const duration = formatDuration(media.durationSeconds);
  const processingLabel = getProcessingLabel(media.processingStatus);
  const selected = actions?.selected ?? false;
  const hasActions = actions && (actions.onFavorite || actions.onShare || actions.onDelete || actions.onSetCover);

  return (
    <article className="group relative break-inside-avoid mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] transition hover:border-white/30">
      <div className="overflow-hidden rounded-t-xl relative">
        {imgSrc ? (
          <ImageViewer
            src={imgSrc}
            alt={media.originalName}
            previewSrc={media.previewUrl || imgSrc}
            imgClassName="aspect-[4/3] w-full object-cover transition duration-300 group-hover/img:scale-[1.02]"
            className="group/img block w-full"
          />
        ) : (
          <div className="aspect-[4/3] w-full flex items-center justify-center bg-[#0b0b0b] text-[var(--muted)] text-sm">
            暂无预览
          </div>
        )}

        {/* Processing overlay */}
        {processingLabel && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="rounded-lg bg-black/80 px-3 py-1.5 text-xs font-medium text-[var(--film)]">
              {processingLabel}
            </div>
          </div>
        )}

        {/* Video play icon */}
        {isVideo && !processingLabel && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="rounded-full bg-black/60 p-3">
              <Play aria-hidden="true" size={24} className="text-white" />
            </div>
          </div>
        )}

        {/* Duration badge */}
        {isVideo && duration && (
          <div className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
            {duration}
          </div>
        )}
      </div>

      {/* Info overlay */}
      {showInfo && (
        <div
          className="absolute inset-0 z-20 flex flex-col justify-end bg-gradient-to-t from-black/95 via-black/70 to-black/30 p-4"
          onClick={() => setShowInfo(false)}
        >
          <div className="space-y-2 text-white">
            <p className="text-sm font-bold">{media.originalName}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-white/70">
              {media.width > 0 && media.height > 0 && (
                <>
                  <span>尺寸</span>
                  <span>{media.width} × {media.height}</span>
                </>
              )}
              <span>格式</span>
              <span>{media.mimeType}</span>
              {isVideo && duration && (
                <>
                  <span>时长</span>
                  <span>{duration}</span>
                </>
              )}
              <span>上传时间</span>
              <span>{formatDateTime(media.uploadedAt)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Selection checkbox */}
      {actions?.onSelect && (
        <div className="absolute left-3 top-3 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            onClick={actions.onSelect}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur transition ${
              selected
                ? "border-[var(--accent)] bg-[var(--accent)] text-black"
                : "border-white/35 bg-black/65 text-[var(--text)]"
            }`}
            aria-pressed={selected}
            aria-label={`选择 ${media.originalName}`}
          >
            <Check aria-hidden="true" size={18} className={selected ? "opacity-100" : "opacity-45"} />
          </button>
        </div>
      )}

      {/* Actions menu */}
      {hasActions && (
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
              {actions?.onFavorite && (
                <button
                  type="button"
                  onClick={actions.onFavorite}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-white/[0.08]"
                >
                  <Heart aria-hidden="true" size={15} />
                  收藏
                </button>
              )}
              {actions?.onShare && (
                <button
                  type="button"
                  onClick={actions.onShare}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-white/[0.08]"
                >
                  <Share2 aria-hidden="true" size={15} />
                  分享
                </button>
              )}
              {actions?.onSetCover && (
                <button
                  type="button"
                  onClick={actions.onSetCover}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--film)] hover:bg-white/[0.08]"
                >
                  <Bookmark aria-hidden="true" size={15} />
                  设为封面
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowInfo(true)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-white/[0.08]"
              >
                <Info aria-hidden="true" size={15} />
                媒体信息
              </button>
              {actions?.onDelete && (
                <button
                  type="button"
                  onClick={actions.onDelete}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--danger)] hover:bg-white/[0.08]"
                >
                  <Trash2 aria-hidden="true" size={15} />
                  删除
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
