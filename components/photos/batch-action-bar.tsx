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
    <div className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-5xl md:sticky md:inset-x-auto md:bottom-6">
      <div className="noir-glass-panel max-h-[min(56dvh,28rem)] overflow-y-auto overscroll-contain rounded-3xl border border-[var(--border-strong)] p-3 shadow-2xl shadow-black/30 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">已选择 {selectedCount} 项</p>
            <p className="mt-0.5 hidden text-xs text-[var(--muted)] sm:block">可批量添加、收藏、删除，或取消当前选择。</p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={onAddSelected}
              disabled={isBusy}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 text-sm font-medium text-[var(--text)] transition hover:border-white/35 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
            >
              <FolderPlus aria-hidden="true" size={16} />
              {busyAction === "add" ? "添加中..." : "添加到相册"}
            </button>

            <button
              type="button"
              onClick={onToggleFavoriteSelected}
              disabled={isBusy}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 text-sm font-medium text-[var(--text)] transition hover:border-white/35 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
            >
              <Heart aria-hidden="true" size={16} />
              {busyAction === "favorite" ? "收藏中..." : favoriteLabel}
            </button>

            <button
              type="button"
              onClick={onDeleteSelected}
              disabled={isBusy}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--danger)] px-3 text-sm font-bold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
            >
              <Trash2 aria-hidden="true" size={16} />
              {busyAction === "delete" ? "删除中..." : `删除选中 (${selectedCount})`}
            </button>

            <button
              type="button"
              onClick={onClearSelection}
              disabled={isBusy}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 text-sm font-medium text-[var(--text)] transition hover:border-white/35 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
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
