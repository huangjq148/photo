"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PhotoGalleryCard } from "@/components/photos/photo-gallery-card";
import type { PhotoSize } from "@/components/photos/photo-gallery-size-control";
import { PhotoGalleryFloatTools } from "@/components/photos/photo-gallery-float-tools";
import { useMessage } from "@/components/ui/message";

type PhotoItem = {
  id: string;
  originalName: string;
  thumbnailUrl: string;
  previewUrl: string;
  mediaType?: string;
  processingStatus?: string;
  mimeType: string;
  width: number;
  height: number;
  takenAt: string | null;
  uploadedAt: string;
};

type PhotoGalleryProps = {
  albumId: string;
  refreshSignal?: number;
  onSetCover?: (photoId: string) => void;
};

export function PhotoGallery({ albumId, refreshSignal = 0, onSetCover }: PhotoGalleryProps) {
  const [items, setItems] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [layoutMode, setLayoutMode] = useState<"grid" | "waterfall">("grid");
  const [photoSize, setPhotoSize] = useState<PhotoSize>("medium");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showTakenAt, setShowTakenAt] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
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

  async function toggleFavorite(photoId: string) {
    try {
      const response = await fetch(`/api/photos/${photoId}/favorite`, {
        method: "POST"
      });
      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error ?? "Failed to toggle favorite");
      }

      message.success("收藏状态已更新");
      setRefreshToken((current) => current + 1);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "收藏操作失败");
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
    try {
      const response = await fetch(`/api/photos/${photoId}/share`, {
        method: "POST"
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error ?? "Failed to create share link");
      }

      const json = (await response.json()) as { data: { url: string } };
      await navigator.clipboard.writeText(new URL(json.data.url, window.location.origin).toString());
      message.success("分享链接已复制");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "分享失败");
    }
  }

  const selectedCount = useMemo(() => selectedIds.length, [selectedIds]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  if (loading) {
    return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--muted)]">加载照片...</div>;
  }

  if (error) {
    return <div className="rounded-2xl border border-red-400/30 bg-red-950/30 p-6 text-[var(--danger)]">{error}</div>;
  }

  if (items.length === 0) {
    return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--muted)]">暂无照片</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="space-y-3">
          <div className="flex-1 space-y-2">
            <input
              id="photo-search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="按文件名搜索"
              className="h-12 w-full rounded-lg border border-[var(--border)] bg-black px-4 text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--film)]"
            />
          </div>
        </div>

        {selectedCount > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-black px-4 py-3">
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
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-sm font-bold text-[var(--text)]"
            >
              取消选择
            </button>
          </div>
        ) : null}
      </div>

      <PhotoGalleryFloatTools
        showTakenAt={showTakenAt}
        onToggleTakenAt={() => setShowTakenAt((prev) => !prev)}
        photoSize={photoSize}
        onPhotoSizeChange={setPhotoSize}
        layoutMode={layoutMode}
        onLayoutModeChange={setLayoutMode}
      />

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
            photo={photo}
            selected={selectedIdSet.has(photo.id)}
            waterfall={layoutMode === "waterfall"}
            showTakenAt={showTakenAt}
            onSelect={() => {
              setSelectedIds((current) =>
                current.includes(photo.id)
                  ? current.filter((item) => item !== photo.id)
                  : [...current, photo.id]
              );
            }}
            onFavorite={() => {
              void toggleFavorite(photo.id);
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
          />
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1" />

      {loadingMore && (
        <div className="py-6 text-center text-sm text-[var(--muted)]">加载更多...</div>
      )}

      {!hasMore && items.length > 0 && (
        <div className="py-4 text-center text-xs text-[var(--muted)]">已加载全部照片</div>
      )}
    </div>
  );
}
