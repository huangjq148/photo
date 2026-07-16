"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Filter,
  Search,
  SlidersHorizontal,
  Layers3,
  X,
  Star,
  Image,
  Video,
  Calendar,
  ArrowUpDown,
  Upload,
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
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
  disabled?: boolean;
  sortSectionRef: React.RefObject<HTMLFieldSetElement | null>;
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
  disabled = false,
  sortSectionRef,
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
    <fieldset
      id="gallery-filter-panel"
      disabled={disabled}
      className="rounded-2xl border border-[var(--border)] bg-black/30 p-4 disabled:cursor-not-allowed disabled:opacity-60"
    >
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
              className={`inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${
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
              className={`inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${
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
              className={`inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${
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
              className={`inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${
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
              className={`inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${
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
            <DatePicker
              value={state.takenFrom ?? ""}
              onChange={(value) => onTakenFromChange(value || undefined)}
              className="min-h-11 w-full sm:w-[10rem]"
              placeholder="起始日期"
              id="gallery-taken-from"
              aria-label="起始日期"
            />
            <span className="text-xs text-[var(--muted)]">至</span>
            <DatePicker
              value={state.takenTo ?? ""}
              onChange={(value) => onTakenToChange(value || undefined)}
              className="min-h-11 w-full sm:w-[10rem]"
              placeholder="结束日期"
              id="gallery-taken-to"
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
                className={`inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${
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
        <fieldset id="gallery-sort-options" ref={sortSectionRef} tabIndex={-1}>
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
                className={`inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${
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
              className={`inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${
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
              className={`inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${
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
              className={`inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${
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
              className={`inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${
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
              className={`inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition ${
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
            className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-[var(--danger)] transition hover:bg-[var(--danger)]/10"
          >
            <X size={14} aria-hidden="true" />
            清除所有筛选
          </button>
        </div>
      ) : null}
    </fieldset>
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
  selectionMode: boolean;
  selectionBusy?: boolean;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onToggleFilters: () => void;
  onChangeSort: () => void;
  onChangeGroup: () => void;
  onClearFilters: () => void;
  onToggleSelectionMode: () => void;
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
  selectionMode,
  selectionBusy = false,
  onSearchChange,
  onClearSearch,
  onToggleFilters,
  onChangeSort,
  onChangeGroup,
  onClearFilters,
  onToggleSelectionMode,
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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(() => Boolean(query || searchValue));
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const sortSectionRef = useRef<HTMLFieldSetElement>(null);

  useEffect(() => {
    if (query || searchValue) {
      setMobileSearchOpen(true);
    }
  }, [query, searchValue]);

  function openMobileSearch() {
    setMobileSearchOpen(true);
    requestAnimationFrame(() => mobileSearchRef.current?.focus());
  }

  function handleMobileSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Escape") return;

    if (searchValue) {
      event.currentTarget.blur();
      return;
    }

    setMobileSearchOpen(false);
  }

  function handleMobileSort() {
    if (!filtersOpen) {
      onChangeSort();
    }
    requestAnimationFrame(() => sortSectionRef.current?.focus());
  }

  return (
    <section className="noir-glass-panel rounded-[2rem] p-4 sm:p-5">
      <div className="grid gap-3">
        <div data-testid="gallery-mobile-toolbar" className="sm:hidden">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openMobileSearch}
              disabled={selectionBusy}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[var(--border-strong)] text-[var(--text)] transition hover:border-white/35 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="搜索照片和视频"
              aria-expanded={mobileSearchOpen}
              aria-controls="gallery-mobile-search"
            >
              <Search aria-hidden="true" size={17} />
            </button>
            <button
              type="button"
              onClick={onToggleFilters}
              disabled={selectionBusy}
              className={`relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-60 ${
                filtersOpen
                  ? "border-[var(--accent)] bg-[var(--accent)] text-black"
                  : "border-[var(--border-strong)] text-[var(--text)] hover:border-white/35 hover:bg-white/[0.08]"
              }`}
              aria-label="筛选"
              aria-expanded={filtersOpen}
              aria-controls="gallery-filter-panel"
            >
              <Filter aria-hidden="true" size={17} />
              {activeFilterCount > 0 ? (
                <span className="absolute -right-1 -top-1 rounded-full bg-[var(--accent)] px-1.5 text-[10px] font-bold text-black">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={handleMobileSort}
              disabled={selectionBusy}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[var(--border-strong)] text-[var(--text)] transition hover:border-white/35 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="排序"
            >
              <SlidersHorizontal aria-hidden="true" size={17} />
            </button>
            <button
              type="button"
              onClick={onToggleSelectionMode}
              disabled={selectionBusy}
              className="ml-auto inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-strong)] px-4 text-sm font-medium text-[var(--text)] transition hover:border-white/35 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {selectionMode ? "取消" : "选择"}
            </button>
          </div>

          {mobileSearchOpen ? (
            <label
              id="gallery-mobile-search"
              data-testid="gallery-mobile-search"
              className="mt-3 block"
            >
              <span className="sr-only">搜索照片和视频</span>
              <div className="flex min-h-11 items-center gap-2 rounded-2xl border border-transparent noir-glass-chip px-4 transition focus-within:border-[var(--film)] focus-within:ring-2 focus-within:ring-[var(--film)]/45">
                <Search aria-hidden="true" size={16} className="text-[var(--muted)]" />
                <input
                  ref={mobileSearchRef}
                  value={searchValue}
                  onChange={(event) => onSearchChange(event.target.value)}
                  onBlur={() => {
                    if (!searchValue) setMobileSearchOpen(false);
                  }}
                  onKeyDown={handleMobileSearchKeyDown}
                  placeholder="搜索名称或原始文件名"
                  disabled={selectionBusy}
                  className="min-h-11 min-w-0 flex-1 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-60"
                />
                {searchValue ? (
                  <button
                    type="button"
                    onClick={onClearSearch}
                    disabled={selectionBusy}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-white/[0.08] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="清空搜索"
                  >
                    <X aria-hidden="true" size={14} />
                  </button>
                ) : null}
              </div>
            </label>
          ) : null}
        </div>

        <div className="hidden sm:block">
          <div className="grid gap-3">
            <label className="block">
              <span className="sr-only">搜索照片和视频</span>
              <div className="flex items-center gap-2 rounded-2xl noir-glass-chip px-4 py-3">
                <Search aria-hidden="true" size={16} className="text-[var(--muted)]" />
                <input
                  value={searchValue}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="搜索名称或原始文件名"
                  disabled={selectionBusy}
                  className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-60"
                />
                {searchValue ? (
                  <button
                    type="button"
                    onClick={onClearSearch}
                    disabled={selectionBusy}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-white/[0.08] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60"
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
                disabled={selectionBusy}
                className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
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
                disabled={selectionBusy}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border-strong)] px-4 text-sm font-medium text-[var(--text)] transition hover:border-white/35 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <SlidersHorizontal aria-hidden="true" size={16} />
                排序
              </button>

              <button
                type="button"
                onClick={onChangeGroup}
                disabled={selectionBusy}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border-strong)] px-4 text-sm font-medium text-[var(--text)] transition hover:border-white/35 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Layers3 aria-hidden="true" size={16} />
                分组
              </button>

              <button
                type="button"
                onClick={onClearFilters}
                disabled={selectionBusy}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-4 text-sm font-medium text-[var(--muted)] transition hover:border-white/35 hover:bg-white/[0.08] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                清空条件
              </button>
            </div>
          </div>
        </div>

        {/* Filter panel */}
        {filtersOpen && urlState ? (
          <FilterPanel
            state={urlState}
            disabled={selectionBusy}
            sortSectionRef={sortSectionRef}
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
          <div className="hidden rounded-2xl border border-[var(--border)] bg-black/35 p-3 sm:block">
            <PhotoGallerySizeControl value={photoSize} onChange={onPhotoSizeChange} compact />
          </div>
        ) : null}
      </div>
    </section>
  );
}
