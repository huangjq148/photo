"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PhotoGalleryCard } from "@/components/photos/photo-gallery-card";
import { AddPhotoToAlbumModal } from "@/components/albums/add-photo-to-album-modal";
import type { PhotoSize } from "@/components/photos/photo-gallery-size-control";
import { PhotoGalleryFloatTools } from "@/components/photos/photo-gallery-float-tools";
import { useMessage } from "@/components/ui/message";
import type { ImageViewerNavigationItem } from "@/components/ui/image-viewer";
import { buildMediaViewerNavigationItems } from "@/components/photos/image-viewer-navigation";
import { ShareManager } from "@/components/share/share-manager";

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
};

type GroupMode = "none" | "month" | "year";

type PhotoGalleryProps = {
  albumId: string;
  refreshSignal?: number;
  onSetCover?: (photoId: string) => void;
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
  showTakenAt,
  onToggleTakenAt,
  photoSize,
  onPhotoSizeChange,
}: PhotoGalleryProps) {
  const [items, setItems] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [layoutMode, setLayoutMode] = useState<"grid" | "waterfall">("grid");
  const [groupMode, setGroupMode] = useState<GroupMode>("none");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sharePhotoId, setSharePhotoId] = useState<string | null>(null);
  const [addToAlbumPhoto, setAddToAlbumPhoto] = useState<PhotoItem | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const message = useMessage();

  // Initial load / reload on dependency changes
  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setPage(1);
        const params = new URLSearchParams({
          page: "1",
          pageSize: "24",
          _t: String(refreshToken + refreshSignal),
        });
        if (keyword.trim()) {
          params.set("keyword", keyword.trim());
        }
        const response = await fetch(`/api/albums/${albumId}/photos?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.error ?? "Failed to load photos");
        }
        if (mounted) {
          setItems(json.data.items);
          setHasMore(json.data.page * json.data.pageSize < json.data.total);
          setSelectedIds((current) => current.filter((id) => json.data.items.some((item: PhotoItem) => item.id === id)));
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load photos");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [albumId, keyword, refreshToken, refreshSignal]);

  // Infinite scroll: load next page when sentinel enters viewport
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore) {
          loadNextPage();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading, loadingMore, page, albumId, keyword, refreshToken, refreshSignal]);

  async function loadNextPage() {
    const nextPage = page + 1;
    setLoadingMore(true);

    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: "24",
        _t: String(Date.now()),
      });
      if (keyword.trim()) {
        params.set("keyword", keyword.trim());
      }
      const response = await fetch(`/api/albums/${albumId}/photos?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to load photos");
      }
      setPage(nextPage);
      setItems((current) => [...current, ...json.data.items]);
      setHasMore(nextPage * 24 < json.data.total);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载更多失败");
    } finally {
      setLoadingMore(false);
    }
  }

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

  function removePhotoFromState(photoId: string) {
    setItems((current) => current.filter((item) => item.id !== photoId));
    setSelectedIds((current) => current.filter((id) => id !== photoId));
  }

  async function toggleFavorite(photoId: string) {
    try {
      const response = await fetch(`/api/photos/${photoId}/favorite`, {
        method: "POST"
      });
      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error ?? "Failed to toggle favorite");
      }

      const json = (await response.json()) as { data?: { favorited?: boolean } };
      const nextFavorited = !!json.data?.favorited;
      setItems((current) =>
        current.map((item) =>
          item.id === photoId
            ? { ...item, isFavorited: nextFavorited }
            : item
        ),
      );
      message.success(nextFavorited ? "收藏成功" : "已取消收藏");
      return true;
    } catch (error) {
      message.error(error instanceof Error ? error.message : "收藏操作失败");
      return false;
    }
  }

  async function batchDeleteSelected() {
    if (selectedIds.length === 0) {
      return;
    }

    try {
      const response = await fetch(`/api/albums/${albumId}/photos/batch-delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ photoIds: selectedIds })
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error ?? "Failed to delete photos");
      }

      message.success(`已删除 ${selectedIds.length} 张照片`);
      setSelectedIds([]);
      setRefreshToken((current) => current + 1);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "批量删除失败");
    }
  }

  async function sharePhoto(photoId: string) {
    setSharePhotoId(photoId);
  }

  async function openAddToAlbum(photo: PhotoItem) {
    setAddToAlbumPhoto(photo);
  }

  const selectedCount = useMemo(() => selectedIds.length, [selectedIds]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const isGrouped = groupMode !== "none";

  // Build navigation items for fullscreen prev/next switching
  const navigableItems = useMemo<ImageViewerNavigationItem[]>(() => {
    return buildMediaViewerNavigationItems(items);
  }, [items]);

  const groupedPhotos = useMemo(() => {
    if (groupMode === "none") return null;
    return groupPhotos(items, groupMode);
  }, [items, groupMode]);

  if (loading) {
    return <div className="noir-glass-panel rounded-2xl p-6 text-[var(--muted)]">加载照片...</div>;
  }

  if (error) {
    return <div className="rounded-2xl border border-red-400/30 bg-red-950/30 p-6 text-[var(--danger)]">{error}</div>;
  }

  if (items.length === 0) {
    return <div className="noir-glass-panel rounded-2xl p-6 text-[var(--muted)]">暂无照片</div>;
  }

  return (
    <div className="space-y-4">
      <div className="noir-glass-panel rounded-[2rem] p-4">
        <div className="space-y-3">
          <div className="flex-1 space-y-2">
            <input
              id="photo-search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="按文件名搜索"
              className="h-12 w-full rounded-lg noir-glass-chip px-4 text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--film)]"
            />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs font-medium text-[var(--muted)]">展示方式</span>
          <nav className="inline-flex h-10 items-center rounded-lg noir-glass-chip p-1">
            {([
              ["none", "时间倒序"],
              ["month", "按月"],
              ["year", "按年"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setGroupMode(key)}
                className={`inline-flex h-8 items-center rounded-md px-3 text-xs font-medium transition ${
                  groupMode === key
                    ? "bg-[var(--accent)] text-black"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        {selectedCount > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl noir-glass-chip px-4 py-3">
            <span className="text-sm font-medium text-[var(--text)]">已选择 {selectedCount} 张</span>
            <button
              type="button"
              onClick={async () => {
                await batchDeleteSelected();
              }}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--danger)] px-4 text-sm font-bold text-black"
            >
              批量删除
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="inline-flex h-9 items-center justify-center rounded-lg noir-glass-chip px-4 text-sm font-bold text-[var(--text)]"
            >
              取消选择
            </button>
          </div>
        ) : null}
      </div>

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
              onDisplayNameChange={updatePhotoDisplayName}
              onRemove={removePhotoFromState}
            />
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1" />

      {loadingMore && (
        <div className="py-6 text-center text-sm text-[var(--muted)]">加载更多...</div>
      )}

      {!hasMore && items.length > 0 && (
        <div className="py-4 text-center text-xs text-[var(--muted)]">已加载全部照片</div>
      )}

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
    </div>
  );
}
