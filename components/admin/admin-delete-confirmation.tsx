"use client";

import { Modal } from "@/components/ui/modal";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function AdminDeleteConfirmation({
  open,
  title,
  description,
  confirmLabel = "永久删除",
  busy = false,
  onClose,
  onConfirm,
}: Props) {
  return (
    <Modal
      open={open}
      title={title}
      description={description}
      size="md"
      onClose={busy ? () => undefined : onClose}
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-11 rounded-xl border border-white/10 px-4 text-sm font-medium text-white/75 transition hover:bg-white/8 disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="h-11 rounded-xl bg-[#ff6f61] px-4 text-sm font-bold text-black transition hover:bg-[#ff8a7f] disabled:opacity-50"
          >
            {busy ? "删除中…" : confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-sm leading-6 text-white/70">
        删除后无法恢复，确定永久删除该文件吗？
      </p>
    </Modal>
  );
}
