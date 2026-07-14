"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

type AsyncStateProps = {
  loading: boolean;
  refreshing?: boolean;
  hasContent: boolean;
  error?: string | null;
  loadMoreError?: string | null;
  skeleton: React.ReactNode;
  empty?: React.ReactNode;
  errorFallback?: React.ReactNode;
  children: React.ReactNode;
  onRetry?: () => void;
  onRetryLoadMore?: () => void;
};

function InlineNotice({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
      <div className="flex items-start gap-3">
        <Skeleton as="span" className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--text)]">{title}</p>
          {description ? <p className="mt-1 text-sm text-[var(--muted)]">{description}</p> : null}
        </div>
        {onAction && actionLabel ? (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-strong)] px-3 text-xs font-bold text-[var(--text)] transition hover:border-white/35 hover:bg-white/[0.08]"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function AsyncState({
  loading,
  refreshing = false,
  hasContent,
  error,
  loadMoreError,
  skeleton,
  empty,
  errorFallback,
  children,
  onRetry,
  onRetryLoadMore,
}: AsyncStateProps): React.JSX.Element | null {
  if (loading && !hasContent) {
    return <>{skeleton}</>;
  }

  if (error && !hasContent) {
    return errorFallback ? <>{errorFallback}</> : (
      <InlineNotice
        title="加载失败"
        description={error}
        actionLabel={onRetry ? "重新加载" : undefined}
        onAction={onRetry}
      />
    );
  }

  if (!hasContent) {
    return empty ? <>{empty}</> : null;
  }

  return (
    <div className="space-y-4">
      {refreshing ? (
        <InlineNotice
          title="正在刷新"
          description="内容会保留，刷新完成后会自动更新。"
        />
      ) : null}
      {error ? (
        <InlineNotice
          title="刷新失败"
          description={error}
          actionLabel={onRetry ? "重试" : undefined}
          onAction={onRetry}
        />
      ) : null}
      {children}
      {loadMoreError ? (
        <InlineNotice
          title="加载更多失败"
          description={loadMoreError}
          actionLabel={onRetryLoadMore ? "重试加载更多" : undefined}
          onAction={onRetryLoadMore}
        />
      ) : null}
    </div>
  );
}
