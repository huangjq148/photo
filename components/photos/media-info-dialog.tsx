"use client";

import React from "react";
import { X } from "lucide-react";
import type { PhotoGalleryCardItem } from "@/components/photos/photo-gallery-card";
import { resolveDisplayName, normalizeDisplayName } from "@/lib/media/display-name";

type MediaInfoDialogProps = {
  open: boolean;
  photo: PhotoGalleryCardItem;
  onClose: () => void;
  albumCount?: number;
};

function formatFileSize(bytes: number): string {
  if (bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let idx = 0;
  let value = bytes;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx++;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[idx]}`;
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = d.getHours().toString().padStart(2, "0");
  const minute = d.getMinutes().toString().padStart(2, "0");
  return `${y}年${month}月${day}日 ${hour}:${minute}`;
}

function formatMimeType(mimeType: string): string {
  const parts = mimeType.split("/");
  if (parts.length !== 2) return mimeType;
  const [, subtype] = parts;
  return subtype!.toUpperCase();
}

export function MediaInfoDialog({ open, photo, onClose, albumCount }: MediaInfoDialogProps) {
  if (!open) return null;

  const isVideo = photo.mediaType === "video" || photo.mimeType.startsWith("video/");
  const displayName = normalizeDisplayName(photo.displayName) || "未命名";
  const originalName = photo.originalName;

  const infoRows: { label: string; value: string }[] = [
    { label: "显示名称", value: displayName },
    { label: "原始文件名", value: originalName },
    { label: "尺寸", value: `${photo.width} × ${photo.height}` },
    { label: "格式", value: formatMimeType(photo.mimeType) },
    { label: "文件大小", value: formatFileSize(photo.size) },
  ];

  if (isVideo) {
    infoRows.push({ label: "时长", value: formatDuration(photo.duration ?? undefined) });
  }

  infoRows.push(
    { label: "拍摄时间", value: photo.takenAt ? formatDateTime(photo.takenAt) : "—" },
    { label: "上传时间", value: formatDateTime(photo.uploadedAt) },
  );

  if (albumCount !== undefined && albumCount > 0) {
    infoRows.push({ label: "所在相册数", value: `${albumCount}` });
  }

  if (photo.locationHidden) {
    infoRows.push({ label: "位置", value: "已隐藏" });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`媒体信息：${displayName}`}
        tabIndex={-1}
        className="max-h-[85dvh] w-full max-w-sm overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
          <h2 className="text-base font-bold text-[var(--text)]">媒体信息</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-white/[0.08] hover:text-[var(--text)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Thumbnail */}
        <div className="border-b border-[var(--border)] bg-black/30">
          <img
            src={photo.thumbnailUrl}
            alt={displayName}
            className="mx-auto max-h-48 w-full object-contain"
          />
        </div>

        {/* Info rows */}
        <div className="max-h-[50dvh] overflow-y-auto px-5 py-4">
          <dl className="space-y-3">
            {infoRows.map((row) => (
              <div key={row.label} className="grid grid-cols-[100px_1fr] gap-2">
                <dt className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                  {row.label}
                </dt>
                <dd className="text-sm text-[var(--text)] break-all">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
