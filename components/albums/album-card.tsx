"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal, X } from "lucide-react";
import type { Route } from "next";

type AlbumCardProps = {
  albumId: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  lastPhotoUrl: string | null;
  isDefault: boolean;
  isImmutable: boolean;
  photoCount: number;
  memberCount: number;
  role: string;
  updatedAt: string;
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

export function AlbumCard({
  albumId,
  name,
  description,
  coverUrl,
  lastPhotoUrl,
  isDefault,
  photoCount,
  memberCount,
  role,
  updatedAt,
}: AlbumCardProps) {
  const [showInfo, setShowInfo] = useState(false);

  const displayCover = coverUrl || lastPhotoUrl;

  return (
    <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl noir-glass-panel transition duration-200 hover:-translate-y-1 hover:border-[var(--border-strong)]">
      {/* Cover layer */}
      {displayCover ? (
        <img
          src={displayCover}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover transition duration-300"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[rgba(17,17,20,0.9)] via-[rgba(10,10,12,0.86)] to-zinc-800/40">
          <span className="text-6xl opacity-15">📷</span>
        </div>
      )}

      {/* Gradient overlay on cover */}
      {!showInfo && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent transition-opacity duration-300" />
      )}

      {/* Dark overlay when info is shown */}
      {showInfo && (
        <div className="absolute inset-0 z-[5] bg-black/54 backdrop-blur-md transition duration-300" />
      )}

      {/* Info layer */}
      <div
        className={`absolute inset-0 z-10 flex flex-col justify-between p-5 transition duration-300 ${
          showInfo ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-black text-[var(--text)]">{name}</h2>
            {description ? (
              <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">{description}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-auto space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl noir-glass-chip px-4 py-3">
              <p className="text-xs text-[var(--muted)]">照片</p>
              <p className="mt-1 text-lg font-black text-[var(--text)]">{photoCount}</p>
            </div>
            <div className="rounded-xl noir-glass-chip px-4 py-3">
              <p className="text-xs text-[var(--muted)]">成员</p>
              <p className="mt-1 text-lg font-black text-[var(--text)]">{memberCount}</p>
            </div>
            <div className="rounded-xl noir-glass-chip px-4 py-3">
              <p className="text-xs text-[var(--muted)]">更新</p>
              <p className="mt-1 text-lg font-black text-[var(--text)]">{formatTime(updatedAt)}</p>
            </div>
          </div>

          <Link
            href={`/albums/${albumId}` as Route}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] py-2.5 text-sm font-bold text-black transition hover:bg-white"
          >
            进入相册
          </Link>
        </div>
      </div>

      {/* Top-right "..." / X toggle button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowInfo((prev) => !prev);
        }}
        className={`absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full transition ${
          showInfo
            ? "bg-[var(--accent)] text-black"
            : "noir-glass-chip text-white/90 hover:text-white"
        }`}
        aria-label={showInfo ? "关闭相册信息" : "查看相册信息"}
      >
        {showInfo ? <X size={18} /> : <MoreHorizontal size={20} />}
      </button>

      {/* Cover mode: name + badges at bottom */}
      {!showInfo && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 flex items-end justify-between p-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-xl font-black leading-tight text-white">{name}</h2>
              <span className="shrink-0 text-xs font-medium text-white/60">{photoCount} 张</span>
            </div>
          </div>
          <div className="ml-3 flex shrink-0 gap-1.5">
            {isDefault ? (
              <span className="rounded-md noir-glass-chip px-2 py-0.5 text-[10px] font-medium text-[var(--film)]">
                全部
              </span>
            ) : null}
            <span className="rounded-md noir-glass-chip px-2 py-0.5 text-[10px] font-medium text-white/70">
              {role === "owner" ? "拥有者" : "成员"}
            </span>
          </div>
        </div>
      )}

      {/* Clickable area to navigate */}
      <Link
        href={`/albums/${albumId}` as Route}
        className="absolute inset-0 z-0"
        aria-label={name}
      >
        <span className="sr-only">进入 {name}</span>
      </Link>
    </div>
  );
}
