"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ImageViewer from "@/components/ui/image-viewer";
import { buildMediaViewerNavigationItems } from "@/components/photos/image-viewer-navigation";

type FavoriteItem = {
  id: string;
  originalName: string;
  thumbnailUrl: string;
  previewUrl: string;
  originalUrl: string;
  mimeType: string;
  mediaType: string;
  duration: number | null;
  width: number;
  height: number;
};

const PAGE_SIZE = 24;

export function FavoritesGallery() {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const loadingRef = useRef(false);

  const hasMore = items.length < total;

  const loadPage = useCallback(async (pageNum: number, append = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    if (append) setLoadingMore(true);

    try {
      const response = await fetch(`/api/favorites?page=${pageNum}&pageSize=${PAGE_SIZE}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "加载收藏失败");

      setItems((current) => (append ? [...current, ...(json.data.items ?? [])] : json.data.items ?? []));
      setTotal(json.data.total ?? 0);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载收藏失败");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  async function removeFavorite(photoId: string) {
    try {
      const response = await fetch(`/api/photos/${photoId}/favorite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ favorited: false }),
      });
      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error ?? "取消失败");
      }
      setItems((current) => {
        const next = current.filter((item) => item.id !== photoId);
        // If we lost items and there are more to load, load the next page
        if (next.length < PAGE_SIZE / 2 && hasMore) {
          loadPage(page + 1, true);
        }
        return next;
      });
      setTotal((t) => t - 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "取消失败");
    }
  }

  if (loading) {
    return (
      <div className="noir-glass-panel rounded-2xl p-6 text-[var(--muted)]">
        加载收藏...
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="rounded-2xl border border-red-400/30 bg-red-950/30 p-6 text-[var(--danger)]">
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="noir-glass-panel rounded-2xl p-6 text-[var(--muted)]">
        暂无收藏
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--muted)]">
        共 {total} 项收藏，已加载 {items.length} 项
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((photo) => (
          <article
            key={photo.id}
            className="overflow-hidden rounded-2xl noir-glass-panel transition hover:-translate-y-0.5 hover:border-[var(--border-strong)]"
          >
            {photo.mediaType === "video" || photo.mimeType.startsWith("video/") ? (
              <ImageViewer
                src={photo.thumbnailUrl}
                alt={photo.originalName}
                videoSrc={photo.originalUrl}
                mediaType="video"
                items={buildMediaViewerNavigationItems(items)}
                initialItemId={photo.id}
                imgClassName="aspect-[4/3] w-full object-cover transition duration-300 group-hover/img:scale-[1.02]"
                className="group/img block w-full"
              />
            ) : (
              <ImageViewer
                src={photo.thumbnailUrl}
                alt={photo.originalName}
                previewSrc={photo.mimeType === "image/gif" ? photo.originalUrl : photo.previewUrl}
                items={buildMediaViewerNavigationItems(items)}
                initialItemId={photo.id}
                imgClassName="aspect-[4/3] w-full object-cover transition duration-300 group-hover/img:scale-[1.02]"
                className="group/img block w-full"
              />
            )}
            <div className="space-y-3 p-4">
              <div>
                <h3 className="text-sm font-medium text-[var(--text)]">{photo.originalName}</h3>
                <p className="text-xs text-[var(--muted)]">
                  {photo.width} × {photo.height}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { void removeFavorite(photo.id); }}
                className="inline-flex h-9 items-center justify-center rounded-lg noir-glass-chip px-4 text-sm font-bold text-[var(--text)]"
              >
                取消收藏
              </button>
            </div>
          </article>
        ))}
      </div>

      {loadingMore && (
        <div className="py-4 text-center text-sm text-[var(--muted)]">加载更多...</div>
      )}

      {hasMore && !loadingMore && (
        <div className="py-4 text-center">
          <button
            type="button"
            onClick={() => loadPage(page + 1, true)}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-6 text-sm font-bold text-black transition hover:bg-white"
          >
            加载更多
          </button>
        </div>
      )}

      {!hasMore && items.length > 0 && (
        <div className="py-4 text-center text-xs text-[var(--muted)]">已加载全部收藏</div>
      )}
    </div>
  );
}
