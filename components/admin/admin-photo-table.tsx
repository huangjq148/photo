"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AdminImagePreview } from "@/components/admin/admin-image-preview";
import { AdminPhotoReferenceModal } from "@/components/admin/admin-photo-reference-modal";
import type { AdminPhotoReferenceItem } from "@/lib/admin/photo-references";

type PhotoItem = {
  id: string;
  photoName: string;
  thumbnailUrl: string;
  previewUrl: string;
  originalUrl: string;
  uploaderEmail: string;
  uploadedAt: string;
  referenceCount: number;
  references: AdminPhotoReferenceItem[];
};

type Props = {
  items: PhotoItem[];
  page: number;
  pageSize: number;
  total: number;
};

const sortOptions = [
  { value: "uploadedAt", label: "上传时间" },
  { value: "photoName", label: "照片名" },
  { value: "referenceCount", label: "引用次数" },
] as const;

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

export function AdminPhotoTable({ items, page, pageSize, total }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [preview, setPreview] = useState<PhotoItem | null>(null);
  const [references, setReferences] = useState<PhotoItem | null>(null);

  const query = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const currentSortBy = searchParams.get("sortBy") ?? "uploadedAt";
  const currentSortOrder = searchParams.get("sortOrder") ?? "desc";

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">Photos</p>
            <h2 className="mt-2 text-2xl font-black">图片管理</h2>
            <p className="mt-2 text-sm text-white/55">查看全部图片、所属人员和业务引用次数。</p>
          </div>

          <form className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto] lg:items-end" method="get">
            <input
              name="keyword"
              defaultValue={searchParams.get("keyword") ?? ""}
              placeholder="搜索照片名或邮箱"
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
              <option value="desc">降序</option>
              <option value="asc">升序</option>
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
                  照片
                </th>
                <th className="sticky top-0 z-20 border-b border-white/10 bg-[#111215]/95 px-4 py-4 backdrop-blur">
                  所属人员邮箱
                </th>
                <th className="sticky top-0 z-20 border-b border-white/10 bg-[#111215]/95 px-4 py-4 backdrop-blur">
                  引用次数
                </th>
                <th className="sticky top-0 z-20 border-b border-white/10 bg-[#111215]/95 px-4 py-4 backdrop-blur">
                  上传时间
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {items.length === 0 ? (
                <tr>
                  <td className="px-4 py-12 text-center text-sm text-white/50" colSpan={4}>
                    暂无数据
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => setPreview(item)}
                        className="flex items-center gap-4 text-left"
                      >
                        <img
                          src={item.thumbnailUrl}
                          alt={item.photoName}
                          className="h-16 w-16 shrink-0 rounded-2xl border border-white/10 object-cover"
                        />
                        <div>
                          <p className="font-semibold text-white">{item.photoName}</p>
                          <p className="mt-1 text-xs text-white/45">点击预览大图</p>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-4 text-sm text-white/75">{item.uploaderEmail}</td>
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
                    <td className="px-4 py-4 text-sm text-white/75">{formatDate(item.uploadedAt)}</td>
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

      {preview ? (
        <AdminImagePreview
          open={Boolean(preview)}
          title={preview.photoName}
          src={preview.previewUrl || preview.originalUrl}
          onClose={() => setPreview(null)}
        />
      ) : null}

      {references ? (
        <AdminPhotoReferenceModal
          open={Boolean(references)}
          photoName={references.photoName}
          uploaderEmail={references.uploaderEmail}
          uploadedAt={references.uploadedAt}
          referenceCount={references.referenceCount}
          references={references.references}
          onClose={() => setReferences(null)}
        />
      ) : null}
    </div>
  );
}
