"use client";

import { useEffect, useMemo, useState } from "react";

type TrashItem = {
  id: string;
  originalName: string;
  thumbnailUrl: string;
  mimeType: string;
  mediaType: string;
  uploadedAt: string;
  deletedAt: string | null;
};

export function TrashGallery() {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const response = await fetch("/api/trash/photos?page=1&pageSize=24");
        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.error ?? "Failed to load trash");
        }
        if (mounted) {
          setItems(json.data.items);
          setSelectedIds((current) => current.filter((id) => json.data.items.some((item: TrashItem) => item.id === id)));
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load trash");
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
    const response = await fetch(`/api/photos/${photoId}/restore`, {
      method: "POST"
    });

    if (!response.ok) {
      const json = await response.json();
      throw new Error(json.error ?? "Failed to restore photo");
    }

    setRefreshToken((current) => current + 1);
  }

  async function deleteForever(photoId: string) {
    const response = await fetch(`/api/trash/photos/${photoId}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      const json = await response.json();
      throw new Error(json.error ?? "Failed to delete photo permanently");
    }

    setRefreshToken((current) => current + 1);
  }

  async function batchRestore() {
    if (selectedIds.length === 0) return;

    const response = await fetch("/api/trash/photos/batch-restore", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ photoIds: selectedIds })
    });

    if (!response.ok) {
      const json = await response.json();
      throw new Error(json.error ?? "Failed to restore photos");
    }

    setNotice(`已恢复 ${selectedIds.length} 张照片`);
    setSelectedIds([]);
    setRefreshToken((current) => current + 1);
  }

  async function batchDeleteForever() {
    if (selectedIds.length === 0) return;

    const response = await fetch("/api/trash/photos/batch-delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ photoIds: selectedIds })
    });

    if (!response.ok) {
      const json = await response.json();
      throw new Error(json.error ?? "Failed to delete photos permanently");
    }

    setNotice(`已永久删除 ${selectedIds.length} 张照片`);
    setSelectedIds([]);
    setRefreshToken((current) => current + 1);
  }

  if (loading) {
    return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--muted)]">加载回收站...</div>;
  }

  if (error) {
    return <div className="rounded-2xl border border-red-400/30 bg-red-950/30 p-6 text-[var(--danger)]">{error}</div>;
  }

  if (items.length === 0) {
    return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--muted)]">回收站为空</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        {selectedCount > 0 ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-black px-4 py-3">
            <span className="text-sm font-medium text-[var(--text)]">已选择 {selectedCount} 张</span>
            <button
              type="button"
              onClick={async () => {
                await batchRestore();
              }}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-black"
            >
              批量恢复
            </button>
            <button
              type="button"
              onClick={async () => {
                await batchDeleteForever();
              }}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--danger)] px-4 text-sm font-bold text-black"
            >
              批量永久删除
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
          <div className="flex items-center gap-3">
            <p className="text-sm text-[var(--muted)]">选择后可批量恢复或永久删除。</p>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-sm font-bold text-[var(--muted)] transition hover:text-[var(--text)]"
            >
              全选
            </button>
          </div>
        )}
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
              <img src={photo.thumbnailUrl} alt={photo.originalName} className="aspect-[4/3] w-full object-cover opacity-70 grayscale" />
              {photo.mediaType === "video" && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded-full bg-black/60 p-2 backdrop-blur-sm">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21" /></svg>
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
                <p className="text-xs text-[var(--muted)]">删除时间 {photo.deletedAt ?? "未知"}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await restorePhoto(photo.id);
                  }}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-sm font-bold text-[var(--text)]"
                >
                  恢复
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteForever(photo.id);
                  }}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--danger)] px-4 text-sm font-bold text-black"
                >
                  永久删除
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
