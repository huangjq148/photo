"use client";

import React, { useState } from "react";
import {
  Filter,
  Search,
  SlidersHorizontal,
  Layers3,
  X,
  Check,
  Star,
  Image,
  Video,
  Calendar,
  ArrowUpDown,
  Upload,
} from "lucide-react";
import type {
  GalleryMediaType,
  GallerySortBy,
  GallerySortOrder,
  GalleryGroupMode,
  GalleryUrlState,
} from "@/hooks/use-gallery-query";
import { PhotoGallerySizeControl, type PhotoSize } from "@/components/photos/photo-gallery-size-control";

// ─── Filter Panel ────────────────────────────────────────────────────────

type FilterPanelProps = {
  state: GalleryUrlState;
  showUploader: boolean;
  onMediaTypeChange: (value?: GalleryMediaType) => void;
  onFavoritedOnlyChange: (value?: boolean) => void;
  onUploaderIdChange: (value?: string) => void;
  onTakenFromChange: (value?: string) => void;
  onTakenToChange: (value?: string) => void;
  onSortByChange: (value?: GallerySortBy) => void;
  onSortOrderChange: (value?: GallerySortOrder) => void;
  onGroupByChange: (value?: GalleryGroupMode) => void;
  onClearFilters: () => void;
};

function FilterPanel({
  state,
  showUploader,
  onMediaTypeChange,
  onFavoritedOnlyChange,
  onUploaderIdChange,
  onTakenFromChange,
  onTakenToChange,
  onSortByChange,
  onSortOrderChange,
  onGroupByChange,
  onClearFilters,
}: FilterPanelProps) {
  const hasFilters =
    !!state.mediaType ||
    !!state.favoritedOnly ||
    !!state.uploaderId ||
    !!state.takenFrom ||
    !!state.takenTo;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-black/30 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Media type */}
        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            媒体类型
          </legend>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onMediaTypeChange(undefined)}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${
                !state.mediaType
                  ? "bg-[var(--accent)] text-black"
                  : "border border-[var(--border)] text-[var(--muted)] hover:border-white/25 hover:text-[var(--text)]"
              }`}
            >
              <Image size={14} aria-hidden="true" />
              全部
            </button>
            <button
              type="button"
              onClick={() =>
                onMediaTypeChange(state.mediaType === "image" ? undefined : "image")
              }
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${
                state.mediaType === "image"
                  ? "bg-[var(--accent)] text-black"
                  : "border border-[var(--border)] text-[var(--muted)] hover:border-white/25 hover:text-[var(--text)]"
              }`}
            >
              <Image size={14} aria-hidden="true" />
              照片
            </button>
            <button
              type="button"
              onClick={() =>
                onMediaTypeChange(state.mediaType === "video" ? undefined : "video")
              }
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${
                state.mediaType === "video"
                  ? "bg-[var(--accent)] text-black"
                  : "border border-[var(--border)] text-[var(--muted)] hover:border-white/25 hover:text-[var(--text)]"
              }`}
            >
              <Video size={14} aria-hidden="true" />
              视频
            </button>
          </div>
        </fieldset>

        {/* Favorited */}
        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            收藏
          </legend>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onFavoritedOnlyChange(undefined)}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${
                !state.favoritedOnly
                  ? "bg-[var(--accent)] text-black"
                  : "border border-[var(--border)] text-[var(--muted)] hover:border-white/25 hover:text-[var(--text)]"
              }`}
            >
              全部
            </button>
            <button
              type="button"
              onClick={() =>
                onFavoritedOnlyChange(state.favoritedOnly ? undefined : true)
              }
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${
                state.favoritedOnly
                  ? "bg-[var(--accent)] text-black"
                  : "border border-[var(--border)] text-[var(--muted)] hover:border-white/25 hover:text-[var(--text)]"
              }`}
            >
              <Star size={14} aria-hidden="true" />
              仅收藏
            </button>
          </div>
        </fieldset>

        {/* Date range */}
        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            <Calendar size={12} className="mr-1 inline" aria-hidden="true" />
            拍摄日期
          </legend>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={state.takenFrom ?? ""}
              onChange={(e) => onTakenFromChange(e.target.value || undefined)}
              className="min-h-9 rounded-lg border border-[var(--border)] bg-black px-3 text-xs text-[var(--text)] outline-none focus:border-[var(--film)]"
              aria-label="起始日期"
            />
            <span className="text-xs text-[var(--muted)]">至</span>
            <input
              type="date"
              value={state.takenTo ?? ""}
              onChange={(e) => onTakenToChange(e.target.value || undefined)}
              className="min-h-9 rounded-lg border border-[var(--border)] bg-black px-3 text-xs text-[var(--text)] outline-none focus:border-[var(--film)]"
              aria-label="结束日期"
            />
          </div>
        </fieldset>

        {/* Uploader (only for collab albums) */}
        {showUploader ? (
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              <Upload size={12} className="mr-1 inline" aria-hidden="true" />
              上传者
            </legend>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onUploaderIdChange(undefined)}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${
                  !state.uploaderId
                    ? "bg-[var(--accent)] text-black"
                    : "border border-[var(--border)] text-[var(--muted)] hover:border-white/25 hover:text-[var(--text)]"
                }`}
              >
                全部
              </button>
            </div>
          </fieldset>
        ) : null}

        {/* Sort */}
        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            <ArrowUpDown size={12} className="mr-1 inline" aria-hidden="true" />
            排序
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { value: "uploadedAt", label: "上传时间" },
                { value: "takenAt", label: "拍摄时间" },
                { value: "fileName", label: "文件名" },
                { value: "size", label: "文件大小" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  onSortByChange(state.sortBy === opt.value ? undefined : opt.value)
                }
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${
                  state.sortBy === opt.value
                    ? "bg-[var(--accent)] text-black"
                    : "border border-[var(--border)] text-[var(--muted)] hover:border-white/25 hover:text-[var(--text)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Sort order */}
        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            顺序
          </legend>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onSortOrderChange("desc")}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${
                state.sortOrder === "desc" || !state.sortOrder
                  ? "bg-[var(--accent)] text-black"
                  : "border border-[var(--border)] text-[var(--muted)] hover:border-white/25 hover:text-[var(--text)]"
              }`}
            >
              降序
            </button>
            <button
              type="button"
              onClick={() => onSortOrderChange("asc")}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${
                state.sortOrder === "asc"
                  ? "bg-[var(--accent)] text-black"
                  : "border border-[var(--border)] text-[var(--muted)] hover:border-white/25 hover:text-[var(--text)]"
              }`}
            >
              升序
            </button>
          </div>
        </fieldset>

        {/* Group */}
        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            <Layers3 size={12} className="mr-1 inline" aria-hidden="true" />
            分组
          </legend>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onGroupByChange(undefined)}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${
                !state.groupBy
                  ? "bg-[var(--accent)] text-black"
                  : "border border-[var(--border)] text-[var(--muted)] hover:border-white/25 hover:text-[var(--text)]"
              }`}
            >
              无
            </button>
            <button
              type="button"
              onClick={() =>
                onGroupByChange(state.groupBy === "year" ? undefined : "year")
              }
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${
                state.groupBy === "year"
                  ? "bg-[var(--accent)] text-black"
                  : "border border-[var(--border)] text-[var(--muted)] hover:border-white/25 hover:text-[var(--text)]"
              }`}
            >
              按年
            </button>
            <button
              type="button"
              onClick={() =>
                onGroupByChange(state.groupBy === "month" ? undefined : "month")
              }
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${
                state.groupBy === "month"
                  ? "bg-[var(--accent)] text-black"
                  : "border border-[var(--border)] text-[var(--muted)] hover:border-white/25 hover:text-[var(--text)]"
              }`}
            >
              按月
            </button>
          </div>
        </fieldset>
      </div>

      {hasFilters ? (
        <div className="mt-4 border-t border-[var(--border)] pt-3">
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-[var(--danger)] transition hover:bg-[var(--danger)]/10"
          >
            <X size={14} aria-hidden="true" />
            清除所有筛选
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ─── Gallery Toolbar ──────────────────────────────────────────────────────

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
  // Filter panel props
  filtersOpen?: boolean;
  urlState?: GalleryUrlState;
  showUploaderFilter?: boolean;
  onMediaTypeChange?: (value?: GalleryMediaType) => void;
  onFavoritedOnlyChange?: (value?: boolean) => void;
  onUploaderIdChange?: (value?: string) => void;
  onTakenFromChange?: (value?: string) => void;
  onTakenToChange?: (value?: string) => void;
  onSortByChange?: (value?: GallerySortBy) => void;
  onSortOrderChange?: (value?: GallerySortOrder) => void;
  onGroupByChange?: (value?: GalleryGroupMode) => void;
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
  filtersOpen = false,
  urlState,
  showUploaderFilter = false,
  onMediaTypeChange,
  onFavoritedOnlyChange,
  onUploaderIdChange,
  onTakenFromChange,
  onTakenToChange,
  onSortByChange,
  onSortOrderChange,
  onGroupByChange,
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
            className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition ${
              filtersOpen
                ? "border-[var(--accent)] bg-[var(--accent)] text-black"
                : "border-[var(--border-strong)] text-[var(--text)] hover:border-white/35 hover:bg-white/[0.08]"
            }`}
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

        {/* Filter panel */}
        {filtersOpen && urlState ? (
          <FilterPanel
            state={urlState}
            showUploader={showUploaderFilter}
            onMediaTypeChange={onMediaTypeChange ?? (() => undefined)}
            onFavoritedOnlyChange={onFavoritedOnlyChange ?? (() => undefined)}
            onUploaderIdChange={onUploaderIdChange ?? (() => undefined)}
            onTakenFromChange={onTakenFromChange ?? (() => undefined)}
            onTakenToChange={onTakenToChange ?? (() => undefined)}
            onSortByChange={onSortByChange ?? (() => undefined)}
            onSortOrderChange={onSortOrderChange ?? (() => undefined)}
            onGroupByChange={onGroupByChange ?? (() => undefined)}
            onClearFilters={onClearFilters}
          />
        ) : null}

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
