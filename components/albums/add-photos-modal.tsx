"use client";

import React from "react";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useMessage } from "@/components/ui/message";

type PhotoItem = {
  id: string;
  originalName: string;
  thumbnailUrl: string;
};

type AddPhotosModalProps = {
  albumId: string;
  onClose: () => void;
  onAdded: () => void;
};

export function AddPhotosModal({ albumId, onClose, onAdded }: AddPhotosModalProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const message = useMessage();

  useEffect(() => {
    void loadPhotos();
  }, []);

  async function loadPhotos() {
    try {
      setLoading(true);
      // Get default album ID first
      const defaultRes = await fetch("/api/albums/default");
      const defaultJson = await defaultRes.json();
      if (!defaultRes.ok) throw new Error(defaultJson.error ?? "获取默认相册失败");

      const defaultAlbumId: string = defaultJson.data.defaultAlbumId;

      // Fetch photos from default album
      const photosRes = await fetch(`/api/albums/${defaultAlbumId}/photos?page=1&pageSize=50`);
      const photosJson = await photosRes.json();
      if (!photosRes.ok) throw new Error(photosJson.error ?? "加载照片失败");

      setPhotos(photosJson.data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载照片失败");
    } finally {
      setLoading(false);
    }
  }

  function togglePhoto(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleAdd() {
    if (selectedIds.size === 0) return;

    setAdding(true);
    setError(null);

    try {
      const response = await fetch(`/api/albums/${albumId}/photos`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photoIds: Array.from(selectedIds) }),
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error ?? "添加失败");
      }

      message.success(`已添加 ${selectedIds.size} 项`);
      setSelectedIds(new Set());
      onAdded();
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
      open
      size="xl"
      title="从全部照片中添加"
      description="选择要添加到当前相册的照片"
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-[var(--muted)]">
              {selectedIds.size > 0 ? `已选择 ${selectedIds.size} 张` : "点击照片选择"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={adding || selectedIds.size === 0}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-6 text-sm font-bold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {adding ? "添加中..." : `添加 ${selectedIds.size || ""}`.trim()}
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="py-12 text-center text-[var(--muted)]">加载照片...</div>
      ) : error ? (
        <div className="py-12 text-center text-[var(--danger)]">{error}</div>
      ) : photos.length === 0 ? (
        <div className="py-12 text-center text-[var(--muted)]">全部照片中暂无照片</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {photos.map((photo) => {
            const selected = selectedIds.has(photo.id);
            return (
              <button
                key={photo.id}
                type="button"
                onClick={() => togglePhoto(photo.id)}
                className={`relative overflow-hidden rounded-xl border transition ${
                  selected
                    ? "border-[var(--accent)] ring-2 ring-[var(--accent)]"
                    : "border-[var(--border)] hover:border-white/30"
                }`}
              >
                <img
                  src={photo.thumbnailUrl}
                  alt={photo.originalName}
                  className="aspect-[4/3] w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="truncate text-xs text-white">{photo.originalName}</p>
                </div>
                {selected ? (
                  <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-black">
                    <Check aria-hidden="true" size={16} strokeWidth={3} />
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
