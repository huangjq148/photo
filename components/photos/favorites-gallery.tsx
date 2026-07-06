"use client";

import { useEffect, useState } from "react";
import ImageViewer from "@/components/ui/image-viewer";

type FavoriteItem = {
  id: string;
  originalName: string;
  thumbnailUrl: string;
  previewUrl: string;
  width: number;
  height: number;
};

export function FavoritesGallery() {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const response = await fetch("/api/favorites");
        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.error ?? "Failed to load favorites");
        }
        if (mounted) {
          setItems(json.data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load favorites");
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
  }, []);

  async function removeFavorite(photoId: string) {
    const response = await fetch(`/api/photos/${photoId}/favorite`, {
      method: "DELETE"
    });
    if (!response.ok) {
      const json = await response.json();
      throw new Error(json.error ?? "Failed to update favorite");
    }
    setItems((current) => current.filter((item) => item.id !== photoId));
  }

  if (loading) {
    return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--muted)]">加载收藏...</div>;
  }

  if (error) {
    return <div className="rounded-2xl border border-red-400/30 bg-red-950/30 p-6 text-[var(--danger)]">{error}</div>;
  }

  if (items.length === 0) {
    return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--muted)]">暂无收藏</div>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((photo) => (
        <article key={photo.id} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition hover:border-white/30">
          <ImageViewer
            src={photo.thumbnailUrl}
            alt={photo.originalName}
            previewSrc={photo.previewUrl}
            imgClassName="aspect-[4/3] w-full object-cover transition duration-300 group-hover/img:scale-[1.02]"
            className="group/img block w-full"
          />
          <div className="space-y-3 p-4">
            <div>
              <h3 className="text-sm font-medium text-[var(--text)]">{photo.originalName}</h3>
              <p className="text-xs text-[var(--muted)]">
                {photo.width} × {photo.height}
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await removeFavorite(photo.id);
              }}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-sm font-bold text-[var(--text)]"
            >
              取消收藏
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
