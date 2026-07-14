"use client";

import React from "react";
import { SearchX, FilterX, RefreshCcw, FolderOpen } from "lucide-react";

type GalleryEmptyStateReason = "empty" | "search" | "filter" | "error";

type GalleryEmptyStateProps = {
  reason: GalleryEmptyStateReason;
  title?: string;
  description?: string;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
};

const iconByReason: Record<GalleryEmptyStateReason, React.ReactNode> = {
  empty: <FolderOpen size={20} aria-hidden="true" />,
  search: <SearchX size={20} aria-hidden="true" />,
  filter: <FilterX size={20} aria-hidden="true" />,
  error: <RefreshCcw size={20} aria-hidden="true" />,
};

export function GalleryEmptyState({
  reason,
  title,
  description,
  onPrimaryAction,
  primaryActionLabel,
  secondaryActionLabel,
  onSecondaryAction,
}: GalleryEmptyStateProps) {
  const defaultTitle =
    reason === "empty" ? "这个相册还没有照片" : reason === "search" ? "没有找到匹配的照片" : reason === "filter" ? "当前筛选条件没有结果" : "加载失败";
  const defaultDescription =
    description ??
    (reason === "empty"
      ? "上传新照片，或者从全部照片中添加"
      : reason === "search"
        ? "尝试其他关键词"
        : reason === "filter"
          ? "调整或清空筛选条件"
          : "请重试");

  return (
    <section className="noir-glass-panel rounded-[2rem] px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full noir-glass-chip text-[var(--text)]">
        {iconByReason[reason]}
      </div>
      <h3 className="mt-4 text-lg font-bold text-[var(--text)]">{title ?? defaultTitle}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">{defaultDescription}</p>
      {(onPrimaryAction || onSecondaryAction) && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {onPrimaryAction && primaryActionLabel ? (
            <button
              type="button"
              onClick={onPrimaryAction}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 text-sm font-bold text-black transition hover:bg-white"
            >
              {primaryActionLabel}
            </button>
          ) : null}
          {onSecondaryAction && secondaryActionLabel ? (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border-strong)] px-5 text-sm font-bold text-[var(--text)] transition hover:border-white/35 hover:bg-white/[0.08]"
            >
              {secondaryActionLabel}
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
