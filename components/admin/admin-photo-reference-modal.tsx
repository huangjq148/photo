"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import type { AdminPhotoReferenceItem } from "@/lib/admin/photo-references";

type Props = {
  open: boolean;
  photoName: string;
  uploaderEmail: string;
  uploadedAt: string;
  referenceCount: number;
  references: AdminPhotoReferenceItem[];
  onClose: () => void;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminPhotoReferenceModal({
  open,
  photoName,
  uploaderEmail,
  uploadedAt,
  referenceCount,
  references,
  onClose,
}: Props) {
  const [selectedReferenceId, setSelectedReferenceId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedReferenceId(references[0]?.id ?? null);
  }, [open, references]);

  const selectedReference = useMemo(
    () => references.find((reference) => reference.id === selectedReferenceId) ?? references[0] ?? null,
    [references, selectedReferenceId]
  );

  return (
    <Modal
      open={open}
      title={`${photoName} 的引用`}
      description={`共 ${referenceCount} 条引用`}
      size="xl"
      onClose={onClose}
    >
      <div className="space-y-5">
        <section className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/40">照片</p>
            <p className="mt-2 text-sm font-semibold text-white">{photoName}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/40">上传者</p>
            <p className="mt-2 text-sm text-white/75">{uploaderEmail}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/40">上传时间</p>
            <p className="mt-2 text-sm text-white/75">{formatDate(uploadedAt)}</p>
          </div>
        </section>

        {references.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-white/55">
            暂无引用
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="mb-3 flex items-center justify-between px-2 pt-1 text-xs uppercase tracking-[0.28em] text-white/40">
                <span>引用列表</span>
                <span>{references.length}</span>
              </div>
              <div className="max-h-[52dvh] space-y-2 overflow-y-auto pr-1">
                {references.map((reference) => {
                  const active = reference.id === selectedReference?.id;

                  return (
                    <button
                      key={reference.id}
                      type="button"
                      onClick={() => setSelectedReferenceId(reference.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        active
                          ? "border-white/25 bg-white text-black"
                          : "border-white/10 bg-black/20 text-white/75 hover:bg-white/6"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={`text-xs uppercase tracking-[0.24em] ${active ? "text-black/55" : "text-white/40"}`}>
                            {reference.kindLabel}
                          </p>
                          <p className={`mt-2 truncate text-sm font-semibold ${active ? "text-black" : "text-white"}`}>
                            {reference.title}
                          </p>
                          <p className={`mt-1 text-xs ${active ? "text-black/60" : "text-white/45"}`}>
                            {reference.subtitle}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              {selectedReference ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-white/40">
                      {selectedReference.kindLabel}
                    </p>
                    <h3 className="mt-2 text-xl font-black text-white">{selectedReference.title}</h3>
                    <p className="mt-2 text-sm text-white/55">{selectedReference.subtitle}</p>
                  </div>

                  <dl className="grid gap-3 sm:grid-cols-2">
                    {selectedReference.detailItems.map((item) => (
                      <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <dt className="text-xs uppercase tracking-[0.24em] text-white/40">{item.label}</dt>
                        <dd className="mt-2 break-words text-sm leading-6 text-white/80">{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : (
                <div className="flex min-h-[260px] items-center justify-center text-sm text-white/55">
                  请选择一条引用查看详情
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </Modal>
  );
}
