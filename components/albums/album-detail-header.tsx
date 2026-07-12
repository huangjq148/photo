"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Settings, Share2, Upload } from "lucide-react";

type HeaderAlbum = {
  name: string;
  description: string | null;
  isDefault: boolean;
  photoCount: number;
  memberCount: number;
  role: string;
};

type AlbumDetailHeaderProps = {
  album: HeaderAlbum;
  onAddPhotos: () => void;
  onManage: () => void;
  onShare: () => void;
};

export function AlbumDetailHeader({ album, onAddPhotos, onManage, onShare }: AlbumDetailHeaderProps) {
  return (
    <section className="border-b border-[var(--border)] pb-4 pt-1 sm:pb-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <Link
            href="/albums"
            className="inline-flex min-h-9 items-center gap-2 rounded-lg px-1 text-sm font-bold text-[var(--muted)] transition hover:text-[var(--text)]"
          >
            <ArrowLeft aria-hidden="true" size={18} />
            返回相册
          </Link>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="max-w-full text-3xl font-black leading-tight text-[var(--text)] sm:text-5xl">
              {album.name}
            </h1>
            {album.isDefault ? (
              <span className="rounded-md border border-[var(--film)] px-3 py-1 text-xs text-[var(--film)]">
                全部照片
              </span>
            ) : null}
            <span className="rounded-md border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)]">
              {album.role === "owner" ? "拥有者" : "成员"}
            </span>
            <span className="text-sm text-[var(--muted-strong)]">{album.photoCount} 张照片</span>
            <span className="text-sm text-[var(--muted-strong)]">{album.memberCount} 位成员</span>
          </div>

          {album.description ? (
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
              {album.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
          <button
            type="button"
            onClick={onAddPhotos}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-5 text-sm font-bold text-black transition hover:bg-white"
          >
            <Upload aria-hidden="true" size={17} />
            添加照片
          </button>
          <button
            type="button"
            onClick={onManage}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--border-strong)] px-5 text-sm font-bold text-[var(--text)] transition hover:border-white/35 hover:bg-white/[0.08]"
          >
            <Settings aria-hidden="true" size={17} />
            管理
          </button>
          <button
            type="button"
            onClick={onShare}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--border-strong)] px-5 text-sm font-bold text-[var(--text)] transition hover:border-white/35 hover:bg-white/[0.08]"
          >
            <Share2 aria-hidden="true" size={17} />
            公开分享
          </button>
        </div>
      </div>
    </section>
  );
}
