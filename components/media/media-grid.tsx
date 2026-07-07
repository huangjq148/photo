"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MediaCard, type MediaCardItem, type MediaCardActions } from "@/components/media/media-card";
import { MediaViewer } from "@/components/media/media-viewer";

type MediaGroup = {
  label: string;
  items: MediaCardItem[];
};

type MediaFilter = "all" | "image" | "video";

type MediaGridProps = {
  groups: MediaGroup[];
  loading?: boolean;
  emptyMessage?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  actions?: MediaCardActions;
};

export function MediaGrid({
  groups,
  loading = false,
  emptyMessage = "暂无回忆",
  onLoadMore,
  hasMore = false,
  actions,
}: MediaGridProps) {
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [viewerMedia, setViewerMedia] = useState<MediaCardItem | null>(null);

  const filteredGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (filter === "all") return true;
        return item.mediaType === filter;
      }),
    }))
    .filter((group) => group.items.length > 0);

  const hasContent = filteredGroups.length > 0;

  const handleCloseViewer = useCallback(() => {
    setViewerMedia(null);
  }, []);

  // Close viewer on Escape
  useEffect(() => {
    if (!viewerMedia) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCloseViewer();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [viewerMedia, handleCloseViewer]);

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-6 flex items-center gap-2">
        {(["all", "image", "video"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filter === f
                ? "bg-[var(--accent)] text-black"
                : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            {f === "all" ? "全部" : f === "image" ? "照片" : "视频"}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading && !hasContent && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      )}

      {!loading && !hasContent && (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-[var(--muted)]">{emptyMessage}</p>
        </div>
      )}

      {filteredGroups.map((group) => (
        <section key={group.label} className="mb-8">
          <h2 className="mb-3 text-lg font-bold text-[var(--text)]">{group.label}</h2>
          <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 xl:columns-5">
            {group.items.map((item) => (
              <div
                key={item.id}
                onClick={() => setViewerMedia(item)}
                className="cursor-pointer"
              >
                <MediaCard media={item} actions={actions} />
              </div>
            ))}
          </div>
        </section>
      ))}

      {hasMore && (
        <div className="flex justify-center py-8">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loading}
            className="rounded-lg bg-[var(--surface)] px-6 py-2 text-sm font-medium text-[var(--text)] hover:bg-white/[0.08] disabled:opacity-50"
          >
            {loading ? "加载中..." : "加载更多"}
          </button>
        </div>
      )}

      {/* Viewer modal */}
      {viewerMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={handleCloseViewer}
        >
          <button
            type="button"
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-black/60 text-white backdrop-blur transition hover:bg-black"
            onClick={handleCloseViewer}
            aria-label="关闭"
          >
            ✕
          </button>
          <div className="max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <MediaViewer
              id={viewerMedia.id}
              mediaType={viewerMedia.mediaType}
              previewUrl={viewerMedia.previewUrl}
              posterUrl={viewerMedia.posterUrl}
              playbackUrl={viewerMedia.playbackUrl}
              originalName={viewerMedia.originalName}
              width={viewerMedia.width}
              height={viewerMedia.height}
              durationSeconds={viewerMedia.durationSeconds}
              processingStatus={viewerMedia.processingStatus}
            />
            <p className="mt-3 text-center text-sm text-white/70">{viewerMedia.originalName}</p>
          </div>
        </div>
      )}
    </div>
  );
}
