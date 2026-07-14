"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PhotoGalleryCard } from "@/components/photos/photo-gallery-card";
import { TakenAtEditorModal } from "@/components/photos/taken-at-editor-modal";
import { AddPhotoToAlbumModal } from "@/components/albums/add-photo-to-album-modal";
import type { PhotoSize } from "@/components/photos/photo-gallery-size-control";
import { PhotoGalleryFloatTools } from "@/components/photos/photo-gallery-float-tools";
import { useMessage } from "@/components/ui/message";
import type { ImageViewerNavigationItem } from "@/components/ui/image-viewer";
import { buildMediaViewerNavigationItems } from "@/components/photos/image-viewer-navigation";
import { ShareManager } from "@/components/share/share-manager";
import { formatChildAgeLabel } from "@/lib/media/child-age";
import { BatchActionBar } from "@/components/photos/batch-action-bar";
import { GalleryToolbar } from "@/components/photos/gallery-toolbar";
import { GalleryEmptyState } from "@/components/photos/gallery-empty-state";
import { useGalleryQuery } from "@/hooks/use-gallery-query";
import { useAlbumMedia } from "@/hooks/use-album-media";

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
  takenAt: string | null;
  uploadedAt: string;
  isFavorited: boolean;
  canEditName: boolean;
  locationHidden: boolean;
};

type GroupMode = "none" | "month" | "year";

type PhotoGalleryProps = {
  albumId: string;
  refreshSignal?: number;
  onSetCover?: (photoId: string) => void;
  childBirthDate?: string | null;
  showTakenAt: boolean;
  onToggleTakenAt: () => void;
  photoSize: PhotoSize;
  onPhotoSizeChange: (value: PhotoSize) => void;
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

export function PhotoGallery({
  albumId,
  refreshSignal = 0,
  onSetCover,
  childBirthDate = null,
  showTakenAt,
  onToggleTakenAt,
  photoSize,
  onPhotoSizeChange,
}: PhotoGalleryProps) {
  const [committedKeyword, setCommittedKeyword] = useState("");
  const [items, setItems] = useState<PhotoItem[]>([]);
  const [layoutMode, setLayoutMode] = useState<"grid" | "waterfall">("grid");
  const [groupMode] = useState<GroupMode>("none");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [sharePhotoId, setSharePhotoId] = useState<string | null>(null);
  const [addToAlbumPhoto, setAddToAlbumPhoto] = useState<PhotoItem | null>(null);
  const [editTakenAtPhoto, setEditTakenAtPhoto] = useState<PhotoItem | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const message = useMessage();
  const galleryQuery = useGalleryQuery({
    onCommit: setCommittedKeyword,
  });

  const fetchAlbumPage = useMemo(
    () =>
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
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (query.trim()) {
          params.set("keyword", query.trim());
        }

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

  const media = useAlbumMedia<PhotoItem>({
    albumId,
    query: committedKeyword,
    refreshSignal: refreshToken + refreshSignal,
    fetchPage: fetchAlbumPage,
    pageSize: 24,
  });

  const totalCount = media.total;
  const loading = media.loading;
  const loadingMore = media.loadingMore;
  const error = media.error;
  const hasMore = media.hasMore;
  const reload = media.reload;
  const loadMore = media.loadMore;

  useEffect(() => {
    setItems(media.items);
  }, [media.items]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => items.some((item) => item.id === id)));
  }, [items]);

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

  async function removePhoto(photoId: string) {
    try {
      const response = await fetch(`/api/albums/${albumId}/photos/${photoId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error ?? "Failed to delete photo");
      }

      message.success("已从相册移除");
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
    setSelectedIds((current) => current.filter((id) => id !== photoId));
  }

  async function batchDeleteSelected() {
    if (selectedIds.length === 0) {
      return;
    }

    try {
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
        setSelectedIds(failedIds);
        message.error(result.failed?.[0]?.message ?? "部分照片删除失败");
      } else {
        setSelectedIds([]);
        message.success(`已删除 ${succeededCount || selectedIds.length} 张照片`);
      }

      if ((result.succeededIds?.length ?? 0) > 0) {
        setRefreshToken((current) => current + 1);
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : "批量删除失败");
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

  const selectedCount = useMemo(() => selectedIds.length, [selectedIds]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const isGrouped = groupMode !== "none";
  const batchActionBar = selectedCount > 0 ? (
    <BatchActionBar
      selectedCount={selectedCount}
      onClearSelection={() => setSelectedIds([])}
      onDeleteSelected={() => {
        void batchDeleteSelected();
      }}
      deleting={false}
    />
  ) : null;

  // Build navigation items for fullscreen prev/next switching
  const navigableItems = useMemo<ImageViewerNavigationItem[]>(() => {
    return buildMediaViewerNavigationItems(items);
  }, [items]);

  const groupedPhotos = useMemo(() => {
    if (groupMode === "none") return null;
    return groupPhotos(items, groupMode);
  }, [items, groupMode]);

  if (loading) {
    return (
      <div className="space-y-4">
        {batchActionBar}
        <GalleryToolbar
          query={committedKeyword}
          searchValue={galleryQuery.searchValue}
          filteredCount={0}
          totalCount={totalCount}
          activeFilterCount={0}
          hasActiveSelection={selectedCount > 0}
          onSearchChange={galleryQuery.setSearchValue}
          onClearSearch={galleryQuery.clearSearch}
          onToggleFilters={() => undefined}
          onChangeSort={() => undefined}
          onChangeGroup={() => undefined}
          onClearFilters={() => undefined}
          photoSize={photoSize}
          onPhotoSizeChange={onPhotoSizeChange}
        />
        <div className="noir-glass-panel rounded-2xl p-6 text-[var(--muted)]">加载照片...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        {batchActionBar}
        <GalleryToolbar
          query={committedKeyword}
          searchValue={galleryQuery.searchValue}
          filteredCount={items.length}
          totalCount={totalCount}
          activeFilterCount={0}
          hasActiveSelection={selectedCount > 0}
          onSearchChange={galleryQuery.setSearchValue}
          onClearSearch={galleryQuery.clearSearch}
          onToggleFilters={() => undefined}
          onChangeSort={() => undefined}
          onChangeGroup={() => undefined}
          onClearFilters={() => undefined}
          photoSize={photoSize}
          onPhotoSizeChange={onPhotoSizeChange}
        />
        <GalleryEmptyState
          reason="error"
          title="加载照片失败"
          description={error}
          onPrimaryAction={() => {
            void reload();
          }}
          primaryActionLabel="重新加载"
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        {batchActionBar}
        <GalleryToolbar
          query={committedKeyword}
          searchValue={galleryQuery.searchValue}
          filteredCount={0}
          totalCount={totalCount}
          activeFilterCount={0}
          hasActiveSelection={selectedCount > 0}
          onSearchChange={galleryQuery.setSearchValue}
          onClearSearch={galleryQuery.clearSearch}
          onToggleFilters={() => undefined}
          onChangeSort={() => undefined}
          onChangeGroup={() => undefined}
          onClearFilters={() => undefined}
          photoSize={photoSize}
          onPhotoSizeChange={onPhotoSizeChange}
        />
        <GalleryEmptyState
          reason={committedKeyword ? "search" : "empty"}
          onPrimaryAction={() => {
            if (committedKeyword) {
              galleryQuery.clearSearch();
              return;
            }
            void reload();
          }}
          primaryActionLabel={committedKeyword ? "清空搜索" : "重新加载"}
          secondaryActionLabel={committedKeyword ? "清空搜索" : undefined}
          onSecondaryAction={committedKeyword ? galleryQuery.clearSearch : undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {batchActionBar}
      <GalleryToolbar
        query={committedKeyword}
        searchValue={galleryQuery.searchValue}
        filteredCount={items.length}
        totalCount={totalCount}
        activeFilterCount={0}
        hasActiveSelection={selectedCount > 0}
        onSearchChange={galleryQuery.setSearchValue}
        onClearSearch={galleryQuery.clearSearch}
        onToggleFilters={() => undefined}
        onChangeSort={() => undefined}
        onChangeGroup={() => undefined}
        onClearFilters={() => undefined}
        photoSize={photoSize}
        onPhotoSizeChange={onPhotoSizeChange}
      />

      <PhotoGalleryFloatTools
        showTakenAt={showTakenAt}
        onToggleTakenAt={onToggleTakenAt}
        photoSize={photoSize}
        onPhotoSizeChange={onPhotoSizeChange}
        layoutMode={layoutMode}
        onLayoutModeChange={setLayoutMode}
        groupMode={groupMode}
      />

      {isGrouped && groupedPhotos ? (
        <div className="space-y-8">
          {Array.from(groupedPhotos.entries()).map(([label, photos]) => (
            <section key={label}>
              <h3 className="mb-3 flex items-center gap-3 text-sm font-bold text-[var(--text)]">
                <span>{label}</span>
                <span className="text-xs font-normal text-[var(--muted)]">{photos.length} 张</span>
              </h3>
              <div
                className={
                  {
                    small: "grid gap-3 grid-cols-3 sm:grid-cols-4 xl:grid-cols-5",
                    medium: "grid gap-4 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4",
                    large: "grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
                  }[photoSize]
                }
              >
                {photos.map((photo) => (
                <PhotoGalleryCard
                  key={photo.id}
                  albumId={albumId}
                  photo={photo}
                  selected={selectedIdSet.has(photo.id)}
                  waterfall={false}
                  showTakenAt={showTakenAt}
                  navigableItems={navigableItems}
                  childAgeLabel={formatChildAgeLabel(photo.takenAt, childBirthDate)}
                    onSelect={() => {
                      setSelectedIds((current) =>
                        current.includes(photo.id)
                          ? current.filter((item) => item !== photo.id)
                          : [...current, photo.id]
                      );
                    }}
                    onFavorite={() => {
                      return toggleFavorite(photo.id);
                    }}
                    onDelete={() => {
                      void removePhoto(photo.id);
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
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div
          className={
            layoutMode === "waterfall"
              ? {
                  small: "columns-3 gap-3 sm:columns-4 xl:columns-5",
                  medium: "columns-2 gap-4 sm:columns-3 xl:columns-4",
                  large: "columns-1 gap-5 sm:columns-2 xl:columns-3",
                }[photoSize]
              : {
                  small: "grid gap-3 grid-cols-3 sm:grid-cols-4 xl:grid-cols-5",
                  medium: "grid gap-4 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4",
                  large: "grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
                }[photoSize]
          }
        >
          {items.map((photo) => (
            <PhotoGalleryCard
              key={photo.id}
              albumId={albumId}
              photo={photo}
              selected={selectedIdSet.has(photo.id)}
              waterfall={layoutMode === "waterfall"}
              showTakenAt={showTakenAt}
              navigableItems={navigableItems}
              childAgeLabel={formatChildAgeLabel(photo.takenAt, childBirthDate)}
              onSelect={() => {
                setSelectedIds((current) =>
                  current.includes(photo.id)
                    ? current.filter((item) => item !== photo.id)
                    : [...current, photo.id]
                );
              }}
              onFavorite={() => {
                return toggleFavorite(photo.id);
              }}
              onDelete={() => {
                void removePhoto(photo.id);
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
        </div>
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
    </div>
  );
}
