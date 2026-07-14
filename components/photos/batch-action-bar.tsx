"use client";

import React from "react";
import { Trash2, X } from "lucide-react";

type BatchActionBarProps = {
  selectedCount: number;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  deleting?: boolean;
};

export function BatchActionBar({
  selectedCount,
  onClearSelection,
  onDeleteSelected,
  deleting = false,
}: BatchActionBarProps) {
  if (selectedCount <= 0) {
    return null;
  }

  return (
    <div className="noir-glass-panel rounded-[2rem] border border-[var(--border-strong)] p-4 shadow-2xl shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">已选择 {selectedCount} 项</p>
          <p className="mt-1 text-xs text-[var(--muted)]">可以继续点选更多照片，或直接执行批量删除。</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onClearSelection}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-4 text-sm font-medium text-[var(--text)] transition hover:border-white/35 hover:bg-white/[0.08]"
          >
            <X aria-hidden="true" size={16} />
            取消选择
          </button>

          <button
            type="button"
            onClick={onDeleteSelected}
            disabled={deleting}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--danger)] px-4 text-sm font-bold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 aria-hidden="true" size={16} />
            {deleting ? "删除中..." : `删除选中 (${selectedCount})`}
          </button>
        </div>
      </div>
    </div>
  );
}
