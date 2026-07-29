"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState } from "react";
import { Check, ImageOff, Loader2, Search, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useMessage } from "@/components/ui/message";
import { useGalleryQuery } from "@/hooks/use-gallery-query";
import { useSelection } from "@/hooks/use-selection";
import type { BatchMutationResult } from "@/lib/api/batch-result";

type PhotoItem = {
  id: string;
  originalName: string;
  thumbnailUrl: string;
};

type AddPhotosModalProps = {
  open?: boolean;
  currentAlbumId: string;
  onClose: () => void;
  onAdded?: () => void;
};

const PAGE_SIZE = 24;

async function fetchDefaultAlbumId() {
  const response = await fetch("/api/albums/default", { cache: "no-store" });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error ?? "获取默认相册失败");
  }
  return json.data.defaultAlbumId as string;
}

export function buildAddPhotosRequestUrl({
  albumId,
  currentAlbumId,
  pageSize,
  query,
  cursor,
}: {
  albumId: string;
  currentAlbumId: string;
  pageSize: number;
  query?: string;
  cursor?: string | null;
}) {
  const params = new URLSearchParams();
  params.set("pageSize", String(pageSize));
  params.set("excludeAlbumId", currentAlbumId);

  if (query?.trim()) {
    params.set("keyword", query.trim());
  }

  if (cursor) {
    params.set("cursor", cursor);
  }

  return `/api/albums/${albumId}/photos?${params.toString()}`;
}

export function reconcileFailedSelection(
  selectedIds: Iterable<string>,
  result: BatchMutationResult,
) {
  const selected = new Set(selectedIds);
  return result.failed.map((item) => item.id).filter((id) => selected.has(id));
}

function AddPhotoTile({
  photo,
  selected,
  onToggle,
}: {
  photo: PhotoItem;
  selected: boolean;
  onToggle: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [photo.thumbnailUrl]);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      aria-label={`${selected ? "取消选择" : "选择"} ${photo.originalName}`}
      className={`group relative min-w-0 overflow-hidden rounded-xl border text-left transition ${
        selected
          ? "border-[var(--film)] ring-2 ring-[var(--film)]/45"
          : "border-[var(--border)] hover:border-white/30"
      }`}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[var(--surface-strong)] sm:aspect-[4/3]">
        {imageFailed ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center text-[var(--muted)]">
            <ImageOff aria-hidden="true" size={22} />
            <span className="text-[11px]">预览不可用</span>
          </div>
        ) : (
          <img
            src={photo.thumbnailUrl}
            alt={photo.originalName}
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-2 pb-2 pt-6">
        <p className="truncate text-xs text-white">{photo.originalName}</p>
      </div>
      {selected ? (
        <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-black shadow-lg">
          <Check aria-hidden="true" size={16} strokeWidth={3} />
        </div>
      ) : null}
    </button>
  );
}

export function AddPhotosModal({ open = true, currentAlbumId, onClose, onAdded }: AddPhotosModalProps) {
  const [sourceAlbumId, setSourceAlbumId] = useState<string | null>(null);
  const [items, setItems] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [committedQuery, setCommittedQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const message = useMessage();
  const {
    selectedIds,
    size: selectedCount,
    toggle: toggleSelection,
    clear: clearSelection,
    retainOnly: retainOnlySelection,
  } = useSelection();
  const query = useGalleryQuery({
    onCommit: setCommittedQuery,
  });
  const hasMore = !!nextCursor;
  const canLoadMore = !!sourceAlbumId && !!nextCursor && !loading && !loadingMore;

  useEffect(() => {
    if (!open) {
      setSourceAlbumId(null);
      setItems([]);
      setNextCursor(null);
      setError(null);
      setLoading(true);
      setLoadingMore(false);
      setCommittedQuery("");
      clearSelection();
      return;
    }

    let active = true;

    async function loadDefaultAlbum() {
      try {
        setLoading(true);
        setError(null);
        clearSelection();
        const defaultAlbumId = await fetchDefaultAlbumId();
        if (!active) {
          return;
        }

        setSourceAlbumId(defaultAlbumId);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "加载照片失败");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadDefaultAlbum();

    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!sourceAlbumId || !open) {
      return;
    }

    const albumId = sourceAlbumId;
    let active = true;

    async function reloadForQuery() {
      try {
        setLoading(true);
        setError(null);
        clearSelection();
        const response = await fetch(buildAddPhotosRequestUrl({
          albumId,
          currentAlbumId,
          pageSize: PAGE_SIZE,
          query: committedQuery,
        }), {
          cache: "no-store",
        });
        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.error ?? "加载照片失败");
        }

        if (!active) {
          return;
        }

        setItems((json.data?.items ?? []) as PhotoItem[]);
        setNextCursor(json.data?.nextCursor ?? null);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "加载照片失败");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void reloadForQuery();

    return () => {
      active = false;
    };
  }, [clearSelection, committedQuery, currentAlbumId, open, sourceAlbumId]);

  async function loadMore() {
    if (!sourceAlbumId || !hasMore || loadingMore || !nextCursor) {
      return;
    }

    const albumId = sourceAlbumId;
    setLoadingMore(true);
    try {
      const response = await fetch(buildAddPhotosRequestUrl({
        albumId,
        currentAlbumId,
        pageSize: PAGE_SIZE,
        query: committedQuery,
        cursor: nextCursor,
      }), {
        cache: "no-store",
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "加载更多失败");
      }

      setItems((current) => [...current, ...((json.data?.items ?? []) as PhotoItem[])]);
      setNextCursor(json.data?.nextCursor ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载更多失败");
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleAdd() {
    if (selectedCount === 0) {
      return;
    }

    setAdding(true);
    setError(null);

    try {
      const response = await fetch(`/api/albums/${currentAlbumId}/photos`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photoIds: Array.from(selectedIds) }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error ?? "添加失败");
      }

      const result = json.data as BatchMutationResult;
      const failedIds = reconcileFailedSelection(selectedIds, result);
      const succeededCount = result.succeededIds.length;

      if (failedIds.length > 0) {
        retainOnlySelection(failedIds);
        setItems((current) => current.filter((item) => !result.succeededIds.includes(item.id)));
        message.error(`已添加 ${succeededCount} 张，${failedIds.length} 张失败`);
        onAdded?.();
        return;
      }

      clearSelection();
      message.success(`已添加 ${succeededCount} 张照片`);
      onAdded?.();
      onClose();
    } catch (err) {
      const text = err instanceof Error ? err.message : "添加失败";
      setError(text);
      message.error(text);
    } finally {
      setAdding(false);
    }
  }

  return (
    <Modal
      open={open}
      size="xl"
      title="从全部照片中添加"
      description="选择要添加到当前相册的照片"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3 bg-[var(--surface)]">
          <div className="min-w-0">
            <p className="truncate text-sm text-[var(--muted)]">
              {selectedCount > 0 ? `已选择 ${selectedCount} 张` : "点击照片选择"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={adding || selectedCount === 0}
            className="inline-flex h-11 min-w-28 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] px-6 text-sm font-bold text-black transition hover:bg-white disabled:border disabled:border-[var(--border)] disabled:bg-[var(--surface-strong)] disabled:text-[var(--muted)]"
          >
            {adding ? "添加中..." : `添加 ${selectedCount || ""}`.trim()}
          </button>
        </div>
      }
    >
      <div className="space-y-3 sm:space-y-4">
        <div>
          <label className="block rounded-xl border border-[var(--border)] bg-black/25 transition focus-within:border-[var(--film)] focus-within:ring-2 focus-within:ring-[var(--film)]/15">
            <span className="sr-only">搜索全部照片</span>
            <div className="flex min-h-11 items-center gap-2 px-4">
              <Search aria-hidden="true" size={16} className="text-[var(--muted)]" />
              <input
                value={query.searchValue}
                onChange={(event) => query.setSearchValue(event.target.value)}
                onCompositionStart={query.handleCompositionStart}
                onCompositionEnd={query.handleCompositionEnd}
                placeholder="搜索全部照片"
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
              />
              {query.searchValue ? (
                <button
                  type="button"
                  onClick={query.clearSearch}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-white/[0.08] hover:text-[var(--text)]"
                  aria-label="清空搜索"
                >
                  <X aria-hidden="true" size={14} />
                </button>
              ) : null}
            </div>
          </label>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-[var(--muted)]">加载照片...</div>
        ) : error ? (
          <div className="rounded-xl border border-red-400/20 bg-red-950/20 px-4 py-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-[var(--muted)]">全部照片中暂无可添加的照片</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4">
              {items.map((photo) => {
                const selected = selectedIds.has(photo.id);
                return (
                  <AddPhotoTile
                    key={photo.id}
                    photo={photo}
                    selected={selected}
                    onToggle={() => toggleSelection(photo.id)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {hasMore || loadingMore ? (
          <div className="flex items-center justify-center pt-1">
          <button
            type="button"
            onClick={() => {
              void loadMore();
            }}
            disabled={!canLoadMore}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--border)] px-5 text-sm font-bold text-[var(--text)] transition hover:border-white/35 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <Loader2 aria-hidden="true" size={14} className="mr-2 animate-spin" />
                正在加载
              </>
            ) : (
              "加载更多"
            )}
          </button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
