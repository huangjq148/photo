"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Ellipsis, FolderPlus, Info, Settings, Share2, Upload } from "lucide-react";
import { Menu } from "@/components/ui/menu";

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
  onUploadNew: () => void;
  onAddFromAllPhotos: () => void;
  onManage: () => void;
  onShare: () => void;
};

export function AlbumDetailHeader({
  album,
  onUploadNew,
  onAddFromAllPhotos,
  onManage,
  onShare,
}: AlbumDetailHeaderProps) {
  return (
    <section className="album-detail-hero">
      <div className="album-hero-top">
        <Link href="/albums" className="album-back-link">
          <ArrowLeft aria-hidden="true" size={17} />
          返回相册
        </Link>

        <div className="album-kicker" aria-hidden="true">
          <span>01</span>
          <p>PRIVATE ALBUM</p>
        </div>
      </div>

      <div className="album-hero-grid">
        <div className="min-w-0">
          <div className="album-title-row">
            <h1 className="max-w-full text-3xl font-black leading-tight text-[var(--text)] sm:text-5xl">
              {album.name}
            </h1>
            <div className="album-title-badges">
              {album.isDefault ? (
                <span className="album-badge album-badge-accent">
                默认相册
              </span>
              ) : null}
              <span className="album-badge">
                {album.role === "owner" ? "拥有者" : "成员"}
              </span>
              <span className="album-meta-copy">
                {album.photoCount} 张照片 · {album.memberCount} 位成员
              </span>
              <Menu
                label="相册信息"
                title="相册信息"
                triggerVariant="plain"
                triggerContent={<Info aria-hidden="true" size={16} />}
                menuClassName="min-w-64"
                className="sm:hidden"
              >
                <div className="space-y-3 p-2">
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                      信息
                    </p>
                    <p className="text-sm text-[var(--text)]">{album.photoCount} 张照片</p>
                    <p className="text-sm text-[var(--text)]">{album.memberCount} 位成员</p>
                  </div>
                  {album.description ? (
                    <div className="space-y-1">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                        简介
                      </p>
                      <p className="text-sm leading-6 text-[var(--muted)]">{album.description}</p>
                    </div>
                  ) : null}
                </div>
              </Menu>
            </div>
          </div>
          {album.description ? <p className="hidden">{album.description}</p> : null}
        </div>

        <div className="album-mobile-actions sm:hidden">
          <button
            type="button"
            onClick={onUploadNew}
            className="album-primary-action"
          >
            <Upload aria-hidden="true" size={17} />
            上传照片
          </button>
          <button
            type="button"
            aria-label="从全部照片添加"
            title="从全部照片添加"
            onClick={onAddFromAllPhotos}
            className="album-icon-action h-11 w-11"
          >
            <FolderPlus aria-hidden="true" size={18} />
          </button>
          <Menu
            label="更多相册操作"
            title="更多相册操作"
            triggerContent={<Ellipsis aria-hidden="true" size={20} />}
            items={[
              {
                key: "manage",
                label: "管理相册",
                icon: <Settings aria-hidden="true" size={17} />,
                onSelect: onManage,
              },
              {
                key: "share",
                label: "公开分享",
                icon: <Share2 aria-hidden="true" size={17} />,
                onSelect: onShare,
              },
            ]}
            triggerClassName="album-more-action shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--film)]/70"
          />
        </div>

        <div className="album-desktop-actions hidden sm:flex">
          <button
            type="button"
            onClick={onUploadNew}
            className="album-primary-action"
          >
            <Upload aria-hidden="true" size={17} />
            上传新照片
          </button>
          <button
            type="button"
            onClick={onAddFromAllPhotos}
            className="album-secondary-action"
          >
            <FolderPlus aria-hidden="true" size={17} />
            从全部照片添加
          </button>
          <button
            type="button"
            onClick={onManage}
            className="album-secondary-action"
          >
            <Settings aria-hidden="true" size={17} />
            管理
          </button>
          <button
            type="button"
            onClick={onShare}
            className="album-secondary-action"
          >
            <Share2 aria-hidden="true" size={17} />
            公开分享
          </button>
        </div>
      </div>
    </section>
  );
}
