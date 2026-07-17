"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Ellipsis } from "lucide-react";
import ImageViewer from "@/components/ui/image-viewer";
import { Menu } from "@/components/ui/menu";
import { useMessage } from "@/components/ui/message";
import { BatchAddPhotosToAlbumModal } from "@/components/albums/batch-add-photos-to-album-modal";
import { buildMediaViewerNavigationItems } from "@/components/photos/image-viewer-navigation";
import { TakenAtEditorModal } from "@/components/photos/taken-at-editor-modal";
import { getMediaDeleteActions } from "@/lib/media/delete-actions";
import {
  getTimelineEffectiveDate,
  groupTimelinePhotos,
  type TimelineGroupMode,
  type TimelinePhotoItem,
} from "@/lib/media/timeline";
import { resolveDisplayName } from "@/lib/media/display-name";
import { PhotoGallerySizeControl, type PhotoSize } from "@/components/photos/photo-gallery-size-control";
import { GalleryGrid } from "@/components/photos/gallery-grid";
import { loadGalleryPreferences, updateGalleryPreferences } from "@/lib/client/gallery-preferences";

const PAGE_SIZE = 24;

function formatTimelineMoment(date: Date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours().toString().padStart(2, "0");
  const minute = date.getMinutes().toString().padStart(2, "0");
  return `${month}月${day}日 ${hour}:${minute}`;
}

function buildPhotoSummary(items: TimelinePhotoItem[]) {
  if (items.length === 0) {
    return "未选择任何媒体";
  }

  if (items.length === 1) {
    return resolveDisplayName(items[0]?.displayName ?? null, items[0]?.originalName ?? "");
  }

  return `已选择 ${items.length} 项媒体`;
}

type TimelinePhotoActionsProps = {
  photoName: string;
  selected: boolean;
  downloadHref?: string;
  onToggleSelection: () => void;
  onDownload?: () => void;
  onEditTakenAt: () => void;
  onAddToAlbum: () => void;
};

export function buildTimelinePhotoActionItems({
  downloadHref,
  onDownload,
  onEditTakenAt,
  onAddToAlbum,
}: Pick<TimelinePhotoActionsProps, "downloadHref" | "onDownload" | "onEditTakenAt" | "onAddToAlbum">) {
  return [
    ...(downloadHref
      ? [
          {
            key: "download",
            label: "下载",
            onSelect:
              onDownload ??
              (() => {
                window.location.href = downloadHref;
              }),
          },
        ]
      : []),
    { key: "edit-taken-at", label: "修改时间", onSelect: onEditTakenAt },
    { key: "add-to-album", label: "添加到相册", onSelect: onAddToAlbum },
  ];
}

export function TimelinePhotoActions({
  photoName,
  selected,
  downloadHref,
  onToggleSelection,
  onDownload,
  onEditTakenAt,
  onAddToAlbum,
}: TimelinePhotoActionsProps) {
  const menuItems = buildTimelinePhotoActionItems({
    downloadHref,
    onDownload,
    onEditTakenAt,
    onAddToAlbum,
  });

  return (
    <div data-timeline-photo-actions="">
      <div
        data-photo-select-control=""
        className="absolute left-3 top-3 z-20 opacity-100 transition [@media(hover:hover)_and_(pointer:fine)]:opacity-0 group-hover:[@media(hover:hover)_and_(pointer:fine)]:opacity-100 group-focus-within:[@media(hover:hover)_and_(pointer:fine)]:opacity-100"
      >
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleSelection();
          }}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur transition sm:h-11 sm:w-11 ${
            selected ? "border-blue-500 bg-blue-500 text-white" : "noir-glass-chip text-[var(--text)]"
          }`}
          aria-pressed={selected}
          aria-label={`${selected ? "取消选择" : "选择"} ${photoName}`}
        >
          <Check aria-hidden="true" size={14} className={selected ? "opacity-100" : "opacity-45"} />
        </button>
      </div>

      <div className="absolute right-3 top-3 z-20">
        <Menu
          label="更多操作"
          triggerVariant="plain"
          triggerClassName="h-11 w-11 p-0"
          triggerContent={
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white/90 shadow-[0_1px_2px_rgba(0,0,0,0.35)] backdrop-blur-sm">
              <Ellipsis aria-hidden="true" size={15} />
            </span>
          }
          items={menuItems.map((item) => ({
            key: item.key,
            label: item.label,
            onSelect: item.onSelect,
          }))}
        />
      </div>
    </div>
  );
}

export function TimelineGallery() {
  const [items, setItems] = useState<TimelinePhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupMode, setGroupMode] = useState<TimelineGroupMode>("day");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);
  const [batchAddOpen, setBatchAddOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<TimelinePhotoItem | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const message = useMessage();
  const deleteAction = useMemo(() => getMediaDeleteActions({ surface: "timeline" }), []);
  const [photoSize, setPhotoSize] = useState<PhotoSize>(() => loadGalleryPreferences().photoSize);

  useEffect(() => {
    updateGalleryPreferences({ photoSize });
  }, [photoSize]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedItems = useMemo(
    () => items.filter((item) => selectedIdSet.has(item.id)),
    [items, selectedIdSet]
  );
  const selectedCount = selectedItems.length;
  const groupedItems = useMemo(() => groupTimelinePhotos(items, groupMode), [items, groupMode]);
  const navigationItems = useMemo(() => buildMediaViewerNavigationItems(items), [items]);
  const isAllSelected = items.length > 0 && selectedCount === items.length;

  const loadFirstPage = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/timeline?pageSize=${PAGE_SIZE}`, { cache: "no-store" });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error ?? "加载时间线失败");
      }

      const data = json.data as {
        items?: TimelinePhotoItem[];
        hasMore?: boolean;
        nextCursor?: string | null;
      };

      setItems(data.items ?? []);
      setHasMore(!!data.hasMore);
      setNextCursor(data.nextCursor ?? null);
      setSelectedIds((current) =>
        current.filter((id) => (data.items ?? []).some((item) => item.id === id))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载时间线失败");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage, refreshToken]);

  const loadNextPage = useCallback(async () => {
    if (!hasMore || loadingMore || !nextCursor || loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    setLoadingMore(true);

    try {
      const params = new URLSearchParams({
        pageSize: String(PAGE_SIZE),
        cursor: nextCursor,
      });
      const response = await fetch(`/api/timeline?${params.toString()}`, { cache: "no-store" });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error ?? "加载更多失败");
      }

      const data = json.data as {
        items?: TimelinePhotoItem[];
        hasMore?: boolean;
        nextCursor?: string | null;
      };

      setItems((current) => [...current, ...(data.items ?? [])]);
      setHasMore(!!data.hasMore);
      setNextCursor(data.nextCursor ?? null);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载更多失败");
    } finally {
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [hasMore, loadingMore, message, nextCursor]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || loading || loadingMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadNextPage();
        }
      },
      { rootMargin: "240px" }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading, loadingMore, loadNextPage]);

  function toggleSelection(itemId: string) {
    setSelectedIds((current) =>
      current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId]
    );
  }

  function toggleSelectAll() {
    setSelectedIds(isAllSelected ? [] : items.map((item) => item.id));
  }

  async function deleteSelected() {
    if (selectedItems.length === 0) {
      return;
    }

    try {
      const response = await fetch("/api/photos/batch-trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds: selectedItems.map((item) => item.id) }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error ?? "删除失败");
      }

      const result = json.data as { succeededIds?: string[]; failed?: Array<{ id: string; message: string }> };
      const failedIds = result.failed?.map((item) => item.id) ?? [];

      if (failedIds.length > 0) {
        setSelectedIds(failedIds);
        message.error(result.failed?.[0]?.message ?? "部分删除失败");
      } else {
        setSelectedIds([]);
        message.success(deleteAction.successMessage, {
          label: "撤销",
          onSelect: async () => {
            await Promise.all(
              (result.succeededIds ?? []).map(async (photoId) => {
                const restoreResponse = await fetch(`/api/photos/${photoId}/restore`, { method: "POST" });
                const restoreJson = await restoreResponse.json().catch(() => ({}));
                if (!restoreResponse.ok) {
                  throw new Error(restoreJson.error ?? "撤销失败");
                }
              }),
            );
            setRefreshToken((current) => current + 1);
          },
        });
      }

      if ((result.succeededIds?.length ?? 0) > 0) {
        setRefreshToken((current) => current + 1);
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : "删除失败");
    }
  }

  async function saveTakenAt(photoId: string, nextTakenAt: string | null) {
    const response = await fetch(`/api/photos/${photoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ takenAt: nextTakenAt }),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(json.error ?? "拍摄时间保存失败");
    }

    const updated = json.data as { id: string; takenAt: string | null };
    setItems((current) =>
      current.map((item) =>
        item.id === updated.id
          ? {
              ...item,
              takenAt: updated.takenAt,
              effectiveAt: updated.takenAt ?? item.uploadedAt,
            }
          : item
      )
    );
    setRefreshToken((current) => current + 1);
    message.success(updated.takenAt ? "拍摄时间已更新" : "拍摄时间已清除");
  }

  if (loading) {
    return <div className="noir-glass-panel rounded-2xl p-6 text-[var(--muted)]">加载时间线...</div>;
  }

  if (error && items.length === 0) {
    return <div className="rounded-2xl border border-red-400/30 bg-red-950/30 p-6 text-[var(--danger)]">{error}</div>;
  }

  if (items.length === 0) {
    return <div className="noir-glass-panel rounded-2xl p-6 text-[var(--muted)]">暂无可浏览的时间线内容</div>;
  }

  return (
    <div className="space-y-5">
      <div className="noir-glass-panel rounded-[2rem] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-[var(--muted)]">
                共 {items.length} 项，{hasMore ? "继续向下滚动可加载更多" : "已加载全部内容"}
              </p>
              <PhotoGallerySizeControl value={photoSize} onChange={setPhotoSize} compact />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <nav className="inline-flex h-10 items-center rounded-lg noir-glass-chip p-1">
              {([
                ["day", "按日"],
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

            {selectedCount > 0 ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl noir-glass-chip px-3 py-2">
                <span className="text-sm font-medium text-[var(--text)]">已选择 {selectedCount} 项</span>
                <button
                  type="button"
                  onClick={() => setBatchAddOpen(true)}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-black"
                >
                  批量添加到相册
                </button>
                <button
                  type="button"
                  onClick={() => void deleteSelected()}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--danger)] px-4 text-sm font-bold text-black"
                >
                  {deleteAction.label}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-sm font-bold text-[var(--text)]"
                >
                  取消选择
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-sm font-bold text-[var(--text)]"
              >
                {isAllSelected ? "取消全选" : "全选当前页"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {Array.from(groupedItems.entries()).map(([label, group]) => (
          <section key={label} className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-[var(--text)]">{label}</h2>
              <p className="text-xs text-[var(--muted)]">{group.length} 项</p>
            </div>

            <GalleryGrid photoSize={photoSize}>
              {group.map((photo) => {
                const isVideo = photo.mediaType === "video" || photo.mimeType.startsWith("video/");
                const displayName = resolveDisplayName(photo.displayName, photo.originalName);
                const effectiveAt = getTimelineEffectiveDate(photo);

                return (
                  <article
                    key={photo.id}
                    className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)]/80 transition hover:border-[var(--border-strong)]"
                  >
                    <div className="relative">
                      <ImageViewer
                        src={photo.thumbnailUrl}
                        alt={displayName}
                        previewSrc={isVideo ? photo.previewUrl : photo.mimeType === "image/gif" ? photo.originalUrl : photo.previewUrl}
                        videoSrc={isVideo ? photo.originalUrl : undefined}
                        mediaType={isVideo ? "video" : "image"}
                        items={navigationItems}
                        initialItemId={photo.id}
                        className="group/img block w-full"
                        imgClassName="aspect-[4/3] w-full object-cover transition duration-300 group-hover/img:scale-[1.02]"
                      />

                      <TimelinePhotoActions
                        photoName={displayName}
                        selected={selectedIdSet.has(photo.id)}
                        downloadHref={`/api/photos/${photo.id}/download`}
                        onToggleSelection={() => toggleSelection(photo.id)}
                        onEditTakenAt={() => setEditingPhoto(photo)}
                        onAddToAlbum={() => {
                          setSelectedIds((current) =>
                            current.includes(photo.id) ? current : [...current, photo.id]
                          );
                          setBatchAddOpen(true);
                        }}
                      />
                    </div>

                    <div className="space-y-2 p-4">
                      <div>
                        <h3 className="truncate text-sm font-semibold text-[var(--text)]">{displayName}</h3>
                        <p className="truncate text-xs text-[var(--muted)]">{photo.albumName}</p>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
                        <span>{formatTimelineMoment(effectiveAt)}</span>
                        <span>{photo.width} × {photo.height}</span>
                        {photo.isFavorited ? <span>已收藏</span> : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </GalleryGrid>
          </section>
        ))}
      </div>

      <div ref={sentinelRef} className="h-1" />

      {loadingMore ? (
        <div className="py-6 text-center text-sm text-[var(--muted)]">加载更多...</div>
      ) : null}

      {!hasMore ? (
        <div className="py-4 text-center text-xs text-[var(--muted)]">已加载全部时间线内容</div>
      ) : null}

      <BatchAddPhotosToAlbumModal
        open={batchAddOpen}
        photoIds={selectedItems.map((item) => item.id)}
        photoLabel={buildPhotoSummary(selectedItems)}
        onClose={() => setBatchAddOpen(false)}
        onAdded={() => {
          setBatchAddOpen(false);
          setRefreshToken((current) => current + 1);
        }}
      />

      <TakenAtEditorModal
        open={!!editingPhoto}
        photoName={editingPhoto ? resolveDisplayName(editingPhoto.displayName, editingPhoto.originalName) : ""}
        currentTakenAt={editingPhoto?.takenAt ?? null}
        uploadedAt={editingPhoto?.uploadedAt ?? ""}
        onClose={() => setEditingPhoto(null)}
        onSave={async (takenAt) => {
          if (!editingPhoto) return;
          await saveTakenAt(editingPhoto.id, takenAt);
          setEditingPhoto(null);
        }}
      />
    </div>
  );
}
