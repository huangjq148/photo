"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PhotoGalleryCard } from "@/components/photos/photo-gallery-card";
import { TakenAtEditorModal } from "@/components/photos/taken-at-editor-modal";
import { AddPhotoToAlbumModal } from "@/components/albums/add-photo-to-album-modal";
import { BatchAddPhotosToAlbumModal } from "@/components/albums/batch-add-photos-to-album-modal";
import type { PhotoSize } from "@/components/photos/photo-gallery-size-control";
import { PhotoGalleryFloatTools } from "@/components/photos/photo-gallery-float-tools";
import { AsyncState } from "@/components/ui/async-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useMessage } from "@/components/ui/message";
import type { ImageViewerNavigationItem } from "@/components/ui/image-viewer";
import { buildMediaViewerNavigationItems } from "@/components/photos/image-viewer-navigation";
import { ShareManager } from "@/components/share/share-manager";
import { formatChildAgeLabel } from "@/lib/media/child-age";
import { BatchActionBar } from "@/components/photos/batch-action-bar";
import { GalleryToolbar } from "@/components/photos/gallery-toolbar";
import { GalleryEmptyState } from "@/components/photos/gallery-empty-state";
import { GalleryGrid } from "@/components/photos/gallery-grid";
import { getMediaDeleteActions } from "@/lib/media/delete-actions";
import { useGalleryQuery, type GalleryUrlState } from "@/hooks/use-gallery-query";
import { useAlbumMedia } from "@/hooks/use-album-media";
import { useSelection } from "@/hooks/use-selection";
import {
  loadGalleryPreferences,
  updateGalleryPreferences,
  type GalleryGroupMode,
  type GalleryLayoutMode,
} from "@/lib/client/gallery-preferences";

type PhotoItem = {
  id: string;
  displayName: string | null;
  originalName: string;
  thumbnailUrl: string;
  previewUrl: string;
  originalUrl: string;
  mimeType: string;
  mediaType: string;
  duration: number | null;
  width: number;
  height: number;
  size: number;
  albumCount: number;
  takenAt: string | null;
  uploadedAt: string;
  isFavorited: boolean;
  canEditName: boolean;
  locationHidden: boolean;
};

type PhotoGalleryProps = {
  albumId: string;
  refreshSignal?: number;
  onSetCover?: (photoId: string) => void;
  childBirthDate?: string | null;
  showTakenAt: boolean;
  onToggleTakenAt: () => void;
  photoSize: PhotoSize;
  onPhotoSizeChange: (value: PhotoSize) => void;
  isDefaultAlbum?: boolean;
};

function getSortDate(photo: PhotoItem): Date {
  return photo.takenAt ? new Date(photo.takenAt) : new Date(photo.uploadedAt);
}

function groupPhotos(photos: PhotoItem[], mode: GroupMode): Map<string, PhotoItem[]> {
  const groups = new Map<string, PhotoItem[]>();

  // Sort by date descending first
  const sorted = [...photos].sort((a, b) => getSortDate(b).getTime() - getSortDate(a).getTime());

  for (const photo of sorted) {
    const date = getSortDate(photo);
    let key: string;
    if (mode === "year") {
      key = `${date.getFullYear()}年`;
    } else {
      key = `${date.getFullYear()}年${date.getMonth() + 1}月`;
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(photo);
  }

  return groups;
}

function buildBatchPhotoLabel(items: PhotoItem[]) {
  if (items.length === 0) {
    return "未选择任何照片";
  }

  if (items.length === 1) {
    return items[0]?.displayName?.trim() || items[0]?.originalName || "未命名照片";
  }

  return `已选择 ${items.length} 张照片`;
}

type GroupMode = GalleryGroupMode;

function GallerySkeleton({ photoSize }: { photoSize: PhotoSize }) {
  const count = photoSize === "small" ? 12 : photoSize === "large" ? 6 : 9;

  return (
    <div className="space-y-4">
      <section className="noir-glass-panel rounded-[2rem] p-4 sm:p-5">
        <div className="space-y-3">
          <Skeleton className="h-11 w-full rounded-2xl" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-20 rounded-lg" />
            <Skeleton className="h-10 w-20 rounded-lg" />
            <Skeleton className="h-10 w-20 rounded-lg" />
            <Skeleton className="h-10 w-24 rounded-lg" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-40 rounded-full" />
            <Skeleton className="h-4 w-48 rounded-full" />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="aspect-square overflow-hidden rounded-2xl noir-glass-panel">
            <Skeleton className="h-full w-full rounded-none bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PhotoGallery({
  albumId,
  refreshSignal = 0,
  onSetCover,
  childBirthDate = null,
  showTakenAt,
  onToggleTakenAt,
  photoSize,
  onPhotoSizeChange,
  isDefaultAlbum = false,
}: PhotoGalleryProps) {
  const [committedKeyword, setCommittedKeyword] = useState("");
  const [items, setItems] = useState<PhotoItem[]>([]);
  const initialPreferences = useMemo(() => loadGalleryPreferences(), []);
  const [layoutMode, setLayoutMode] = useState<GalleryLayoutMode>(initialPreferences.layoutMode);
  const [groupMode] = useState<GalleryGroupMode>(initialPreferences.groupMode);
  const [refreshToken, setRefreshToken] = useState(0);
  const [sharePhotoId, setSharePhotoId] = useState<string | null>(null);
  const [addToAlbumPhoto, setAddToAlbumPhoto] = useState<PhotoItem | null>(null);
  const [batchAddOpen, setBatchAddOpen] = useState(false);
  const [editTakenAtPhoto, setEditTakenAtPhoto] = useState<PhotoItem | null>(null);
  const [busyAction, setBusyAction] = useState<"add" | "favorite" | "delete" | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const message = useMessage();
  const selection = useSelection();
  const galleryQuery = useGalleryQuery({
    onCommit: setCommittedKeyword,
  });

  const urlState = galleryQuery.urlState;
  const urlStateRef = useRef<GalleryUrlState>(urlState);
  urlStateRef.current = urlState;

  const fetchAlbumPage = useCallback(
    async ({
      albumId: targetAlbumId,
      query,
      page,
      pageSize,
      signal,
    }: {
      albumId: string;
      query: string;
      page: number;
      pageSize: number;
      signal: AbortSignal;
    }) => {
      const filters = urlStateRef.current;
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (query.trim()) {
        params.set("keyword", query.trim());
      }
      // Pass filter params to API
      if (filters?.mediaType) params.set("mediaType", filters.mediaType);
      if (filters?.favoritedOnly) params.set("favoritedOnly", "1");
      if (filters?.uploaderId) params.set("uploaderId", filters.uploaderId);
      if (filters?.takenFrom) params.set("takenFrom", filters.takenFrom);
      if (filters?.takenTo) params.set("takenTo", filters.takenTo);
      if (filters?.sortBy) params.set("sortBy", filters.sortBy);
      if (filters?.sortOrder) params.set("sortOrder", filters.sortOrder);

      const response = await fetch(`/api/albums/${targetAlbumId}/photos?${params.toString()}`, {
        cache: "no-store",
        signal,
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to load photos");
      }

      return {
        items: json.data.items as PhotoItem[],
        total: json.data.total as number,
        nextCursor: page * pageSize < json.data.total ? String(page + 1) : null,
      };
    },
    [],
  );

  const filterHash = useMemo(
    () =>
      [
        urlState.mediaType,
        urlState.favoritedOnly ? "f" : "",
        urlState.uploaderId,
        urlState.takenFrom,
        urlState.takenTo,
        urlState.sortBy,
        urlState.sortOrder,
      ]
        .filter(Boolean)
        .join("|"),
    [urlState],
  );

  // Increment on every filter change so useAlbumMedia re-fetches
  const [filterSeq, setFilterSeq] = useState(0);
  useEffect(() => {
    setFilterSeq((s) => s + 1);
  }, [filterHash]);

  const media = useAlbumMedia<PhotoItem>({
    albumId,
    query: committedKeyword,
    refreshSignal: refreshToken + refreshSignal + filterSeq,
    fetchPage: fetchAlbumPage,
    pageSize: 24,
  });

  const totalCount = media.total;
  const loading = media.loading;
  const refreshing = media.refreshing;
  const loadingMore = media.loadingMore;
  const error = media.error;
  const loadMoreError = media.loadMoreError;
  const hasMore = media.hasMore;
  const reload = media.reload;
  const loadMore = media.loadMore;

  useEffect(() => {
    updateGalleryPreferences({
      layoutMode,
      groupMode: urlState.groupBy ?? groupMode,
    });
  }, [groupMode, layoutMode, urlState.groupBy]);

  useEffect(() => {
    setItems(media.items);
  }, [media.items]);

  useEffect(() => {
    const itemIdSet = new Set(items.map((item) => item.id));
    const selected = Array.from(selection.selectedIds);
    if (selected.some((id) => !itemIdSet.has(id))) {
      selection.retainOnly(itemIdSet);
    }
  }, [items, selection.retainOnly, selection.selectedIds]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || loading || loadingMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore) {
          void loadMore().catch((err) => {
            message.error(err instanceof Error ? err.message : "加载更多失败");
          });
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading, loadingMore, loadMore, message]);

  async function removePhotoFromAlbum(photo: PhotoItem) {
    try {
      const response = await fetch(`/api/albums/${albumId}/photos/${photo.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error ?? "Failed to delete photo");
      }

      const undoResponse = async () => {
        const addResponse = await fetch(`/api/albums/${albumId}/photos/${photo.id}`, {
          method: "POST",
        });

        const addJson = await addResponse.json().catch(() => ({}));
        if (!addResponse.ok) {
          throw new Error(addJson.error ?? "撤销移除失败");
        }
        setRefreshToken((current) => current + 1);
      };

      message.success("已从相册移除", {
        label: "撤销",
        onSelect: undoResponse,
      });
      selection.retainOnly(Array.from(selection.selectedIds).filter((id) => id !== photo.id));
      setItems((current) => current.filter((item) => item.id !== photo.id));
      setRefreshToken((current) => current + 1);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "删除照片失败");
    }
  }

  async function movePhotoToTrash(photo: PhotoItem) {
    try {
      const response = await fetch(`/api/photos/${photo.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error ?? "Failed to delete photo");
      }

      message.success("已移入回收站", {
        label: "撤销",
        onSelect: async () => {
          const undoResponse = await fetch(`/api/photos/${photo.id}/restore`, {
            method: "POST",
          });
          const undoJson = await undoResponse.json().catch(() => ({}));
          if (!undoResponse.ok) {
            throw new Error(undoJson.error ?? "撤销移入回收站失败");
          }
          setRefreshToken((current) => current + 1);
        },
      });
      setItems((current) => current.filter((item) => item.id !== photo.id));
      selection.retainOnly(Array.from(selection.selectedIds).filter((id) => id !== photo.id));
      setRefreshToken((current) => current + 1);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "删除照片失败");
    }
  }

  function updatePhotoDisplayName(photoId: string, displayName: string | null) {
    setItems((current) =>
      current.map((item) =>
        item.id === photoId ? { ...item, displayName } : item
      )
    );
  }

  function updatePhotoMetadata(photoId: string, next: { takenAt?: string | null; locationHidden?: boolean }) {
    setItems((current) =>
      current.map((item) =>
        item.id === photoId
          ? {
              ...item,
              ...(next.takenAt !== undefined ? { takenAt: next.takenAt } : {}),
              ...(next.locationHidden !== undefined ? { locationHidden: next.locationHidden } : {}),
            }
          : item
      )
    );
  }

  function removePhotoFromState(photoId: string) {
    setItems((current) => current.filter((item) => item.id !== photoId));
    selection.retainOnly(Array.from(selection.selectedIds).filter((id) => id !== photoId));
  }

  const deleteAction = useMemo(
    () => getMediaDeleteActions({ surface: "album", isDefaultAlbum }),
    [isDefaultAlbum],
  );

  async function batchDeleteSelected() {
    if (selectedIds.length === 0 || busyAction) {
      return;
    }

    try {
      setBusyAction("delete");
      const response = await fetch(`/api/albums/${albumId}/photos/batch-remove`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ photoIds: selectedIds }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to delete photos");
      }

      const result = json.data as { succeededIds?: string[]; failed?: Array<{ id: string; message: string }> };
      const failedIds = result.failed?.map((item) => item.id) ?? [];
      const succeededCount = result.succeededIds?.length ?? 0;

      if (failedIds.length > 0) {
        selection.retainOnly(failedIds);
        message.error(result.failed?.[0]?.message ?? "部分照片删除失败");
      } else {
        selection.clear();
        message.success(`已删除 ${succeededCount || selectedIds.length} 张照片`);
      }

      if ((result.succeededIds?.length ?? 0) > 0) {
        setRefreshToken((current) => current + 1);
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : "批量删除失败");
    } finally {
      setBusyAction(null);
    }
  }

  async function toggleFavorite(photoId: string) {
    const current = items.find((item) => item.id === photoId);

    try {
      const response = await fetch(`/api/photos/${photoId}/favorite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ favorited: !current?.isFavorited }),
      });
      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error ?? "Failed to toggle favorite");
      }

      const json = (await response.json()) as { data?: { favorited?: boolean } };
      const nextFavorited = !!json.data?.favorited;
      setItems((currentItems) =>
        currentItems.map((item) => (item.id === photoId ? { ...item, isFavorited: nextFavorited } : item)),
      );
      message.success(nextFavorited ? "收藏成功" : "已取消收藏");
      return true;
    } catch (error) {
      message.error(error instanceof Error ? error.message : "收藏操作失败");
      return false;
    }
  }

  async function batchToggleFavorite() {
    if (selectedIds.length === 0 || busyAction) {
      return;
    }

    const nextFavorited = !selectedItems.every((item) => item.isFavorited);

    try {
      setBusyAction("favorite");
      const response = await fetch("/api/photos/batch-favorite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ photoIds: selectedIds, favorited: nextFavorited }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error ?? "批量收藏失败");
      }

      const result = json.data as { succeededIds?: string[]; failed?: Array<{ id: string; message: string }> };
      const failedIds = result.failed?.map((item) => item.id) ?? [];
      const succeededIdSet = new Set(result.succeededIds ?? []);

      setItems((currentItems) =>
        currentItems.map((item) =>
          succeededIdSet.has(item.id) ? { ...item, isFavorited: nextFavorited } : item,
        ),
      );

      if (failedIds.length > 0) {
        selection.retainOnly(failedIds);
        message.error(result.failed?.[0]?.message ?? "部分照片收藏失败");
      } else {
        selection.clear();
        message.success(nextFavorited ? "已收藏选中照片" : "已取消收藏选中照片");
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : "批量收藏失败");
    } finally {
      setBusyAction(null);
    }
  }

  function sharePhoto(photoId: string) {
    setSharePhotoId(photoId);
  }

  function openAddToAlbum(photo: PhotoItem) {
    setAddToAlbumPhoto(photo);
  }

  function openEditTakenAt(photo: PhotoItem) {
    setEditTakenAtPhoto(photo);
  }

  async function toggleLocationHidden(photo: PhotoItem) {
    const nextHidden = !photo.locationHidden;
    const confirmed = window.confirm(
      nextHidden ? "确认隐藏这张照片的位置？" : "确认显示这张照片的位置？"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/photos/${photo.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ locationHidden: nextHidden }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error ?? "位置可见性保存失败");
      }

      updatePhotoMetadata(photo.id, { locationHidden: !!json.data?.locationHidden });
      message.success(nextHidden ? "位置已隐藏" : "位置已显示");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "位置可见性保存失败");
    }
  }

  async function saveTakenAt(photo: PhotoItem, takenAt: string | null) {
    try {
      const response = await fetch(`/api/photos/${photo.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ takenAt }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error ?? "拍摄时间保存失败");
      }

      updatePhotoMetadata(photo.id, { takenAt: json.data?.takenAt ?? takenAt });
      message.success(takenAt ? "拍摄时间已更新" : "拍摄时间已清除");
      setEditTakenAtPhoto(null);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "拍摄时间保存失败");
      throw error instanceof Error ? error : new Error("拍摄时间保存失败");
    }
  }

  const selectedIds = useMemo(() => Array.from(selection.selectedIds), [selection.selectedIds]);
  const selectedCount = selection.size;
  const selectedIdSet = selection.selectedIds;
  const selectedItems = useMemo(
    () => items.filter((item) => selectedIdSet.has(item.id)),
    [items, selectedIdSet],
  );
  const selectionMode = selectedCount > 0;
  const favoriteBatchLabel = selectedItems.length > 0 && selectedItems.every((item) => item.isFavorited)
    ? "取消收藏"
    : "收藏";
  const effectiveGroupMode = urlState.groupBy ?? groupMode;
  const isGrouped = effectiveGroupMode !== "none";
  const batchActionBar = selectionMode ? (
    <BatchActionBar
      selectedCount={selectedCount}
      favoriteLabel={favoriteBatchLabel}
      onAddSelected={() => {
        setBatchAddOpen(true);
      }}
      onToggleFavoriteSelected={() => {
        void batchToggleFavorite();
      }}
      onDeleteSelected={() => {
        void batchDeleteSelected();
      }}
      onClearSelection={() => selection.clear()}
      busyAction={busyAction}
    />
  ) : null;

  function confirmDiscardSelection() {
    if (!selectionMode) {
      return true;
    }

    return window.confirm("当前已选择照片，切换搜索或筛选会清空选择，是否继续？");
  }

  function handleSearchChange(next: string) {
    if (next !== galleryQuery.searchValue && selectionMode && !confirmDiscardSelection()) {
      return;
    }

    if (selectionMode) {
      selection.clear();
    }

    galleryQuery.setSearchValue(next);
  }

  function handleClearSearch() {
    if (selectionMode && !confirmDiscardSelection()) {
      return;
    }

    if (selectionMode) {
      selection.clear();
    }

    galleryQuery.clearSearch();
  }

  function handleSelectionSensitiveAction(action: () => void) {
    if (selectionMode && !confirmDiscardSelection()) {
      return;
    }

    if (selectionMode) {
      selection.clear();
    }

    action();
  }

  function handleBatchAddResult(result: { succeededIds: string[]; failed: Array<{ id: string; message: string }> }) {
    if (result.failed.length > 0) {
      selection.retainOnly(result.failed.map((item) => item.id));
    } else {
      selection.clear();
    }

    if (result.succeededIds.length > 0) {
      setRefreshToken((current) => current + 1);
    }
  }

  // Build navigation items for fullscreen prev/next switching
  const navigableItems = useMemo<ImageViewerNavigationItem[]>(() => {
    return buildMediaViewerNavigationItems(items);
  }, [items]);

  const groupedPhotos = useMemo(() => {
    if (effectiveGroupMode === "none") return null;
    return groupPhotos(items, effectiveGroupMode as GroupMode);
  }, [items, effectiveGroupMode]);

  return (
    <div className="space-y-4">
      {batchActionBar}
      <GalleryToolbar
        query={committedKeyword}
        searchValue={galleryQuery.searchValue}
        filteredCount={items.length}
        totalCount={totalCount}
        activeFilterCount={galleryQuery.activeFilterCount}
        hasActiveSelection={selectedCount > 0}
        selectionMode={selectionMode}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
        onToggleFilters={() => handleSelectionSensitiveAction(() => setFiltersOpen(!filtersOpen))}
        onChangeSort={() => handleSelectionSensitiveAction(() => setFiltersOpen(!filtersOpen))}
        onChangeGroup={() => handleSelectionSensitiveAction(() => setFiltersOpen(!filtersOpen))}
        onClearFilters={() => {
          if (selectionMode && !confirmDiscardSelection()) return;
          if (selectionMode) selection.clear();
          galleryQuery.clearFilters();
        }}
        onToggleSelectionMode={() => undefined}
        photoSize={photoSize}
        onPhotoSizeChange={onPhotoSizeChange}
        filtersOpen={filtersOpen}
        urlState={urlState}
        showUploaderFilter={!isDefaultAlbum}
        onMediaTypeChange={(v) => galleryQuery.setMediaType(v)}
        onFavoritedOnlyChange={(v) => galleryQuery.setFavoritedOnly(v)}
        onUploaderIdChange={(v) => galleryQuery.setUploaderId(v)}
        onTakenFromChange={(v) => galleryQuery.setTakenRange(v, urlState.takenTo)}
        onTakenToChange={(v) => galleryQuery.setTakenRange(urlState.takenFrom, v)}
        onSortByChange={(v) => galleryQuery.setSortBy(v)}
        onSortOrderChange={(v) => galleryQuery.setSortOrder(v)}
        onGroupByChange={(v) => galleryQuery.setGroupBy(v)}
      />

      <AsyncState
        loading={loading}
        refreshing={refreshing}
        hasContent={items.length > 0}
        error={error}
        loadMoreError={loadMoreError}
        onRetry={() => {
          void reload();
        }}
        onRetryLoadMore={() => {
          void loadMore().catch((err) => {
            message.error(err instanceof Error ? err.message : "加载更多失败");
          });
        }}
        skeleton={<GallerySkeleton photoSize={photoSize} />}
        errorFallback={
          <GalleryEmptyState
            reason="error"
            title="加载照片失败"
            description={error ?? undefined}
            onPrimaryAction={() => {
              void reload();
            }}
            primaryActionLabel="重新加载"
          />
        }
        empty={
          <GalleryEmptyState
            reason={committedKeyword ? "search" : "empty"}
            onPrimaryAction={() => {
              if (committedKeyword) {
                handleClearSearch();
                return;
              }
              void reload();
            }}
            primaryActionLabel={committedKeyword ? "清空搜索" : "重新加载"}
            secondaryActionLabel={committedKeyword ? "清空搜索" : undefined}
            onSecondaryAction={committedKeyword ? handleClearSearch : undefined}
          />
        }
      >
        <PhotoGalleryFloatTools
          showTakenAt={showTakenAt}
          onToggleTakenAt={onToggleTakenAt}
          photoSize={photoSize}
          onPhotoSizeChange={onPhotoSizeChange}
          layoutMode={layoutMode}
          onLayoutModeChange={setLayoutMode}
          groupMode={effectiveGroupMode as GalleryGroupMode}
        />

        {isGrouped && groupedPhotos ? (
          <div className="space-y-8">
            {Array.from(groupedPhotos.entries()).map(([label, photos]) => (
              <section key={label}>
                <h3 className="mb-3 flex items-center gap-3 text-sm font-bold text-[var(--text)]">
                  <span>{label}</span>
                  <span className="text-xs font-normal text-[var(--muted)]">{photos.length} 张</span>
                </h3>
                <GalleryGrid photoSize={photoSize}>
                  {photos.map((photo) => (
                    <PhotoGalleryCard
                      key={photo.id}
                      albumId={albumId}
                      photo={photo}
                      selected={selectedIdSet.has(photo.id)}
                      selectionMode={selectionMode}
                      waterfall={false}
                      showTakenAt={showTakenAt}
                      navigableItems={navigableItems}
                      childAgeLabel={formatChildAgeLabel(photo.takenAt, childBirthDate)}
                      onSelect={() => {
                        selection.toggle(photo.id);
                      }}
                      onFavorite={() => {
                        return toggleFavorite(photo.id);
                      }}
                      deleteLabel={deleteAction.label}
                      onDelete={() => {
                        void (isDefaultAlbum ? movePhotoToTrash(photo) : removePhotoFromAlbum(photo));
                      }}
                      onShare={() => {
                        void sharePhoto(photo.id);
                      }}
                      onSetCover={() => {
                        if (onSetCover) onSetCover(photo.id);
                      }}
                      onAddToAlbum={() => {
                        void openAddToAlbum(photo);
                      }}
                      onEditTakenAt={() => {
                        void openEditTakenAt(photo);
                      }}
                      onToggleLocationHidden={() => {
                        void toggleLocationHidden(photo);
                      }}
                      onDisplayNameChange={updatePhotoDisplayName}
                      onRemove={removePhotoFromState}
                    />
                  ))}
                </GalleryGrid>
              </section>
            ))}
          </div>
        ) : (
          <GalleryGrid photoSize={photoSize} waterfall={layoutMode === "waterfall"}>
            {items.map((photo) => (
              <PhotoGalleryCard
                key={photo.id}
                albumId={albumId}
                photo={photo}
                selected={selectedIdSet.has(photo.id)}
                selectionMode={selectionMode}
                waterfall={layoutMode === "waterfall"}
                showTakenAt={showTakenAt}
                navigableItems={navigableItems}
                childAgeLabel={formatChildAgeLabel(photo.takenAt, childBirthDate)}
                onSelect={() => {
                  selection.toggle(photo.id);
                }}
                onFavorite={() => {
                  return toggleFavorite(photo.id);
                }}
                deleteLabel={deleteAction.label}
                onDelete={() => {
                  void (isDefaultAlbum ? movePhotoToTrash(photo) : removePhotoFromAlbum(photo));
                }}
                onShare={() => {
                  void sharePhoto(photo.id);
                }}
                onSetCover={() => {
                  if (onSetCover) onSetCover(photo.id);
                }}
                onAddToAlbum={() => {
                  void openAddToAlbum(photo);
                }}
                onEditTakenAt={() => {
                  void openEditTakenAt(photo);
                }}
                onToggleLocationHidden={() => {
                  void toggleLocationHidden(photo);
                }}
                onDisplayNameChange={updatePhotoDisplayName}
                onRemove={removePhotoFromState}
              />
            ))}
          </GalleryGrid>
        )}

        {hasMore ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => {
                void loadMore().catch((err) => {
                  message.error(err instanceof Error ? err.message : "加载更多失败");
                });
              }}
              disabled={loadingMore}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border-strong)] px-5 text-sm font-bold text-[var(--text)] transition hover:border-white/35 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingMore ? "正在加载" : "加载更多"}
            </button>
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-[var(--muted)]">已加载全部照片</div>
        )}
      </AsyncState>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1" />

      {sharePhotoId ? (
        <ShareManager
          photoId={sharePhotoId}
          open={!!sharePhotoId}
          onClose={() => setSharePhotoId(null)}
        />
      ) : null}

      {addToAlbumPhoto ? (
        <AddPhotoToAlbumModal
          open={!!addToAlbumPhoto}
          currentAlbumId={albumId}
          photoId={addToAlbumPhoto.id}
          photoName={addToAlbumPhoto.displayName?.trim() || addToAlbumPhoto.originalName}
          onClose={() => setAddToAlbumPhoto(null)}
          onAdded={() => {
            setRefreshToken((current) => current + 1);
          }}
        />
      ) : null}

      {editTakenAtPhoto ? (
        <TakenAtEditorModal
          open={!!editTakenAtPhoto}
          photoName={editTakenAtPhoto.displayName?.trim() || editTakenAtPhoto.originalName}
          currentTakenAt={editTakenAtPhoto.takenAt}
          uploadedAt={editTakenAtPhoto.uploadedAt}
          onClose={() => setEditTakenAtPhoto(null)}
          onSave={(takenAt) => saveTakenAt(editTakenAtPhoto, takenAt)}
        />
      ) : null}

      <BatchAddPhotosToAlbumModal
        open={batchAddOpen}
        photoIds={selectedIds}
        photoLabel={buildBatchPhotoLabel(selectedItems)}
        onClose={() => setBatchAddOpen(false)}
        onResult={handleBatchAddResult}
      />
    </div>
  );
}
