"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TrashItem = {
  id: string;
  originalName: string;
  thumbnailUrl: string;
  mimeType: string;
  mediaType: string;
  uploadedAt: string;
  deletedAt: string | null;
};

const PAGE_SIZE = 24;

export function TrashGallery() {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [clearing, setClearing] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const loadingRef = useRef(false);

  const hasMore = items.length < total;

  const loadPage = useCallback(async (pageNum: number, append = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (append) setLoadingMore(true);

    try {
      const response = await fetch(`/api/trash/photos?page=${pageNum}&pageSize=${PAGE_SIZE}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "加载回收站失败");

      setItems((current) => (append ? [...current, ...(json.data.items ?? [])] : json.data.items ?? []));
      setTotal(json.data.total ?? 0);
      setPage(pageNum);
      setSelectedIds((current) =>
        current.filter((id) =>
          (append ? [...items, ...(json.data.items ?? [])] : json.data.items ?? []).some(
            (item: TrashItem) => item.id === id
          )
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载回收站失败");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [items]);

  useEffect(() => {
    loadPage(1);
  }, [refreshToken]);

  const selectedCount = useMemo(() => selectedIds.length, [selectedIds]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const isAllSelected = useMemo(
    () => items.length > 0 && selectedIds.length === items.length,
    [items, selectedIds]
  );

  function toggleSelectAll() {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((item) => item.id));
    }
  }

  async function restorePhoto(photoId: string) {
    const response = await fetch(`/api/photos/${photoId}/restore`, { method: "POST" });
    if (!response.ok) {
      const json = await response.json();
      throw new Error(json.error ?? "恢复失败");
    }
    setRefreshToken((current) => current + 1);
  }

  async function deleteForever(photoId: string) {
    const response = await fetch(`/api/trash/photos/${photoId}`, { method: "DELETE" });
    if (!response.ok) {
      const json = await response.json();
      throw new Error(json.error ?? "永久删除失败");
    }
    setRefreshToken((current) => current + 1);
  }

  async function batchRestore() {
    if (selectedIds.length === 0) return;
    const response = await fetch("/api/trash/photos/batch-restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoIds: selectedIds }),
    });
    if (!response.ok) {
      const json = await response.json();
      throw new Error(json.error ?? "批量恢复失败");
    }
    setNotice(`已恢复 ${selectedIds.length} 张照片`);
    setSelectedIds([]);
    setRefreshToken((current) => current + 1);
  }

  async function batchDeleteForever() {
    if (selectedIds.length === 0) return;
    const response = await fetch("/api/trash/photos/batch-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoIds: selectedIds }),
    });
    if (!response.ok) {
      const json = await response.json();
      throw new Error(json.error ?? "批量永久删除失败");
    }
    setNotice(`已永久删除 ${selectedIds.length} 张照片`);
    setSelectedIds([]);
    setRefreshToken((current) => current + 1);
  }

  async function clearAll() {
    if (!confirm("确定要清空回收站吗？此操作不可撤销，所有已删除文件将被永久删除。")) return;
    setClearing(true);
    try {
      const response = await fetch("/api/trash/photos/clear", { method: "POST" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "清空失败");
      setNotice(`已清空回收站，永久删除了 ${json.data.cleared} 个文件`);
      setSelectedIds([]);
      setRefreshToken((current) => current + 1);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "清空失败");
    } finally {
      setClearing(false);
    }
  }

  function formatRemainingDays(deletedAt: string | null): string {
    if (!deletedAt) return "";
    const d = new Date(deletedAt);
    const deadline = new Date(d.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = Date.now();
    if (deadline.getTime() <= now) return "已到期";
    const days = Math.ceil((deadline.getTime() - now) / (1000 * 60 * 60 * 24));
    return `剩余 ${days} 天`;
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--muted)]">
        加载回收站...
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
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--muted)]">
        回收站为空
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--muted)]">
            共 {total} 项 · 计划保留 30 天
          </p>
          <div className="flex gap-2">
            {selectedCount > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => { void batchRestore(); }}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-black"
                >
                  批量恢复 ({selectedCount})
                </button>
                <button
                  type="button"
                  onClick={() => { void batchDeleteForever(); }}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--danger)] px-4 text-sm font-bold text-black"
                >
                  批量永久删除 ({selectedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-sm font-bold text-[var(--text)]"
                >
                  取消选择
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-sm font-bold text-[var(--muted)] transition hover:text-[var(--text)]"
                >
                  全选
                </button>
                {total > 0 && (
                  <button
                    type="button"
                    onClick={() => { void clearAll(); }}
                    disabled={clearing}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-red-400/30 px-4 text-sm font-bold text-[var(--danger)] transition hover:bg-red-950/30 disabled:opacity-50"
                  >
                    {clearing ? "清空中..." : "清空回收站"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {notice ? (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((photo) => (
          <article
            key={photo.id}
            className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition hover:border-white/30"
          >
            <div className="relative">
              <img
                src={photo.thumbnailUrl}
                alt={photo.originalName}
                className="aspect-[4/3] w-full object-cover opacity-70 grayscale"
              />
              {photo.mediaType === "video" && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded-full bg-black/60 p-2 backdrop-blur-sm">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  </span>
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedIds((current) =>
                    current.includes(photo.id)
                      ? current.filter((item) => item !== photo.id)
                      : [...current, photo.id]
                  );
                }}
                className={`absolute left-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
                  selectedIdSet.has(photo.id)
                    ? "border-[var(--accent)] bg-[var(--accent)] text-black"
                    : "border-white/35 bg-black/65 text-[var(--text)]"
                }`}
                aria-pressed={selectedIdSet.has(photo.id)}
                aria-label={`选择 ${photo.originalName}`}
              >
                {selectedIdSet.has(photo.id) ? "✓" : "□"}
              </button>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <h3 className="text-sm font-medium text-[var(--text)]">{photo.originalName}</h3>
                <p className="text-xs text-[var(--muted)]">
                  删除于 {photo.deletedAt ? new Date(photo.deletedAt).toLocaleDateString("zh-CN") : "未知"}
                  {" · "}
                  {formatRemainingDays(photo.deletedAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { void restorePhoto(photo.id); }}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-sm font-bold text-[var(--text)]"
                >
                  恢复
                </button>
                <button
                  type="button"
                  onClick={() => { void deleteForever(photo.id); }}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--danger)] px-4 text-sm font-bold text-black"
                >
                  永久删除
                </button>
              </div>
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
        <div className="py-4 text-center text-xs text-[var(--muted)]">已加载全部回收站内容</div>
      )}
    </div>
  );
}
