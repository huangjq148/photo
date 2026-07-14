"use client";

import React from "react";
import { RotateCcw, UploadCloud } from "lucide-react";
import type { UploadQueueItem } from "@/lib/client/upload-queue";

type UploadQueueProps = {
  items: readonly UploadQueueItem[];
  onRetryAllFailed: () => void;
  onRemoveItem: (itemId: string) => void;
  onCancelItem: (itemId: string) => void;
  onRetryItem: (itemId: string) => void;
};

type UploadQueueSummary = {
  totalCount: number;
  queuedCount: number;
  uploadingCount: number;
  successCount: number;
  failedCount: number;
  cancelledCount: number;
  loadedBytes: number;
  totalBytes: number;
  totalProgressPercent: number;
  statusText: string;
  totalProgressText: string;
  progressLabel: string;
};

const statusLabels: Record<UploadQueueItem["status"], string> = {
  queued: "排队中",
  uploading: "上传中",
  success: "已完成",
  failed: "失败",
  cancelled: "已取消",
};

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatPercent(loadedBytes: number, totalBytes: number) {
  if (totalBytes <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((loadedBytes / totalBytes) * 100));
}

export function getUploadQueueSummary(items: readonly UploadQueueItem[]): UploadQueueSummary {
  let queuedCount = 0;
  let uploadingCount = 0;
  let successCount = 0;
  let failedCount = 0;
  let cancelledCount = 0;
  let loadedBytes = 0;
  let totalBytes = 0;

  for (const item of items) {
    totalBytes += item.size;

    switch (item.status) {
      case "queued":
        queuedCount += 1;
        break;
      case "uploading":
        uploadingCount += 1;
        loadedBytes += item.progress.loaded;
        break;
      case "success":
        successCount += 1;
        loadedBytes += item.size;
        break;
      case "failed":
        failedCount += 1;
        break;
      case "cancelled":
        cancelledCount += 1;
        break;
    }
  }

  const totalProgressPercent = formatPercent(loadedBytes, totalBytes);
  const totalCount = items.length;
  const statusText = `${totalCount} 个文件，${queuedCount} 个排队中，${uploadingCount} 个上传中，${failedCount} 个失败`;

  return {
    totalCount,
    queuedCount,
    uploadingCount,
    successCount,
    failedCount,
    cancelledCount,
    loadedBytes,
    totalBytes,
    totalProgressPercent,
    statusText,
    totalProgressText: `总进度 ${totalProgressPercent}%`,
    progressLabel: `总进度 ${totalProgressPercent}%`,
  };
}

export const summarizeUploadQueue = getUploadQueueSummary;

export function shouldConfirmUploadDialogClose(items: readonly UploadQueueItem[]) {
  return items.some((item) => item.status === "queued" || item.status === "uploading");
}

function getItemProgressText(item: UploadQueueItem) {
  if (item.status === "uploading") {
    const percent = formatPercent(item.progress.loaded, item.size);
    return `${percent}% · ${formatBytes(item.progress.loaded)} / ${formatBytes(item.size)}`;
  }

  if (item.status === "success") {
    return `已完成 · ${formatBytes(item.size)}`;
  }

  if (item.status === "failed" && item.error?.error) {
    return item.error.error;
  }

  return `${formatBytes(item.size)} · ${statusLabels[item.status]}`;
}

export function UploadQueue({
  items,
  onRetryAllFailed,
  onRemoveItem,
  onCancelItem,
  onRetryItem,
}: UploadQueueProps) {
  const summary = getUploadQueueSummary(items);
  const failedItems = items.filter((item) => item.status === "failed");

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-base font-semibold text-[var(--text)]">
            <UploadCloud aria-hidden="true" size={18} />
            上传队列
          </div>
          <p className="text-sm text-[var(--muted)]">{summary.statusText}</p>
          <p className="text-sm text-[var(--muted-strong)]">{summary.totalProgressText}</p>
        </div>

        {failedItems.length > 0 ? (
          <button
            type="button"
            onClick={onRetryAllFailed}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--border-strong)] px-4 text-sm font-bold text-[var(--text)] transition hover:border-white/35 hover:bg-white/[0.08]"
          >
            <RotateCcw aria-hidden="true" size={16} />
            重试全部失败
          </button>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="h-2 overflow-hidden rounded-full bg-black/60">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all"
            style={{ width: `${summary.totalProgressPercent}%` }}
          />
        </div>
        <p className="text-xs text-[var(--muted)]">
          {summary.loadedBytes > 0 ? `${formatBytes(summary.loadedBytes)} / ${formatBytes(summary.totalBytes)}` : "等待上传"}
        </p>
      </div>

      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-[var(--border)] bg-black/40 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-[var(--text)]">{item.name}</p>
                    <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--muted-strong)]">
                      {statusLabels[item.status]}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)]">{getItemProgressText(item)}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {item.status === "uploading" ? (
                    <button
                      type="button"
                      onClick={() => onCancelItem(item.id)}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] px-3 text-xs font-bold text-[var(--text)]"
                    >
                      取消
                    </button>
                  ) : null}

                  {item.status === "failed" || item.status === "cancelled" ? (
                    <button
                      type="button"
                      onClick={() => onRetryItem(item.id)}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] px-3 text-xs font-bold text-[var(--text)]"
                    >
                      重试
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--danger)] px-3 text-xs font-bold text-black"
                  >
                    移除
                  </button>
                </div>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/70">
                <div
                  className="h-full rounded-full bg-[var(--film)] transition-all"
                  style={{
                    width:
                      item.status === "uploading"
                        ? `${formatPercent(item.progress.loaded, item.size)}%`
                        : item.status === "success"
                          ? "100%"
                          : "0%",
                  }}
                />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-black/30 px-4 py-6 text-sm text-[var(--muted)]">
          还没有加入任何文件。
        </div>
      )}
    </section>
  );
}
