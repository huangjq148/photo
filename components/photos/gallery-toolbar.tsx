"use client";

import React from "react";
import { Filter, Search, SlidersHorizontal, Layers3, X } from "lucide-react";
import { PhotoGallerySizeControl, type PhotoSize } from "@/components/photos/photo-gallery-size-control";

type GalleryToolbarProps = {
  query: string;
  searchValue: string;
  filteredCount: number;
  totalCount: number;
  activeFilterCount: number;
  hasActiveSelection: boolean;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onToggleFilters: () => void;
  onChangeSort: () => void;
  onChangeGroup: () => void;
  onClearFilters: () => void;
  photoSize?: PhotoSize;
  onPhotoSizeChange?: (value: PhotoSize) => void;
};

export function GalleryToolbar({
  query,
  searchValue,
  filteredCount,
  totalCount,
  activeFilterCount,
  hasActiveSelection,
  onSearchChange,
  onClearSearch,
  onToggleFilters,
  onChangeSort,
  onChangeGroup,
  onClearFilters,
  photoSize,
  onPhotoSizeChange,
}: GalleryToolbarProps) {
  return (
    <section className="noir-glass-panel rounded-[2rem] p-4 sm:p-5">
      <div className="grid gap-3">
        <label className="block">
          <span className="sr-only">搜索照片和视频</span>
          <div className="flex items-center gap-2 rounded-2xl noir-glass-chip px-4 py-3">
            <Search aria-hidden="true" size={16} className="text-[var(--muted)]" />
            <input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="搜索名称或原始文件名"
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
            />
            {searchValue ? (
              <button
                type="button"
                onClick={onClearSearch}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-white/[0.08] hover:text-[var(--text)]"
                aria-label="清空搜索"
              >
                <X aria-hidden="true" size={14} />
              </button>
            ) : null}
          </div>
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleFilters}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border-strong)] px-4 text-sm font-medium text-[var(--text)] transition hover:border-white/35 hover:bg-white/[0.08]"
          >
            <Filter aria-hidden="true" size={16} />
            筛选
            {activeFilterCount > 0 ? (
              <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-bold text-black">
                {activeFilterCount}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={onChangeSort}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border-strong)] px-4 text-sm font-medium text-[var(--text)] transition hover:border-white/35 hover:bg-white/[0.08]"
          >
            <SlidersHorizontal aria-hidden="true" size={16} />
            排序
          </button>

          <button
            type="button"
            onClick={onChangeGroup}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border-strong)] px-4 text-sm font-medium text-[var(--text)] transition hover:border-white/35 hover:bg-white/[0.08]"
          >
            <Layers3 aria-hidden="true" size={16} />
            分组
          </button>

          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-4 text-sm font-medium text-[var(--muted)] transition hover:border-white/35 hover:bg-white/[0.08] hover:text-[var(--text)]"
          >
            清空条件
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--muted)]">
          <p>
            {query ? `搜索“${query}”` : "全部照片"} · {filteredCount} / {totalCount}
          </p>
          <p>{hasActiveSelection ? "已进入选择模式" : "选择、筛选和排序会保留当前上下文"}</p>
        </div>

        {photoSize && onPhotoSizeChange ? (
          <div className="rounded-2xl border border-[var(--border)] bg-black/35 p-3">
            <PhotoGallerySizeControl value={photoSize} onChange={onPhotoSizeChange} compact />
          </div>
        ) : null}
      </div>
    </section>
  );
}
