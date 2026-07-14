"use client";

import React from "react";
import { FolderPlus, Heart, Trash2, X } from "lucide-react";

type BatchActionBarProps = {
  selectedCount: number;
  favoriteLabel: string;
  onAddSelected: () => void;
  onToggleFavoriteSelected: () => void;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
  busyAction?: "add" | "favorite" | "delete" | null;
};

export function BatchActionBar({
  selectedCount,
  favoriteLabel,
  onAddSelected,
  onToggleFavoriteSelected,
  onDeleteSelected,
  onClearSelection,
  busyAction = null,
}: BatchActionBarProps) {
  if (selectedCount <= 0) {
    return null;
  }

  const isBusy = busyAction !== null;

  return (
    <div className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-5xl md:sticky md:bottom-6">
      <div className="noir-glass-panel rounded-[2rem] border border-[var(--border-strong)] p-4 shadow-2xl shadow-black/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">已选择 {selectedCount} 项</p>
            <p className="mt-1 text-xs text-[var(--muted)]">可批量添加、收藏、删除，或取消当前选择。</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onAddSelected}
              disabled={isBusy}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-4 text-sm font-medium text-[var(--text)] transition hover:border-white/35 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FolderPlus aria-hidden="true" size={16} />
              {busyAction === "add" ? "添加中..." : "添加到相册"}
            </button>

            <button
              type="button"
              onClick={onToggleFavoriteSelected}
              disabled={isBusy}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-4 text-sm font-medium text-[var(--text)] transition hover:border-white/35 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Heart aria-hidden="true" size={16} />
              {busyAction === "favorite" ? "收藏中..." : favoriteLabel}
            </button>

            <button
              type="button"
              onClick={onDeleteSelected}
              disabled={isBusy}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--danger)] px-4 text-sm font-bold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 aria-hidden="true" size={16} />
              {busyAction === "delete" ? "删除中..." : `删除选中 (${selectedCount})`}
            </button>

            <button
              type="button"
              onClick={onClearSelection}
              disabled={isBusy}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-4 text-sm font-medium text-[var(--text)] transition hover:border-white/35 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X aria-hidden="true" size={16} />
              取消选择
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
