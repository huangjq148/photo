"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check, FolderPlus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useMessage } from "@/components/ui/message";
import type { BatchMutationResult } from "@/lib/api/batch-result";

type AlbumItem = {
  id: string;
  name: string;
  description: string | null;
  photoCount: number;
  memberCount: number;
  isDefault: boolean;
  isImmutable: boolean;
  role: string;
};

type BatchAddPhotosToAlbumModalProps = {
  open: boolean;
  photoIds: string[];
  photoLabel: string;
  onClose: () => void;
  onAdded?: () => void;
  onResult?: (result: BatchMutationResult) => void;
  onBusyChange?: (busy: boolean) => void;
};

export function BatchAddPhotosToAlbumModal({
  open,
  photoIds,
  photoLabel,
  onClose,
  onAdded,
  onResult,
  onBusyChange,
}: BatchAddPhotosToAlbumModalProps) {
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAlbumId, setSavingAlbumId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const message = useMessage();

  const photoCount = useMemo(() => photoIds.length, [photoIds]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;

    async function loadAlbums() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/albums", { cache: "no-store" });
        const json = await response.json();

        if (!response.ok) {
          throw new Error(json.error ?? "加载相册失败");
        }

        if (active) {
          setAlbums((json.data ?? []) as AlbumItem[]);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "加载相册失败");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadAlbums();

    return () => {
      active = false;
    };
  }, [open]);

  async function addToAlbum(album: AlbumItem) {
    if (savingAlbumId) {
      return;
    }

    setSavingAlbumId(album.id);
    onBusyChange?.(true);
    setError(null);

    try {
      const response = await fetch(`/api/albums/${album.id}/photos`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photoIds }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error ?? "批量添加失败");
      }

      onResult?.(json.data as BatchMutationResult);
      message.success(`已添加 ${photoCount} 张到「${album.name}」`);
      onAdded?.();
      onClose();
    } catch (err) {
      const text = err instanceof Error ? err.message : "批量添加失败";
      setError(text);
      message.error(text);
    } finally {
      setSavingAlbumId(null);
      onBusyChange?.(false);
    }
  }

  return (
    <Modal
      open={open}
      size="lg"
      title="批量添加到相册"
      description={photoLabel}
      onClose={onClose}
    >
      <div className="space-y-4">
        <p className="text-sm text-[var(--muted)]">
          已选择 {photoCount} 张照片，选择目标相册后会一次性添加进去。
        </p>

        {loading ? (
          <div className="py-10 text-center text-sm text-[var(--muted)]">加载相册...</div>
        ) : error ? (
          <div className="rounded-xl border border-red-400/20 bg-red-950/20 px-4 py-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        ) : albums.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-black/20 px-4 py-6 text-center text-sm text-[var(--muted)]">
            你还没有可用相册
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {albums.map((album) => {
              const busy = savingAlbumId === album.id;
              return (
                <button
                  key={album.id}
                  type="button"
                  onClick={() => void addToAlbum(album)}
                  disabled={!!savingAlbumId}
                  className="group rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)]/70 p-4 text-left transition hover:border-[var(--border-strong)] hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--text)]">{album.name}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {album.description?.trim() || "暂无描述"}
                      </p>
                    </div>
                    {busy ? (
                      <Check aria-hidden="true" size={16} className="mt-0.5 text-[var(--accent)]" />
                    ) : (
                      <FolderPlus aria-hidden="true" size={16} className="mt-0.5 text-[var(--muted)] transition group-hover:text-[var(--text)]" />
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs text-[var(--muted)]">
                    <span>{album.photoCount} 张照片</span>
                    <span>·</span>
                    <span>{album.memberCount} 位成员</span>
                    {album.isDefault ? (
                      <>
                        <span>·</span>
                        <span>默认相册</span>
                      </>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
