"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AdminImagePreview } from "@/components/admin/admin-image-preview";
import { AdminFileReferenceModal } from "@/components/admin/admin-file-reference-modal";
import { useMessage } from "@/components/ui/message";
import { AdminDeleteConfirmation } from "@/components/admin/admin-delete-confirmation";
import type { AdminPhotoReferenceItem } from "@/lib/admin/photo-references";

type FileItem = {
  fileName: string;
  relativePath: string;
  fileType: string;
  previewUrl: string | null;
  thumbnailUrl: string | null;
  size: number;
  lastModifiedAt: string;
  referenceCount: number;
  fileCount: number;
  references: AdminPhotoReferenceItem[];
  canDelete: boolean;
};

type Props = {
  items: FileItem[];
  page: number;
  pageSize: number;
  total: number;
};

const sortOptions = [
  { value: "relativePath", label: "相对路径" },
  { value: "fileName", label: "文件名" },
  { value: "size", label: "文件大小" },
  { value: "referenceCount", label: "引用次数" },
  { value: "lastModifiedAt", label: "最后修改时间" },
] as const;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function buildQuery(params: URLSearchParams, patch: Record<string, string | number | undefined>) {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === "") {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
  }
  return next.toString();
}

function encodeDeletePath(relativePath: string) {
  return relativePath.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}

export function AdminFileTable({ items, page, pageSize, total }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = useMessage();
  const [pendingDelete, setPendingDelete] = useState<FileItem | null>(null);
  const [preview, setPreview] = useState<FileItem | null>(null);
  const [references, setReferences] = useState<FileItem | null>(null);
  const [busy, setBusy] = useState(false);

  const query = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const currentSortBy = searchParams.get("sortBy") ?? "relativePath";
  const currentSortOrder = searchParams.get("sortOrder") ?? "asc";

  async function handleDelete() {
    if (!pendingDelete) return;
    setBusy(true);

    try {
      const response = await fetch(`/api/admin/files/${encodeDeletePath(pendingDelete.relativePath)}`, {
        method: "DELETE",
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "删除失败");
      }

      message.success("文件已删除");
      setPendingDelete(null);
      router.refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">Files</p>
            <h2 className="mt-2 text-2xl font-black">文件管理</h2>
            <p className="mt-2 text-sm text-white/55">递归扫描 data 目录，识别未被引用的物理文件。</p>
          </div>

          <form className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto] lg:items-end" method="get">
            <input
              name="keyword"
              defaultValue={searchParams.get("keyword") ?? ""}
              placeholder="搜索文件名或路径"
              className="h-11 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm outline-none placeholder:text-white/35"
            />
            <select name="sortBy" defaultValue={currentSortBy} className="h-11 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm">
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select name="sortOrder" defaultValue={currentSortOrder} className="h-11 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm">
              <option value="asc">升序</option>
              <option value="desc">降序</option>
            </select>
            <select name="pageSize" defaultValue={String(pageSize)} className="h-11 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm">
              <option value="20">20 / 页</option>
              <option value="50">50 / 页</option>
              <option value="100">100 / 页</option>
            </select>
            <button className="h-11 rounded-2xl bg-white px-5 text-sm font-bold text-black">筛选</button>
          </form>
        </div>

        <p className="mt-4 text-sm text-white/55">
          共 {total} 条，当前第 {page} / {totalPages} 页。
        </p>
      </section>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10">
            <thead className="text-left text-xs uppercase tracking-[0.25em] text-white/40">
              <tr>
                <th className="sticky top-0 z-20 border-b border-white/10 bg-[#111215]/95 px-4 py-4 backdrop-blur">
                  文件名
                </th>
                <th className="sticky top-0 z-20 border-b border-white/10 bg-[#111215]/95 px-4 py-4 backdrop-blur">
                  相对路径
                </th>
                <th className="sticky top-0 z-20 border-b border-white/10 bg-[#111215]/95 px-4 py-4 backdrop-blur">
                  文件类型
                </th>
                <th className="sticky top-0 z-20 border-b border-white/10 bg-[#111215]/95 px-4 py-4 backdrop-blur">
                  文件大小
                </th>
                <th className="sticky top-0 z-20 border-b border-white/10 bg-[#111215]/95 px-4 py-4 backdrop-blur">
                  最后修改时间
                </th>
                <th className="sticky top-0 z-20 border-b border-white/10 bg-[#111215]/95 px-4 py-4 backdrop-blur">
                  引用次数
                </th>
                <th className="sticky top-0 z-20 border-b border-white/10 bg-[#111215]/95 px-4 py-4 backdrop-blur">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {items.length === 0 ? (
                <tr>
                  <td className="px-4 py-12 text-center text-sm text-white/50" colSpan={7}>
                    暂无数据
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.relativePath} className="align-top">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-4">
                        {item.thumbnailUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreview(item)}
                            className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/30"
                            aria-label={`预览 ${item.fileName}`}
                          >
                            <img
                              src={item.thumbnailUrl}
                              alt={item.fileName}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            />
                            <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                          </button>
                        ) : (
                          <div className="h-16 w-16 shrink-0 rounded-2xl border border-dashed border-white/10 bg-black/20" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-white">{item.fileName}</p>
                          <p className="mt-1 text-xs text-white/45">
                            {item.fileCount > 1 ? `已聚合 ${item.fileCount} 个物理文件` : "单文件"}
                            {" · "}
                            点击缩略图放大
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-white/75">{item.relativePath}</td>
                    <td className="px-4 py-4 text-sm text-white/75">{item.fileType}</td>
                    <td className="px-4 py-4 text-sm text-white/75">{formatBytes(item.size)}</td>
                    <td className="px-4 py-4 text-sm text-white/75">{formatDate(item.lastModifiedAt)}</td>
                    <td className="px-4 py-4 text-sm">
                      {item.referenceCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => setReferences(item)}
                          className="inline-flex items-center gap-1 font-semibold text-sky-300 underline decoration-sky-300/50 underline-offset-4 transition hover:text-sky-200"
                        >
                          {item.referenceCount}
                          <span className="text-xs font-medium text-sky-300/70">查看</span>
                        </button>
                      ) : (
                        <span className="text-white/75">{item.referenceCount}</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        disabled={!item.canDelete}
                        onClick={() => setPendingDelete(item)}
                        className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        删除
                      </button>
                      {!item.canDelete ? (
                        <p className="mt-2 text-xs text-white/40">已有引用，无法删除</p>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <nav className="flex flex-wrap items-center justify-between gap-3 text-sm text-white/70">
        <span>
          第 {page} 页，共 {totalPages} 页
        </span>
        <div className="flex items-center gap-2">
          <Link
            aria-disabled={page <= 1}
            className={`rounded-full border border-white/10 px-4 py-2 transition ${
              page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-white/8"
            }`}
            href={{ pathname, query: Object.fromEntries(new URLSearchParams(buildQuery(query, { page: Math.max(1, page - 1) }))) }}
          >
            上一页
          </Link>
          <Link
            aria-disabled={page >= totalPages}
            className={`rounded-full border border-white/10 px-4 py-2 transition ${
              page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-white/8"
            }`}
            href={{ pathname, query: Object.fromEntries(new URLSearchParams(buildQuery(query, { page: Math.min(totalPages, page + 1) }))) }}
          >
            下一页
          </Link>
        </div>
      </nav>

      {pendingDelete ? (
        <AdminDeleteConfirmation
          open={Boolean(pendingDelete)}
          busy={busy}
          title="永久删除文件"
          description={`${pendingDelete.fileName} · ${pendingDelete.relativePath}`}
          onClose={() => setPendingDelete(null)}
          onConfirm={handleDelete}
        />
      ) : null}

      {preview ? (
        <AdminImagePreview
          open={Boolean(preview)}
          title={preview.fileName}
          src={preview.previewUrl ?? preview.thumbnailUrl ?? ""}
          onClose={() => setPreview(null)}
        />
      ) : null}

      {references ? (
        <AdminFileReferenceModal
          open={Boolean(references)}
          fileName={references.fileName}
          relativePath={references.relativePath}
          fileType={references.fileType}
          fileCount={references.fileCount}
          lastModifiedAt={references.lastModifiedAt}
          referenceCount={references.referenceCount}
          references={references.references}
          onClose={() => setReferences(null)}
        />
      ) : null}
    </div>
  );
}
