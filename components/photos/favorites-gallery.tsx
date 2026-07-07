"use client";

import { useEffect, useState } from "react";
import ImageViewer from "@/components/ui/image-viewer";

type FavoriteItem = {
  id: string;
  originalName: string;
  thumbnailUrl: string;
  previewUrl: string;
  posterUrl: string | null;
  playbackUrl: string | null;
  mediaType: string;
  mimeType: string;
  width: number;
  height: number;
  durationSeconds: number | null;
  processingStatus: string;
};

function formatDuration(seconds: number | null): string | null {
  if (seconds === null || seconds === undefined) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getProcessingLabel(status: string): string | null {
  switch (status) {
    case "pending":
    case "processing":
      return "处理中";
    case "failed":
      return "暂不可播放";
    default:
      return null;
  }
}

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
    return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--muted)]">加载收藏精选...</div>;
  }

  if (error) {
    return <div className="rounded-2xl border border-red-400/30 bg-red-950/30 p-6 text-[var(--danger)]">{error}</div>;
  }

  if (items.length === 0) {
    return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--muted)]">暂无收藏</div>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const isVideo = item.mediaType === "video";
        const imgSrc = isVideo ? (item.posterUrl || item.thumbnailUrl || "") : (item.thumbnailUrl || item.previewUrl || "");
        const duration = formatDuration(item.durationSeconds);
        const processingLabel = getProcessingLabel(item.processingStatus);

        return (
          <article key={item.id} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition hover:border-white/30">
            <div className="relative">
              {imgSrc ? (
                <ImageViewer
                  src={imgSrc}
                  alt={item.originalName}
                  previewSrc={item.previewUrl || imgSrc}
                  imgClassName="aspect-[4/3] w-full object-cover transition duration-300 group-hover/img:scale-[1.02]"
                  className="group/img block w-full"
                />
              ) : (
                <div className="aspect-[4/3] w-full flex items-center justify-center bg-[#0b0b0b] text-[var(--muted)] text-sm">
                  暂无预览
                </div>
              )}

              {/* Media type badge */}
              <div className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-xs font-medium text-white/80">
                {isVideo ? "视频" : "照片"}
              </div>

              {/* Processing overlay */}
              {isVideo && processingLabel && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <div className="rounded-lg bg-black/80 px-3 py-1.5 text-xs font-medium text-[var(--film)]">
                    {processingLabel}
                  </div>
                </div>
              )}

              {/* Duration badge */}
              {isVideo && duration && (
                <div className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
                  {duration}
                </div>
              )}
            </div>
            <div className="space-y-3 p-4">
              <div>
                <h3 className="text-sm font-medium text-[var(--text)]">{item.originalName}</h3>
                <p className="text-xs text-[var(--muted)]">
                  {item.width > 0 && item.height > 0
                    ? `${item.width} × ${item.height}`
                    : item.mimeType}
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await removeFavorite(item.id);
                }}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-sm font-bold text-[var(--text)]"
              >
                取消收藏
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
